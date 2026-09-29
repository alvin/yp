-- =============================================================================
-- 0014_one_rule_each.sql
-- Each business rule is written once and read everywhere it applies.
--
-- A review of the reporting layer found the same rules written several times,
-- drifting apart:
--
--   * which rooms are held on a day — the housekeeping, In House and manual
--     sales reports, the kitchen total and the date searches each filtered
--     removed rooms, removed guest names and archived stays differently (the
--     date searches still matched rooms that had been removed),
--   * how many guests are in house — the kitchen report counted a party that
--     moves rooms twice on the move day, the In House report once,
--   * the deposit held on a stay — the date search ignored deposits applied to
--     the bill or kept, and the cancel dialog showed only the first deposit,
--   * which diet records count, and which housekeeping note is current — each
--     written two or three times,
--   * the daily cash lines only listed payment types, charge categories and
--     payment categories on the lodge's lookup lists, while the totals counted
--     everything, so a line could go missing and the lines not add up,
--   * the category a charge posts to (Red Wine → Liquor) lived only in the app,
--     so a charge posted straight to the database skipped it.
--
-- Also: removing a charge or payment that is already removed now fails as the
-- documentation always said it did, the remaining archive functions report a
-- wrong id, and four functions nothing uses are dropped.
--
-- Two rules stay separate on purpose. Reports and searches ask which rooms are
-- *touched* on a day — arriving, staying, moving or leaving — so both ends of a
-- room window count. Room availability and room sharing ask who holds a room
-- *overnight*, so a room left on the 5th is free for an arrival on the 5th.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Rooms held on a day (or across a range)
-- -----------------------------------------------------------------------------

-- rgarchive and resarchive append to the view so "live" can be tested in one
-- place; nothing reading it by name is affected.
create or replace view ypl.v_occupancy_summary as
select
  o.occupancyid,
  o.reservationguestid,
  rg.reservationid,
  r.resnumber,
  rg.guestid,
  ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany) as guest_name,
  g.guestlastname,
  g.guestfirstname,
  o.roomid,
  ypl.room_display(room.roomname, room.roomnumber) as room,
  ypl.room_display_compact(room.roomname, room.roomnumber) as room_compact,
  room.roomname,
  room.roomnumber,
  room.roomtype,
  room.roomcode,
  room.roomshorthand,
  room.roomorder,
  o.occupancyin,
  o.occupancyout,
  o.occupancynumguests,
  o.occupancynotes,
  o.occupancyarchive,
  r.resarrivaldate,
  r.resdeparturedate,
  r.rescancelled,
  ypl.occupancy_status(r.resarrivaldate, r.resdeparturedate, o.occupancyin, o.occupancyout, current_date) as status_today,
  rg.rgarchive,
  r.resarchive
from ypl.room_assignments o
join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
join ypl.reservations r on r.reservationid = rg.reservationid
join ypl.guests g on g.guestid = rg.guestid
join ypl.rooms room on room.roomid = o.roomid;

create or replace function ypl.rooms_held(
  p_from date,
  p_to date default null,
  p_include_cancelled boolean default false
) returns setof ypl.v_occupancy_summary
language sql
stable
as $$
  select o.*
    from ypl.v_occupancy_summary o
   where not o.occupancyarchive
     and not o.rgarchive
     and not o.resarchive
     and (p_include_cancelled or not o.rescancelled)
     and o.occupancyin::date <= coalesce(p_to, p_from)
     and o.occupancyout::date >= p_from;
$$;

comment on function ypl.rooms_held is
  'The live room windows touched on a day (or any day of a range): arriving, staying, moving or leaving. Removed rooms, removed guest names and archived stays never count; cancelled stays only when asked. Every day-based report and search reads this.';

-- How many guests are in house on a day: every room held that day, except the
-- room a moving party is leaving — they are counted in the room they move into.
create or replace function ypl.guests_in_house(p_date date)
returns integer
language sql
stable
as $$
  select coalesce(sum(o.occupancynumguests), 0)::integer
    from ypl.rooms_held(p_date) o
   where ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date) <> 'Move Out';
