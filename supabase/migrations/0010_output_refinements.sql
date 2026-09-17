-- =============================================================================
-- 0010_output_refinements.sql
-- Printed-output and lookup refinements from the client's second round of live
-- use ("Items to do with Output").
--
-- Everything that decides what a document says stays in the database, the way
-- 0003–0009 already do, so a report is the same whether the app or a direct
-- Supabase query asks for it:
--
--   * the check-in folio carries every receipt held against the stay —
--     prepayments and gift certificates beside the deposit — and the diet the
--     kitchen has on file, because arrival is when the front desk confirms it,
--   * a room-night charge names its room on the check-out bill,
--   * the check-in folio and the confirmation list every room a stay occupies,
--     not only the first, so a party moving mid-stay reads it off the slip,
--   * the In House report is ordered the way the day runs — arrivals, moves,
--     in house, departures — so it can print under section headings,
--   * two reservations holding one room over overlapping nights are found and
--     flagged, since the lodge shares rooms on purpose and wants to see it,
--   * a phone number matches however it is punctuated, and a guest number is
--     an all-fields search term like a reservation number,
--   * the company field is no longer searched, and name search no longer
--     classifies a match as a shared reservation.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Search term helpers
-- -----------------------------------------------------------------------------

create or replace function ypl.digits_only(p_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_text, ''), '\D', '', 'g');
$$;

comment on function ypl.digits_only is
  'The digits in a value, punctuation and spacing dropped. Lets a phone number be compared however either side is formatted.';

create or replace function ypl.digits_pattern(p_term text)
returns text
language sql
immutable
as $$
  -- A typed token as a digits-only LIKE pattern, but only once it is long
  -- enough to be a phone number. Below that a bare number is far more likely
  -- to be a street number or a year, and matching it against every phone in
  -- the lodge would bury the result the clerk wants.
  select case when length(d) >= 7 then '%' || d || '%' end
    from (select ypl.digits_only(p_term) as d) s;
$$;

comment on function ypl.digits_pattern is
  'Normalizes a typed token into a digits-only LIKE pattern for phone matching, or null when the token carries fewer than seven digits.';

create or replace function ypl.search_terms(p_query text)
returns table (raw text, pat text, digits text, ord integer)
-- A front-desk entry is a couple of words. Declaring that is not cosmetic:
-- regexp_split_to_table's default guess of 1000 rows makes the planner expect
-- tens of millions of field/keyword pairs and pick a nested loop that takes
-- half a minute on a one-letter search. plpgsql rather than sql because an
-- inlinable sql function hands its body to the planner and the row estimate
-- goes with it.
language plpgsql
immutable
rows 3
as $$
begin
  return query
    select trim(t.tok),
           ypl.search_pattern(t.tok),
           ypl.digits_pattern(t.tok),
           t.ord::integer
      from regexp_split_to_table(coalesce(p_query, ''), '\s+') with ordinality as t(tok, ord)
     where ypl.search_pattern(t.tok) is not null
       -- search_all_fields tracks which keywords a record carries in a 64-bit
       -- mask. No front-desk entry comes near sixty words.
       and t.ord <= 60;
end;
$$;

comment on function ypl.search_terms is
  'One row per usable keyword in a search box entry: the trimmed token, its LIKE pattern, and its digits-only pattern where it is long enough to be a phone number.';

