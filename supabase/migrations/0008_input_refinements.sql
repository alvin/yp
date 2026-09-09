-- =============================================================================
-- 0008_input_refinements.sql
-- Front-desk input refinements from the client's first round of live use.
--
-- Everything here stays in the database so the rules hold for app writes and
-- for rows edited directly in Supabase, exactly like 0005–0007:
--
--   * search terms tolerate the placeholder punctuation and Access-style '*'
--     wildcards staff actually type ('-illington' for '…illington'),
--   * name search reaches the other names recorded on a stay, so a booking
--     under two partners is found from either name,
--   * all-fields search accepts several keywords and requires all of them,
--   * changing a reservation's stay dates carries its rooms with it, the way
--     it already carried its guests,
--   * removing a charge or payment entered in error fails loudly when the line
--     is already gone instead of silently doing nothing.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Search term normalization
-- -----------------------------------------------------------------------------

create or replace function ypl.search_pattern(p_term text)
returns text
language sql
immutable
as $$
  -- One typed token as a LIKE pattern. Front-desk staff type placeholder
  -- punctuation for the part of a name they cannot remember ('-illington' to
  -- mean '…illington') and Access-style '*' wildcards; both are honoured.
  -- LIKE metacharacters typed literally are escaped so a stray '%' cannot
  -- match the whole table.
  select case
           when t = '' then null
           else '%' ||
                replace(replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_'), '*', '%') ||
                '%'
         end
    from (select trim(both ' -–—.,;:_*%' from coalesce(p_term, '')) as t) s;
$$;

comment on function ypl.search_pattern is
  'Normalizes one typed search token into a LIKE pattern: placeholder punctuation at either end is dropped, ''*'' becomes a wildcard, literal LIKE metacharacters are escaped.';

create or replace function ypl.search_patterns(p_query text)
returns text[]
language sql
immutable
as $$
  -- A query split into keywords. Callers require every pattern to match, so
  -- 'Karen Abbotsford' finds only records carrying both.
  select coalesce(array_agg(pat order by ord), '{}'::text[])
    from (
      select ypl.search_pattern(tok) as pat, ord
        from regexp_split_to_table(coalesce(p_query, ''), '\s+') with ordinality as t(tok, ord)
    ) s
   where pat is not null;
$$;

comment on function ypl.search_patterns is
  'Splits a search box entry into normalized LIKE patterns, one per keyword. An empty array means "no usable query".';

-- -----------------------------------------------------------------------------
-- Name search: partial matching, the other names on a stay, a workable limit
-- -----------------------------------------------------------------------------

create or replace function ypl.guest_co_names(p_guestid integer)
returns text
language sql
stable
as $$
  -- The other names recorded on this guest's stays — the partner or second
  -- surname a booking is also held under.
  select string_agg(n, '; ' order by n)
    from (
      select distinct ypl.guest_display_name(g2.guestlastname, g2.guestfirstname, g2.guestcompany) as n
        from ypl.reservation_guests rg1
        join ypl.reservation_guests rg2
          on rg2.reservationid = rg1.reservationid
         and not rg2.rgarchive
        join ypl.guests g2 on g2.guestid = rg2.guestid
       where rg1.guestid = p_guestid
         and not rg1.rgarchive
         and rg2.guestid <> p_guestid
    ) s;
$$;

comment on function ypl.guest_co_names is
  'Distinct other guest names sharing any active stay with this guest, for the second-name context shown beside a name search match.';

drop function if exists ypl.search_guests_by_name(text);
drop function if exists ypl.search_guests_by_name(text, integer);

create function ypl.search_guests_by_name(p_query text, p_limit integer default 200)
returns table (
  guestid integer,
  guest_name text,
  guestlastname varchar,
  guestfirstname varchar,
  guestcity varchar,
  guestregion varchar,
  guestprimaryphone varchar,
  guestemailaddress text,
  match_kind text,
  other_names text
)
language sql
stable
as $$
  with pats as (select ypl.search_patterns(p_query) as ps),
  direct as (
    -- Every keyword has to appear somewhere in the name, so extra characters
    -- narrow the list instead of widening it.
    select g.guestid,
           similarity(coalesce(g.guestlastname, ''), coalesce(p_query, '')) as score
      from ypl.v_guest_summary g, pats
     where cardinality(pats.ps) > 0
       and not g.guestvoid
       and not g.guestarchive
       and (
         select bool_and(
                  concat_ws(' ', g.guestlastname, g.guestfirstname, g.guest_name, g.guestcompany)
                  ilike pat escape '\')
           from unnest(pats.ps) as pat
       )
     order by score desc, g.guestlastname, g.guestfirstname, g.guestid
     limit greatest(coalesce(p_limit, 200), 1)
  ),
  shared as (
    -- A stay booked under two names is found from either one: the co-names of
    -- a direct match come back too.
    select distinct rg2.guestid
      from ypl.reservation_guests rg1
      join ypl.reservation_guests rg2
        on rg2.reservationid = rg1.reservationid
       and not rg2.rgarchive
     where rg1.guestid in (select d.guestid from direct d)
       and not rg1.rgarchive
       and rg2.guestid not in (select d.guestid from direct d)
  )
  select g.guestid,
         g.guest_name,
         g.guestlastname,
         g.guestfirstname,
         g.guestcity,
         g.guestregion,
         g.guestprimaryphone,
         g.guestemailaddress,
         case when d.guestid is not null then 'name' else 'shared reservation' end,
         ypl.guest_co_names(g.guestid)
    from ypl.v_guest_summary g
    left join direct d on d.guestid = g.guestid
    left join shared sh on sh.guestid = g.guestid
   where (d.guestid is not null or sh.guestid is not null)
     and not g.guestvoid
     and not g.guestarchive
   order by (d.guestid is null),
            d.score desc nulls last,
            g.guestlastname,
            g.guestfirstname,
            g.guestid
   limit greatest(coalesce(p_limit, 200), 1) * 2;
$$;

comment on function ypl.search_guests_by_name is
  'Partial-string guest name search over last/first/display name and company. Every keyword must match; placeholder punctuation and ''*'' wildcards are honoured. Guests sharing a stay with a match come back after the direct matches (match_kind), and other_names carries the second name a booking is held under.';

-- -----------------------------------------------------------------------------
-- All-fields search: several keywords, one row per record
-- -----------------------------------------------------------------------------

drop function if exists ypl.search_all_fields(text);

create function ypl.search_all_fields(p_query text)
returns table (
  guestid integer,
  reservationid integer,
  resnumber integer,
  guest_name text,
  matched_on text,
  detail text
)
language sql
stable
as $$
  with pats as (select ypl.search_patterns(p_query) as ps),
  terms as (
    select pat, ord from pats, unnest(pats.ps) with ordinality as u(pat, ord)
  ),
  term_count as (select count(*) as n from terms),

  -- Guests: one row per searchable office-entered field.
  guest_fields as (
    select g.guestid, g.guest_name, f.ord, f.label, f.value
      from ypl.v_guest_summary g
      cross join lateral (values
        (1, 'name',            nullif(g.guest_name, '')),
        (2, 'company',         nullif(g.guestcompany, '')::text),
        (3, 'primary phone',   nullif(g.guestprimaryphone, '')::text),
        (4, 'secondary phone', nullif(g.guestsecondaryphone, '')::text),
        (5, 'address',         nullif(concat_ws(', ', g.guestaddress, g.guestcity,
                                                g.guestregion, g.guestcountry, g.guestpczip), '')),
        (6, 'email',           nullif(g.guestemailaddress, '')::text)
      ) f(ord, label, value)
     where not g.guestvoid
       and not g.guestarchive
       and f.value is not null
  ),
  guest_field_hits as (
    select gf.guestid, gf.guest_name, gf.ord, gf.label, gf.value, t.ord as term_ord
      from guest_fields gf
      join terms t on gf.value ilike t.pat escape '\'
  ),
  guest_hits as (
    -- Multi-keyword search is an AND: the record has to carry every keyword,
    -- though each one may land in a different field.
    select h.guestid
      from guest_field_hits h
      cross join term_count tc
     group by h.guestid, tc.n
    having count(distinct h.term_ord) = tc.n
  ),
  guest_result as (
    select gf.guestid,
           null::integer as reservationid,
           null::integer as resnumber,
           min(gf.guest_name) as guest_name,
           string_agg(gf.label, ', ' order by gf.ord) as matched_on,
           string_agg(gf.value, ' · ' order by gf.ord) as detail
      from (select distinct guestid, guest_name, ord, label, value from guest_field_hits) gf
      join guest_hits gh on gh.guestid = gf.guestid
     group by gf.guestid
  ),

  -- Reservations: the details the office files a booking under.
  res_fields as (
    select s.reservationid, s.resnumber, s.primary_guestid, s.guest_name, f.ord, f.label, f.value
      from ypl.v_reservation_summary s
      cross join lateral (values
        (1, 'reservation number', s.resnumber::text),
        (2, 'group',              nullif(s.resgroupname, '')::text)
      ) f(ord, label, value)
     where not s.resarchive
       and f.value is not null
  ),
  res_field_hits as (
    select rf.reservationid, rf.resnumber, rf.primary_guestid, rf.guest_name,
           rf.ord, rf.label, rf.value, t.ord as term_ord
      from res_fields rf
      join terms t on rf.value ilike t.pat escape '\'
  ),
  res_hits as (
    select h.reservationid
      from res_field_hits h
      cross join term_count tc
     group by h.reservationid, tc.n
    having count(distinct h.term_ord) = tc.n
  ),
  res_result as (
    select min(rf.primary_guestid) as guestid,
           rf.reservationid,
           min(rf.resnumber) as resnumber,
           min(rf.guest_name) as guest_name,
           string_agg(rf.label, ', ' order by rf.ord) as matched_on,
           string_agg(rf.value, ' · ' order by rf.ord) as detail
      from (select distinct reservationid, resnumber, primary_guestid, guest_name, ord, label, value
              from res_field_hits) rf
      join res_hits rh on rh.reservationid = rf.reservationid
     group by rf.reservationid
  )

  select r.guestid, r.reservationid, r.resnumber, r.guest_name, r.matched_on, r.detail
    from (
      select * from res_result
      union all
      select * from guest_result
    ) r
   order by (r.resnumber is null), r.guest_name, r.resnumber;
$$;

comment on function ypl.search_all_fields is
  'Broad search across the office-entered details of guests (name, company, phones, address, email) and reservations (number, group). Several keywords may be entered; a record is returned only when it carries them all, and matched_on/detail list the fields that matched.';

-- -----------------------------------------------------------------------------
-- Stay dates: rooms follow the reservation, the way guests already do
-- -----------------------------------------------------------------------------

-- Both endpoints move in one statement so a stay that shifts wholesale never
-- passes through a state where check-out precedes check-in.
create or replace function ypl.reservations_sync_guest_dates()
returns trigger
language plpgsql
as $$
begin
  update ypl.reservation_guests rg
     set checkindate = case
           when rg.checkindate::date = old.resarrivaldate::date then new.resarrivaldate
           else rg.checkindate
         end,
         checkoutdate = case
           when rg.checkoutdate::date = old.resdeparturedate::date then new.resdeparturedate
           else rg.checkoutdate
         end
   where rg.reservationid = new.reservationid
     and not rg.rgarchive
     and (rg.checkindate::date = old.resarrivaldate::date
          or rg.checkoutdate::date = old.resdeparturedate::date);
  return null;
end;
$$;

-- Room assignments that tracked the old stay dates move with them, so a stay
-- that is extended or shortened stays consistent for occupancy, housekeeping,
-- in-house, and kitchen reporting. Mid-stay move windows keep their own dates.
create or replace function ypl.reservations_sync_room_dates()
returns trigger
language plpgsql
as $$
begin
  update ypl.room_assignments ra
     set occupancyin = case
           when ra.occupancyin::date = old.resarrivaldate::date then new.resarrivaldate
           else ra.occupancyin
         end,
         occupancyout = case
           when ra.occupancyout::date = old.resdeparturedate::date then new.resdeparturedate
           else ra.occupancyout
         end
    from ypl.reservation_guests rg
   where rg.reservationguestid = ra.reservationguestid
     and rg.reservationid = new.reservationid
     and not rg.rgarchive
     and not ra.occupancyarchive
     and (ra.occupancyin::date = old.resarrivaldate::date
          or ra.occupancyout::date = old.resdeparturedate::date);
  return null;
end;
$$;

drop trigger if exists reservations_sync_room_dates on ypl.reservations;
create trigger reservations_sync_room_dates
  after update of resarrivaldate, resdeparturedate on ypl.reservations
  for each row execute function ypl.reservations_sync_room_dates();

comment on function ypl.reservations_sync_room_dates is
  'Keeps room assignments aligned when a stay is extended or shortened. Only occupancy windows that ran to the reservation''s own dates move; mid-stay room-move windows are left alone.';

-- -----------------------------------------------------------------------------
-- Removing a line entered in error
-- -----------------------------------------------------------------------------

create or replace function ypl.archive_transaction(p_transactionid integer)
returns void
language plpgsql
volatile
as $$
begin
  update ypl.transactions t
     set transarchive = true
   where t.transactionid = p_transactionid;
  if not found then
    raise exception 'Charge line % not found', p_transactionid;
  end if;
end;
$$;

comment on function ypl.archive_transaction is
  'Removes a charge line entered in error from the ledger and every report. The row is archived rather than deleted, so the correction stays auditable.';

create or replace function ypl.archive_payment(p_paymentid integer)
returns void
language plpgsql
volatile
as $$
begin
  update ypl.payments p
     set paymentarchive = true
   where p.paymentid = p_paymentid;
  if not found then
    raise exception 'Payment line % not found', p_paymentid;
  end if;
end;
$$;

comment on function ypl.archive_payment is
  'Removes a payment or deposit entered in error from the ledger, daily cash, and every report. The row is archived rather than deleted, so the correction stays auditable.';

grant execute on all functions in schema ypl to authenticated, service_role;