$$;

comment on function ypl.guests_in_house is
  'Guests in house on a day, a party moving rooms counted once. The Total Guests line on the In House and Kitchen/Meal reports.';

drop function if exists ypl.report_kitchen_meal_total_guests(date);

-- -----------------------------------------------------------------------------
-- The current housekeeping note, and the diet records that count
-- -----------------------------------------------------------------------------

create or replace view ypl.v_current_housekeeping_notes as
select distinct on (h.reservationguestid)
       h.reservationguestid,
       h.housekeepingnotesid,
       h.hknotesdate,
       h.housekeepingnotes
  from ypl.housekeeping_notes h
 where not h.hkarchive
 order by h.reservationguestid, h.hknotesdate desc nulls last, h.housekeepingnotesid desc;

comment on view ypl.v_current_housekeeping_notes is
  'The housekeeping note in force for each guest on a stay: the latest one not removed. Read by the housekeeping report and the guest documents.';

create or replace view ypl.v_kitchen_diets as
select k.kitchenmealid,
       k.guestid,
       k.guestdiet,
       k.kitchenmealnotes,
       trim(concat_ws(' ', nullif(k.guestdiet, ''), nullif(k.kitchenmealnotes, ''))) as diet_text
  from ypl.kitchen_meals k
 where not k.kmarchive
   and nullif(trim(concat_ws(' ', k.guestdiet, k.kitchenmealnotes)), '') is not null;

comment on view ypl.v_kitchen_diets is
  'Diet records the kitchen acts on: not removed and not blank, with the diet and its notes as one line. Read by both kitchen reports and the guest documents.';

create or replace function ypl.stay_diet_notes(p_reservationid integer)
returns text
language sql
stable
as $$
  select string_agg(d.diet_text, E'\n'
                    order by rg.primaryguest desc, g.guestlastname, g.guestfirstname, d.kitchenmealid)
    from ypl.reservation_guests rg
    join ypl.guests g on g.guestid = rg.guestid
    join ypl.v_kitchen_diets d on d.guestid = g.guestid
   where rg.reservationid = p_reservationid
     and not rg.rgarchive;
$$;

create or replace function ypl.stay_housekeeping_notes(p_reservationid integer)
returns text
language sql
stable
as $$
  select string_agg(hk.housekeepingnotes, E'\n'
                    order by rg.primaryguest desc, g.guestlastname, g.guestfirstname)
    from ypl.reservation_guests rg
    join ypl.guests g on g.guestid = rg.guestid
    join ypl.v_current_housekeeping_notes hk on hk.reservationguestid = rg.reservationguestid
   where rg.reservationid = p_reservationid
     and not rg.rgarchive
     and nullif(trim(coalesce(hk.housekeepingnotes, '')), '') is not null;
$$;

-- -----------------------------------------------------------------------------
-- Daily reports on the one rule
-- -----------------------------------------------------------------------------

create or replace function ypl.report_housekeeping(p_date date)
returns table (
  status text,
  resnumber integer,
  guest text,
  guest_count integer,
  room text,
  in_date date,
  out_date date,
  note_date date,
  notes text
)
language sql
stable
as $$
  select ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date),
         o.resnumber,
         o.guest_name,
         o.occupancynumguests,
         o.room,
         o.occupancyin::date,
         o.occupancyout::date,
         hk.hknotesdate::date,
         hk.housekeepingnotes
    from ypl.rooms_held(p_date) o
    left join ypl.v_current_housekeeping_notes hk on hk.reservationguestid = o.reservationguestid
   order by o.roomorder nulls last, o.room, o.resnumber;
$$;

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
    from ypl.rooms_held(p_date) o
    join ypl.reservations r on r.reservationid = o.reservationid
    join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
   order by case ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date)
              when 'Arrive Today' then 1
              when 'Move In' then 2
              when 'Move Out' then 3
              when 'In House' then 4
              when 'Depart Today' then 5
            end,
            o.guestlastname,
            o.guestfirstname,
            o.roomorder nulls last;
$$;