-- -----------------------------------------------------------------------------
-- Name search: no company field, no shared-reservation classification
-- -----------------------------------------------------------------------------

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
  other_names text
)
language sql
stable
as $$
  with pats as (select ypl.search_patterns(p_query) as ps)
  -- Every keyword has to appear somewhere in the name, so extra characters
  -- narrow the list instead of widening it. Only guests whose own name matches
  -- come back: a search returns the people it names, never the people they
  -- have travelled with.
  select g.guestid,
         g.guest_name,
         g.guestlastname,
         g.guestfirstname,
         g.guestcity,
         g.guestregion,
         g.guestprimaryphone,
         g.guestemailaddress,
         ypl.guest_co_names(g.guestid)
    from ypl.v_guest_summary g, pats
   where cardinality(pats.ps) > 0
     and not g.guestvoid
     and not g.guestarchive
     and (
       select bool_and(
                concat_ws(' ', g.guestlastname, g.guestfirstname, g.guest_name)
                ilike pat escape '\')
         from unnest(pats.ps) as pat
     )
   order by similarity(coalesce(g.guestlastname, ''), coalesce(p_query, '')) desc,
            g.guestlastname,
            g.guestfirstname,
            g.guestid
   limit greatest(coalesce(p_limit, 200), 1);
$$;

comment on function ypl.search_guests_by_name is
  'Partial-string guest name search over last, first and display name. Every keyword must match; placeholder punctuation and ''*'' wildcards are honoured. other_names carries the other names the guest''s stays are booked under.';

-- -----------------------------------------------------------------------------
-- All-fields search: phone numbers however punctuated, guest number, no company
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
  with terms as (
    select raw, pat, digits, ord from ypl.search_terms(p_query)
  ),
  -- Which keywords a record carries, as one bit per keyword. Counting them
  -- instead would mean joining two aggregates over the same rows, and the
  -- planner's estimate of how many records clear that bar is a guess: get the
  -- guess wrong on a one-letter search and it picks a nested loop over tens of
  -- thousands of rows on each side. One aggregation chain cannot be planned
  -- that way.
  term_mask as (select coalesce(bit_or(1::bigint << (ord - 1)), 0) as m from terms),
  -- An entry that is nothing but a phone number is one search term however it
  -- is spaced or punctuated: '(250) 592-6029' is not two keywords.
  phone_query as (
    select case when p_query ~ '^[0-9()+./\s-]+$' and length(ypl.digits_only(p_query)) >= 7
                then '%' || ypl.digits_only(p_query) || '%'
           end as pat
  ),

  -- Guests: one row per searchable office-entered field. `mode` says how the
  -- field is matched — 'like' for free text, 'phone' for a number that may be
  -- punctuated either way, 'exact' for an identifier that is typed in full.
  guest_fields as (
    select g.guestid, g.guest_name, f.ord, f.label, f.mode, f.value
      from ypl.v_guest_summary g
      cross join lateral (values
        (1, 'name',            'like',  nullif(g.guest_name, '')),
        (2, 'guest number',    'exact', g.guestid::text),
        (3, 'primary phone',   'phone', nullif(g.guestprimaryphone, '')::text),
        (4, 'secondary phone', 'phone', nullif(g.guestsecondaryphone, '')::text),
        (5, 'address',         'like',  nullif(concat_ws(', ', g.guestaddress, g.guestcity,
                                                g.guestregion, g.guestcountry, g.guestpczip), '')),
        (6, 'email',           'like',  nullif(g.guestemailaddress, '')::text)
      ) f(ord, label, mode, value)
     where not g.guestvoid
       and not g.guestarchive
       and f.value is not null
  ),
  -- One branch per way of matching, rather than one branch with a CASE. The
  -- planner can only estimate a plain `column operator value` predicate; give
  -- it a CASE and it guesses, over-counts the pairs by three orders of
  -- magnitude, and picks a nested loop that takes half a minute on a
  -- one-letter search. Branches may report the same field twice; every reader
  -- below is already distinct-based, so that costs nothing.
  guest_field_hits as (
    select gf.guestid, gf.guest_name, gf.ord, gf.label, gf.value, t.ord as term_ord
      from guest_fields gf
      join terms t on gf.value ilike t.pat escape '\'
     where gf.mode <> 'exact'
    union all
    select gf.guestid, gf.guest_name, gf.ord, gf.label, gf.value, t.ord
      from guest_fields gf
      join terms t on gf.value = t.raw
     where gf.mode = 'exact'
    union all
    select gf.guestid, gf.guest_name, gf.ord, gf.label, gf.value, t.ord
      from guest_fields gf
      join terms t on ypl.digits_only(gf.value) like t.digits
     where gf.mode = 'phone'
       and t.digits is not null
    union all
    -- A phone-only entry satisfies the whole query at once, so the spaces in
    -- '(250) 592-6029' do not read as keywords the record also has to carry.
    select gf.guestid, gf.guest_name, gf.ord, gf.label, gf.value, t.ord
      from guest_fields gf
      cross join terms t
      cross join phone_query pq
     where gf.mode = 'phone'
       and pq.pat is not null
       and ypl.digits_only(gf.value) like pq.pat
  ),
  guest_per_field as (
    -- One row per guest and field, carrying the keywords that landed in it.
    -- label and value are fixed by ord, so min() picks the only value there is.
    select h.guestid,
           h.ord,
           min(h.guest_name) as guest_name,
           min(h.label) as label,
           min(h.value) as value,
           bit_or(1::bigint << (h.term_ord - 1)) as mask
      from guest_field_hits h
     group by h.guestid, h.ord
  ),
  guest_result as (
    -- Multi-keyword search is an AND: the record has to carry every keyword,
    -- though each one may land in a different field.
    select gf.guestid,
           null::integer as reservationid,
           null::integer as resnumber,
           min(gf.guest_name) as guest_name,
           string_agg(gf.label, ', ' order by gf.ord) as matched_on,
           string_agg(gf.value, ' · ' order by gf.ord) as detail
      from guest_per_field gf
     group by gf.guestid
    having bit_or(gf.mask) = (select m from term_mask)
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
  res_per_field as (
    select h.reservationid,
           h.ord,
           min(h.resnumber) as resnumber,
           min(h.primary_guestid) as primary_guestid,
           min(h.guest_name) as guest_name,
           min(h.label) as label,
           min(h.value) as value,
           bit_or(1::bigint << (h.term_ord - 1)) as mask
      from res_field_hits h
     group by h.reservationid, h.ord
  ),
  res_result as (
    select min(rf.primary_guestid) as guestid,
           rf.reservationid,
           min(rf.resnumber) as resnumber,
           min(rf.guest_name) as guest_name,
           string_agg(rf.label, ', ' order by rf.ord) as matched_on,
           string_agg(rf.value, ' · ' order by rf.ord) as detail
      from res_per_field rf
     group by rf.reservationid
    having bit_or(rf.mask) = (select m from term_mask)
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
  'Broad search across the office-entered details of guests (name, guest number, phones, address, email) and reservations (number, group). Several keywords may be entered; a record is returned only when it carries them all. Phone numbers match however either side is punctuated; a guest number matches when typed in full.';

-- -----------------------------------------------------------------------------
-- Rooms shared by two reservations
-- -----------------------------------------------------------------------------

-- The lodge puts two parties in one room on purpose as well as by accident, so
-- this reports the fact rather than preventing it. Windows that merely touch —
-- one party leaving on the day the next arrives — are not shared: the overlap
-- has to be a night both parties hold.
create or replace function ypl.shared_room_occupancies(p_reservationid integer)
returns table (
  occupancyid integer,
  roomid integer,
  room text,
  other_reservationid integer,
  other_resnumber integer,
  other_guest text,
  shared_in date,
  shared_out date
)
language sql
stable
as $$
  -- Reads the assignment tables rather than v_occupancy_summary: the date
  -- search asks this question once per result row, and the view's four joins
  -- and display helpers are work the question does not need.
  select distinct
         mine.occupancyid,
         mine.roomid,
         ypl.room_display(rm.roomname, rm.roomnumber),
         their_res.reservationid,
         their_res.resnumber,
         ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany),
         greatest(mine.occupancyin, theirs.occupancyin)::date,
         least(mine.occupancyout, theirs.occupancyout)::date
    from ypl.room_assignments mine
    join ypl.reservation_guests my_rg on my_rg.reservationguestid = mine.reservationguestid
    join ypl.reservations my_res on my_res.reservationid = my_rg.reservationid
    join ypl.rooms rm on rm.roomid = mine.roomid
    join ypl.room_assignments theirs
      on theirs.roomid = mine.roomid
     and theirs.occupancyin < mine.occupancyout
     and theirs.occupancyout > mine.occupancyin
     and not theirs.occupancyarchive
    join ypl.reservation_guests their_rg on their_rg.reservationguestid = theirs.reservationguestid
    join ypl.reservations their_res
      on their_res.reservationid = their_rg.reservationid
     and their_res.reservationid <> my_res.reservationid
     and not their_res.rescancelled
    join ypl.guests g on g.guestid = their_rg.guestid
   where my_rg.reservationid = p_reservationid
     and not mine.occupancyarchive
     and not my_res.rescancelled
   order by mine.occupancyid, their_res.resnumber;
$$;

comment on function ypl.shared_room_occupancies is
  'Room windows on this reservation that another live reservation also holds for at least one night, with the party sharing it. Back-to-back stays that only touch at a turnover are not shared.';

-- Date search gains the same fact, so a shared room is visible in the lookup
-- results without opening each reservation.
drop function if exists ypl.search_by_date(date, text);
create function ypl.search_by_date(
  p_date date,
  p_mode text default 'arrivals'
)
returns table (
  reservationid integer,
  reservationguestid integer,
  resnumber integer,
  guest_name text,
  guestlastname varchar,
  guestfirstname varchar,
  room text,
  arrival_date date,
  departure_date date,
  match_type text,
  numnights integer,
  pax integer,
  deposit_cdn numeric,
  rescancelled boolean,
  shared_room boolean
)
language sql
stable
as $$
  select s.reservationid,
         s.primary_reservationguestid,
         s.resnumber,
         s.guest_name,
         s.guestlastname,
         s.guestfirstname,
         s.rooms,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         case
           when s.resarrivaldate::date = p_date then 'arrival'
           when s.resdeparturedate::date = p_date then 'departure'
           when exists (
             select 1 from ypl.v_occupancy_summary o
              where o.reservationid = s.reservationid
                and p_date between o.occupancyin::date and o.occupancyout::date
           ) then 'in_house'
           else 'date_match'
         end,
         s.numnights,
         (s.numadults + coalesce(s.numchildren, 0)),
         coalesce((
           select round(sum(case p.paymentcategory
                    when 'Deposit (Received)' then ypl.money_amount(p.paymentamountcdn, p.paymentamount)
                    when 'Deposit (Refund)'   then ypl.money_amount(p.paymentamountcdn, p.paymentamount)
                    else 0 end), 2)
             from ypl.payments p
             join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
            where rg.reservationid = s.reservationid
              and not rg.rgarchive
              and not p.paymentarchive
         ), 0),
         s.rescancelled,
         exists (select 1 from ypl.shared_room_occupancies(s.reservationid))
    from ypl.v_reservation_summary s
   where not s.resarchive
     and (
       (coalesce(p_mode, 'arrivals') in ('arrivals', 'both') and s.resarrivaldate::date = p_date)
       or (coalesce(p_mode, 'arrivals') in ('departures', 'both') and s.resdeparturedate::date = p_date)
       or (coalesce(p_mode, 'arrivals') in ('in_house', 'occupancy') and exists (
            select 1 from ypl.v_occupancy_summary o
             where o.reservationid = s.reservationid
               and p_date between o.occupancyin::date and o.occupancyout::date
          ))
     )
   order by s.guestlastname, s.guestfirstname, s.resnumber;
$$;

comment on function ypl.search_by_date is
  'Date search for the lookup workflow: arrivals/departures/both/in-house with party size, nights, net deposit held, cancellation state, and whether any room on the stay is shared with another reservation.';

-- -----------------------------------------------------------------------------
-- Guest documents: every room on the stay, every receipt, the diet on file
-- -----------------------------------------------------------------------------

-- Every room a stay occupies, in the order it occupies them. A stay that never
-- moves returns the one row the folio and confirmation already printed.
create or replace function ypl.report_stay_rooms(p_reservationid integer)
returns table (
  occupancyid integer,
  room text,
  in_date date,
  out_date date,
  guest_count integer
)
language sql
stable
as $$
  select o.occupancyid,
         o.room,
         o.occupancyin::date,
         o.occupancyout::date,
         coalesce(o.occupancynumguests, s.numadults + coalesce(s.numchildren, 0))
    from ypl.v_occupancy_summary o
    join ypl.v_reservation_summary s on s.reservationid = o.reservationid
   where o.reservationid = p_reservationid
     and not o.occupancyarchive
   order by o.occupancyin, o.roomorder nulls last, o.occupancyid;
$$;

comment on function ypl.report_stay_rooms is
  'The rooms a stay occupies with their own dates and guest counts, in stay order — the room-move history as the check-in folio and confirmation print it.';

-- Money already received against the stay. The front desk confirms all of it
-- at the desk on arrival, not the deposit alone.
create or replace function ypl.report_folio_receipts(p_reservationid integer)
returns table (
  paymentid integer,
  receipt_date date,
  category varchar,
  paymenttype varchar,
  amount numeric
)
language sql
stable
as $$
  select p.paymentid,
         p.paymentdate::date,
         p.paymentcategory,
         p.paymenttype,
         round(ypl.money_amount(p.paymentamountcdn, p.paymentamount), 2)
    from ypl.payments p
    join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
   where rg.reservationid = p_reservationid
     and not rg.rgarchive
     and not p.paymentarchive
     and p.paymentcategory in (
       'Deposit (Received)', 'Prepayment (Received)', 'Gift Certificate Received'
     )
   order by p.paymentdate, p.paymentid;
$$;

comment on function ypl.report_folio_receipts is
  'Deposits, prepayments and gift certificates received against a stay, oldest first — what the check-in folio confirms with the guest on arrival.';

-- The folio gains the diet the kitchen holds for the party. The deposit line it
-- used to carry is now one of the rows from report_folio_receipts.
drop function if exists ypl.report_check_in_folio(integer);
create function ypl.report_check_in_folio(p_reservationid integer)
returns table (
  resnumber integer,
  guest text,
  guest_names text,
  guestaddress varchar,
  guestcity varchar,
  guestregion varchar,
  guestcountry varchar,
  guestpczip varchar,
  phone varchar,
  date_printed date,
  arrival_date date,
  departure_date date,
  room text,
  in_date date,
  out_date date,
  guest_count integer,
  diet_notes text,
  vehicle_description varchar,
  vehicle_license_plate varchar
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         ypl.reservation_guest_names(s.reservationid),
         s.guestaddress,
         s.guestcity,
         s.guestregion,
         s.guestcountry,
         s.guestpczip,
         s.guestprimaryphone,
         current_date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         first_occ.room,
         first_occ.in_date,
         first_occ.out_date,
         coalesce(first_occ.guest_count, s.numadults + coalesce(s.numchildren, 0)),
         diet.diet_notes,
         rg.vehicledescription,
         rg.vehiclelicenseplate
    from ypl.v_reservation_summary s
    left join ypl.reservation_guests rg on rg.reservationguestid = s.primary_reservationguestid
    left join lateral (
      select r.room, r.in_date, r.out_date, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
       limit 1
    ) first_occ on true
    left join lateral (
      -- The same wording the kitchen report prints, so the desk and the
      -- kitchen are reading one record.
      select string_agg(
               trim(concat_ws(' ', nullif(k.guestdiet, ''), nullif(k.kitchenmealnotes, ''))),
               E'\n' order by rgd.primaryguest desc, g.guestlastname, g.guestfirstname, k.kitchenmealid
             ) as diet_notes
        from ypl.reservation_guests rgd
        join ypl.guests g on g.guestid = rgd.guestid
        join ypl.kitchen_meals k on k.guestid = g.guestid and not k.kmarchive
       where rgd.reservationid = s.reservationid
         and not rgd.rgarchive
         and nullif(trim(concat_ws(' ', k.guestdiet, k.kitchenmealnotes)), '') is not null
    ) diet on true
   where s.reservationid = p_reservationid;
$$;

comment on function ypl.report_check_in_folio is
  'Check-in folio header: party, mailing details, the first room of the stay, and the diet on file. The rooms of a stay come from report_stay_rooms and the money already received from report_folio_receipts.';

-- -----------------------------------------------------------------------------
-- Check-out bill: a room charge names its room
-- -----------------------------------------------------------------------------

-- roomname/roomnumber append to the existing column list; nothing that reads
-- this view by name is affected.
create or replace view ypl.v_transaction_lines as
select
  t.transactionid,
  t.reservationguestid,
  rg.reservationid,
  r.resnumber,
  t.transdate,
  t.transtype,
  t.inventoryid,
  inv.invcode,
  coalesce(inv.invitemdescription, t.transnotes, t.transtype) as description,
  t.roomid,
  ypl.room_display(room.roomname, room.roomnumber) as room,
  t.transquantity,
  t.transamount,
  t.transgstamount,
  t.transpstamount,
  t.transhstamount,
  t.transltamount,
  t.transrtamount,
  t.transhtamount,
  t.transdmtamount,
  ypl.transaction_tax_total(
    t.transgstamount, t.transpstamount, t.transhstamount,
    t.transltamount, t.transrtamount, t.transhtamount, t.transdmtamount
  ) as tax_total,
  ypl.transaction_total(
    t.transamount, t.transgstamount, t.transpstamount, t.transhstamount,
    t.transltamount, t.transrtamount, t.transhtamount, t.transdmtamount
  ) as line_total,
  t.transnotes,
  t.transarchive,
  t.occupancyin,
  t.occupancyout,
  room.roomname,
  room.roomnumber
from ypl.transactions t
join ypl.reservation_guests rg on rg.reservationguestid = t.reservationguestid
join ypl.reservations r on r.reservationid = rg.reservationid
left join ypl.inventory_items inv on inv.inventoryid = t.inventoryid
left join ypl.rooms room on room.roomid = t.roomid;

drop function if exists ypl.report_checkout_bill_lines(integer);
create function ypl.report_checkout_bill_lines(p_reservationid integer)
returns table (
  sort_group text,
  sort_order integer,
  line_date date,
  description text,
  quantity numeric,
  unit_price numeric,
  amount numeric,
  kind_label text,
  display_sign text
)
language sql
stable
as $$
  with charge_lines as (
    select 'charges'::text as sort_group,
           row_number() over (order by t.transdate, t.transactionid)::integer as sort_order,
           t.transdate::date as line_date,
           -- A room-night line says which room it was for: the bill lists a
           -- whole stay and 'Room' on its own does not tell a departing guest
           -- which of them they are paying for.
           case when t.roomid is not null and t.inventoryid is null
                then t.description || ' – ' || concat_ws(' #', t.roomname, nullif(trim(t.roomnumber), ''))
                else t.description
            end as description,
           t.transquantity::numeric as quantity,
           case when nullif(t.transquantity,0) is null then null::numeric
                else round(t.transamount / t.transquantity, 2)
            end as unit_price,
           abs(t.transamount)::numeric as amount,
           t.transtype::text as kind_label,
           ''::text as display_sign
      from ypl.v_transaction_lines t
     where t.reservationid = p_reservationid
       and not t.transarchive
  ), payment_lines as (
    select 'settlements'::text,
           (1000 + row_number() over (order by p.paymentdate, p.paymentid))::integer,
           p.paymentdate::date,
           p.paymentcategory::text,
           1::numeric,
           null::numeric,
           abs(ypl.money_amount(p.paymentamountcdn, p.paymentamount))::numeric,
           p.paymentcategory::text,
           case when ypl.payment_balance_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) < 0 then '−' else '' end
      from ypl.payments p
      join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
     where rg.reservationid = p_reservationid
       and p.paymentcategory in (
         'Payment (Regular)', 'Deposit (Applied)', 'Deposit (Received)',
         'Prepayment (Applied)', 'Prepayment (Received)', 'Gift Certificate Received',
         'A/R (Payment Received)', 'A/R (Sent To Accounts)', 'Deposit (Refund)',
         'Prepayment (Refund)', 'Deposit (Kept)'
       )
       and not p.paymentarchive
  )
  select * from charge_lines
  union all
  select * from payment_lines
  order by sort_order;
$$;

comment on function ypl.report_checkout_bill_lines is
  'Check-out bill body: charge lines then settlement lines. A room-night charge carries the room it was for.';

-- -----------------------------------------------------------------------------
-- In House report: ordered the way the day runs
-- -----------------------------------------------------------------------------

create or replace function ypl.report_in_house(p_date date)
returns table (
  section text,
  resnumber integer,
  guest text,
  arrival text,
  guest_count integer,
  room text,
  in_date date,
  out_date date,
  occupancy_notes text
)
language sql
stable
as $$
  select ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date) as section,
         o.resnumber,
         o.guest_name,
         nullif(trim(coalesce(r.resarrivaltime, '')), '') as arrival,
         o.occupancynumguests,
         o.room,
         o.occupancyin::date,
         o.occupancyout::date,
         nullif(trim(concat_ws(' ', nullif(o.occupancynotes, ''), nullif(rg.rgnotes, ''))), '') as occupancy_notes
    from ypl.v_occupancy_summary o
    join ypl.reservations r on r.reservationid = o.reservationid
    join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
   where not o.rescancelled
     and not o.occupancyarchive
     and p_date between o.occupancyin::date and o.occupancyout::date
   order by case ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date)
              when 'Arrive Today' then 1
              when 'Move In' then 2
              when 'In House' then 3
              when 'Depart Today' then 4
              else 5
            end,
            o.guestlastname,
            o.guestfirstname,
            o.roomorder nulls last;
$$;

comment on function ypl.report_in_house is
  'In House report rows for one day, grouped in the order the day runs — arrivals, room moves, in house, departures — so the printed report can break into sections under their own headings.';

grant execute on all functions in schema ypl to authenticated, service_role;