create or replace function ypl.report_manual_sales(p_date date, p_include_cancelled boolean default false)
returns table (
  room text,
  resnumber integer,
  guest_last_name varchar,
  room_order real,
  is_cancelled boolean
)
language sql
stable
as $$
  select o.room_compact,
         o.resnumber,
         o.guestlastname,
         o.roomorder,
         o.rescancelled
    from ypl.rooms_held(p_date, null, p_include_cancelled) o
   order by o.roomorder nulls last, o.room_compact, o.resnumber;
$$;

create or replace function ypl.report_kitchen_meal(p_date date)
returns table (
  resnumber integer,
  guest text,
  arrival_date date,
  departure_date date,
  diet_notes text
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         notes.diet_notes
    from ypl.v_reservation_summary s
    cross join lateral (select ypl.stay_diet_notes(s.reservationid) as diet_notes) notes
   where not s.rescancelled
     and notes.diet_notes is not null
     and p_date between s.resarrivaldate::date and s.resdeparturedate::date
   order by s.guestlastname, s.guestfirstname, s.resnumber;
$$;

create or replace function ypl.report_kitchen_meal_filtered(p_from date, p_to date)
returns table (
  resnumber integer,
  guestlastname varchar,
  guestfirstname varchar,
  guestdiet varchar,
  kitchenmealnotes text,
  arrival_date date,
  departure_date date
)
language sql
stable
as $$
  select r.resnumber,
         g.guestlastname,
         g.guestfirstname,
         d.guestdiet,
         d.kitchenmealnotes,
         r.resarrivaldate::date,
         r.resdeparturedate::date
    from ypl.reservations r
    join ypl.reservation_guests rg on rg.reservationid = r.reservationid and not rg.rgarchive
    join ypl.guests g on g.guestid = rg.guestid
    join ypl.v_kitchen_diets d on d.guestid = g.guestid
   where not r.rescancelled
     and not r.resarchive
     and r.resarrivaldate::date between p_from and p_to
   order by g.guestlastname, g.guestfirstname, r.resnumber;
$$;

-- -----------------------------------------------------------------------------
-- Deposit held on a stay
-- -----------------------------------------------------------------------------

create or replace function ypl.reservation_deposit_held(p_reservationid integer)
returns numeric
language sql
stable
as $$
  select coalesce(sum(ypl.reservationguest_deposit_held(rg.reservationguestid)), 0)
    from ypl.reservation_guests rg
   where rg.reservationid = p_reservationid
     and not rg.rgarchive;
$$;

comment on function ypl.reservation_deposit_held is
  'Deposit still held on a stay: received, less refunded, applied to the bill or kept — reservationguest_deposit_held summed over the stay''s guests.';

-- deposit_held appends to the view; nothing reading it by name is affected.
create or replace view ypl.v_reservation_summary as
select
  r.reservationid,
  r.resnumber,
  r.resbookingdate,
  r.resbookedby,
  r.resgroupname,
  r.resarrivaldate,
  r.resdeparturedate,
  r.numnights,
  r.numrooms,
  r.numadults,
  r.numchildren,
  r.resconfirmed,
  r.resdateconfirmed,
  r.rescancelled,
  r.resdatecancelled,
  r.resnotes,
  r.resarchive,
  r.resarrivaltime,
  r.bedtype,
  rg.reservationguestid as primary_reservationguestid,
  g.guestid as primary_guestid,
  ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany) as guest_name,
  g.guestlastname,
  g.guestfirstname,
  g.guestaddress,
  g.guestcity,
  g.guestregion,
  g.guestcountry,
  g.guestpczip,
  g.guestprimaryphone,
  g.guestemailaddress,
  occ.rooms,
  occ.first_room_in,
  occ.last_room_out,
  occ.occupancy_guest_count,
  ypl.reservation_balance(r.reservationid) as balance_owing,
  ypl.reservation_deposit_held(r.reservationid) as deposit_held
from ypl.reservations r
left join lateral (
  select *
    from ypl.reservation_guests rg0
   where rg0.reservationid = r.reservationid
     and not rg0.rgarchive
   order by rg0.primaryguest desc, rg0.reservationguestid
   limit 1
) rg on true
left join ypl.guests g on g.guestid = rg.guestid
left join lateral (
  select
    string_agg(ypl.room_display(room.roomname, room.roomnumber), '; ' order by o.occupancyin, room.roomorder, room.roomid) as rooms,
    min(o.occupancyin) as first_room_in,
    max(o.occupancyout) as last_room_out,
    sum(coalesce(o.occupancynumguests, 0))::integer as occupancy_guest_count
  from ypl.reservation_guests rg2
  join ypl.room_assignments o on o.reservationguestid = rg2.reservationguestid and not o.occupancyarchive
  join ypl.rooms room on room.roomid = o.roomid
  where rg2.reservationid = r.reservationid
    and not rg2.rgarchive
) occ on true;

comment on view ypl.v_reservation_summary is
  'One row per reservation with primary guest, room summary, computed balance, and the deposit still held.';

-- -----------------------------------------------------------------------------
-- Date searches on the one rule
-- -----------------------------------------------------------------------------

create or replace function ypl.search_by_date(p_date date, p_mode text default 'arrivals')
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
           when exists (select 1 from ypl.rooms_held(p_date, null, true) o where o.reservationid = s.reservationid) then 'in_house'
         end,
         s.numnights,
         (s.numadults + coalesce(s.numchildren, 0)),
         s.deposit_held,
         s.rescancelled,
         exists (select 1 from ypl.shared_room_occupancies(s.reservationid))
    from ypl.v_reservation_summary s
   where not s.resarchive
     and (
       (coalesce(p_mode, 'arrivals') in ('arrivals', 'both') and s.resarrivaldate::date = p_date)
       or (coalesce(p_mode, 'arrivals') in ('departures', 'both') and s.resdeparturedate::date = p_date)
       or (coalesce(p_mode, 'arrivals') in ('in_house', 'occupancy') and exists (
            select 1 from ypl.rooms_held(p_date, null, true) o where o.reservationid = s.reservationid
          ))
     )
   order by s.guestlastname, s.guestfirstname, s.resnumber;
$$;

comment on function ypl.search_by_date is
  'Date search for the lookup workflow: arrivals/departures/both/in-house with party size, nights, deposit still held, cancellation state, and whether any room on the stay is shared with another reservation.';

create or replace function ypl.search_by_date_range(p_from date, p_to date, p_mode text default 'overlap')
returns table (
  reservationid integer,
  resnumber integer,
  guest_name text,
  arrival_date date,
  departure_date date,
  rooms text,
  match_type text
)
language sql
stable
as $$
  select s.reservationid,
         s.resnumber,
         s.guest_name,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         s.rooms,
         case
           when coalesce(p_mode, 'overlap') = 'arrivals' then 'arrival'
           when coalesce(p_mode, 'overlap') = 'departures' then 'departure'
           when coalesce(p_mode, 'overlap') = 'occupancy' then 'occupancy'
           else 'overlap'
         end
    from ypl.v_reservation_summary s
   where not s.resarchive
     and (
       (coalesce(p_mode, 'overlap') = 'arrivals' and s.resarrivaldate::date between p_from and p_to)
       or (coalesce(p_mode, 'overlap') = 'departures' and s.resdeparturedate::date between p_from and p_to)
       or (coalesce(p_mode, 'overlap') = 'occupancy' and exists (
            select 1 from ypl.rooms_held(p_from, p_to, true) o where o.reservationid = s.reservationid
          ))
       or (coalesce(p_mode, 'overlap') not in ('arrivals','departures','occupancy')
           and s.resarrivaldate::date <= p_to
           and s.resdeparturedate::date >= p_from)
     )
   order by s.resarrivaldate, s.guest_name, s.resnumber;
$$;

-- -----------------------------------------------------------------------------
-- Guest documents: the rooms of a stay are the live ones
-- -----------------------------------------------------------------------------

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
     and not o.rgarchive
   order by o.occupancyin, o.roomorder nulls last, o.occupancyid;
$$;

-- The confirmation and cancellation notice took their first room from every
-- room ever recorded, removed ones included; they now take it from
-- report_stay_rooms, as the check-in folio already did.
create or replace function ypl.report_reservation_confirmation(p_reservationid integer)
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
  date_confirmed date,
  arrival_date date,
  departure_date date,
  room text,
  in_date date,
  out_date date,
  guest_count integer,
  reservation_notes text,
  deposit_amount numeric,
  deposit_date date,
  diet_notes text,
  housekeeping_notes text
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
         s.resdateconfirmed::date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         first_occ.room,
         first_occ.in_date,
         first_occ.out_date,
         coalesce(first_occ.guest_count, s.numadults + coalesce(s.numchildren, 0)),
         s.resnotes,
         dep.deposit_amount,
         dep.deposit_date,
         ypl.stay_diet_notes(s.reservationid),
         ypl.stay_housekeeping_notes(s.reservationid)
    from ypl.v_reservation_summary s
    left join lateral (
      select r.room, r.in_date, r.out_date, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
       limit 1
    ) first_occ on true
    left join lateral (
      select ypl.money_amount(p.paymentamountcdn, p.paymentamount) as deposit_amount,
             p.paymentdate::date as deposit_date
        from ypl.payments p
        join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
       where rg.reservationid = s.reservationid
         and p.paymentcategory = 'Deposit (Received)'
         and not p.paymentarchive
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) dep on true
   where s.reservationid = p_reservationid;
$$;

create or replace function ypl.report_cancellation_notice(p_reservationid integer)
returns table (
  resnumber integer,
  guest text,
  guestaddress varchar,
  guestcity varchar,
  guestregion varchar,
  guestcountry varchar,
  guestpczip varchar,
  phone varchar,
  date_printed date,
  date_cancelled date,
  arrival_date date,
  departure_date date,
  room text,
  guest_count integer,
  deposit_received_amount numeric,
  deposit_received_date date,
  deposit_outcome_category text,
  deposit_outcome_amount numeric,
  deposit_outcome_date date,
  cancellation_notes text
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         s.guestaddress,
         s.guestcity,
         s.guestregion,
         s.guestcountry,
         s.guestpczip,
         s.guestprimaryphone,
         current_date,
         s.resdatecancelled::date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         first_occ.room,
         coalesce(first_occ.guest_count, s.numadults + coalesce(s.numchildren, 0)),
         dep.deposit_received_amount,
         dep.deposit_received_date,
         outcome.deposit_outcome_category,
         outcome.deposit_outcome_amount,
         outcome.deposit_outcome_date,
         s.resnotes
    from ypl.v_reservation_summary s
    left join lateral (
      select r.room, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
       limit 1
    ) first_occ on true
    left join lateral (
      select ypl.money_amount(p.paymentamountcdn, p.paymentamount) as deposit_received_amount,
             p.paymentdate::date as deposit_received_date
        from ypl.payments p
        join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
       where rg.reservationid = s.reservationid
         and p.paymentcategory = 'Deposit (Received)'
         and not p.paymentarchive
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) dep on true
    left join lateral (
      select p.paymentcategory as deposit_outcome_category,
             ypl.money_amount(p.paymentamountcdn, p.paymentamount) as deposit_outcome_amount,
             p.paymentdate::date as deposit_outcome_date
        from ypl.payments p
        join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
       where rg.reservationid = s.reservationid
         and p.paymentcategory in ('Deposit (Refund)', 'Deposit (Kept)', 'Deposit (Applied)', 'Prepayment (Refund)')
         and not p.paymentarchive
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) outcome on true
   where s.reservationid = p_reservationid;
$$;

-- -----------------------------------------------------------------------------
-- Daily cash: every line the totals count
-- -----------------------------------------------------------------------------

-- The lodge's lookup lists set the order of the lines. Anything posted under a
-- type or category not on a list still gets its own line, after the listed
-- ones, so the lines always add up to the totals beside them.
create or replace function ypl.report_dcar_payments(p_date date)
returns table (
  paymenttype text,
  calc_amount numeric,
  actual_amount numeric,
  adjustment numeric,
  sort_order integer
)
language sql
stable
as $$
  with day as (
    select coalesce(p.paymenttype, 'Unspecified') as paymenttype,
           ypl.payment_cash_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) as amount
      from ypl.payments p
     where p.paymentdate::date = p_date
       and not p.paymentarchive
  ), lines as (
    select pt.paymenttype::text as paymenttype, pt.paymenttypeorder as sort_order
      from ypl.lookup_payment_types pt
    union
    select d.paymenttype, 10000
      from day d
     where not exists (select 1 from ypl.lookup_payment_types pt where pt.paymenttype = d.paymenttype)
  )
  select l.paymenttype,
         round(coalesce(sum(d.amount), 0), 2),
         null::numeric,
         null::numeric,
         l.sort_order
    from lines l
    left join day d on d.paymenttype = l.paymenttype
   group by l.paymenttype, l.sort_order
   order by l.sort_order, l.paymenttype;
$$;

create or replace function ypl.report_dcar_upper(p_date date)
returns table (
  group_name text,
  item text,
  amount numeric,
  sort_order integer
)
language sql
stable
as $$
  with charges as (
    select coalesce(t.transtype, 'Unspecified') as item, t.transamount as amount
      from ypl.transactions t
     where t.transdate::date = p_date
       and not t.transarchive
  ), revenue_lines as (
    select tt.transactiontype::text as item, tt.transactiontypeorder as sort_order
      from ypl.lookup_transaction_types tt
    union
    select c.item, 98
      from charges c
     where not exists (select 1 from ypl.lookup_transaction_types tt where tt.transactiontype = c.item)
  ), revenue as (
    select l.item, coalesce(sum(c.amount), 0) as amount, l.sort_order
      from revenue_lines l
      left join charges c on c.item = l.item
     group by l.item, l.sort_order
  ), taxes as (
    select 'GST'::text as item, coalesce(sum(transgstamount),0) as amount, 100 as sort_order from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'PST', coalesce(sum(transpstamount),0), 101 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'HST', coalesce(sum(transhstamount),0), 102 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Liquor Tax', coalesce(sum(transltamount),0), 103 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Room Tax', coalesce(sum(transrtamount),0), 104 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Hotel Tax', coalesce(sum(transhtamount),0), 105 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Dest Mktg Tax', coalesce(sum(transdmtamount),0), 106 from ypl.transactions where transdate::date = p_date and not transarchive
  ), receipts as (
    select coalesce(p.paymentcategory, 'Unspecified') as item,
           ypl.payment_reporting_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) as amount
      from ypl.payments p
     where p.paymentdate::date = p_date
       and not p.paymentarchive
       and p.paymentcategory is distinct from 'Payment (Regular)'
  ), adjustment_lines as (
    select pc.paymentcategory::text as item, 200 + coalesce(pc.paymentcategoryorder, 999) as sort_order
      from ypl.lookup_payment_categories pc
     where pc.paymentcategory <> 'Payment (Regular)'
    union
    select r.item, 10000
      from receipts r
     where not exists (select 1 from ypl.lookup_payment_categories pc where pc.paymentcategory = r.item)
  ), adjustments as (
    select l.item, coalesce(sum(r.amount), 0) as amount, l.sort_order
      from adjustment_lines l
      left join receipts r on r.item = l.item
     group by l.item, l.sort_order
  )
  select 'Revenue', item, round(amount,2), sort_order from revenue
  union all
  select 'Revenue', 'Total Sales and Charges', round(coalesce(sum(amount),0),2), 99 from revenue
  union all
  select 'Taxes', item, round(amount,2), sort_order from taxes
  union all
  select 'Taxes', 'Total Taxes', round(coalesce(sum(amount),0),2), 199 from taxes
  union all
  select 'Adjustments', item, round(amount,2), sort_order from adjustments
  order by sort_order, item;
$$;

-- -----------------------------------------------------------------------------
-- The category a charge posts to
-- -----------------------------------------------------------------------------

create or replace function ypl.charge_category(p_invtype text)
returns text
language sql
immutable
as $$
  select case p_invtype
    when 'Red Wine' then 'Liquor'
    when 'White Wine' then 'Liquor'
    when 'Beer and Cider' then 'Liquor'
    when 'Liqueurs' then 'Liquor'
    when 'Beauty Services' then 'Beauty Services'
    when 'Shuttle' then 'Shuttle Service'
    when 'Shirts and Clothing' then 'Hats/Shirts'
    when 'Sundries' then 'Sundries'
    when 'Gift Certificate' then 'Gift Certificate'
    else 'Misc.'
  end;
$$;

comment on function ypl.charge_category is
  'The daily cash category an item''s charge posts to, from the item''s type (Red Wine → Liquor). Anything unlisted is Misc.';

create or replace function ypl.post_charge(
  p_reservationguestid integer,
  p_inventoryid integer,
  p_quantity integer default 1,
  p_transdate date default current_date,
  p_amount numeric default null,
  p_transtype text default null,
  p_notes text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_type text;
  v_transactionid integer;
begin
  select coalesce(p_transtype, ypl.charge_category(i.invtype))
    into v_type
    from ypl.inventory_items i
   where i.inventoryid = p_inventoryid;
  if v_type is null then
    raise exception 'Inventory item % not found', p_inventoryid;
  end if;

  insert into ypl.transactions (
    reservationguestid, transdate, transtype, inventoryid, transquantity,
    transamount, transnotes, transarchive
  ) values (
    p_reservationguestid, coalesce(p_transdate, current_date), v_type, p_inventoryid,
    coalesce(p_quantity, 1), p_amount, p_notes, false
  )
  returning transactionid into v_transactionid;
  return v_transactionid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Removing things: a wrong or already-removed id is an error, not a no-op
-- -----------------------------------------------------------------------------

create or replace function ypl.archive_transaction(p_transactionid integer)
returns void
language plpgsql
volatile
as $$
begin
  update ypl.transactions t
     set transarchive = true
   where t.transactionid = p_transactionid
     and not t.transarchive;
  if not found then
    raise exception 'Charge line % not found or already removed', p_transactionid;
  end if;
end;
$$;

create or replace function ypl.archive_payment(p_paymentid integer)
returns void
language plpgsql
volatile
as $$
begin
  update ypl.payments p
     set paymentarchive = true
   where p.paymentid = p_paymentid
     and not p.paymentarchive;
  if not found then
    raise exception 'Payment line % not found or already removed', p_paymentid;
  end if;
end;
$$;

drop function if exists ypl.archive_housekeeping_note(integer);
create function ypl.archive_housekeeping_note(p_housekeepingnotesid integer)
returns void
language plpgsql
volatile
as $$
begin
  update ypl.housekeeping_notes h
     set hkarchive = true
   where h.housekeepingnotesid = p_housekeepingnotesid
     and not h.hkarchive;
  if not found then
    raise exception 'Housekeeping note % not found or already removed', p_housekeepingnotesid;
  end if;
end;
$$;

drop function if exists ypl.archive_kitchen_meal(integer);
create function ypl.archive_kitchen_meal(p_kitchenmealid integer)
returns void
language plpgsql
volatile
as $$
begin
  update ypl.kitchen_meals k
     set kmarchive = true
   where k.kitchenmealid = p_kitchenmealid
     and not k.kmarchive;
  if not found then
    raise exception 'Diet record % not found or already removed', p_kitchenmealid;
  end if;
end;
$$;

-- Nothing calls these. set_guest_in_house set a flag nothing reads (in house is
-- worked out from dates); archive_room_assignment could leave a stay with no
-- room and is superseded by undo_room_move; archive_reservation_guest could
-- archive the primary guest; set_updated_at is attached to no trigger.
drop function if exists ypl.set_guest_in_house(integer, boolean);
drop function if exists ypl.archive_room_assignment(integer);
drop function if exists ypl.archive_reservation_guest(integer);
drop function if exists ypl.set_updated_at();

grant execute on all functions in schema ypl to authenticated, service_role;
