-- =============================================================================
-- 0013_accurate_occupancy_status.sql
-- A room's status for a day is worked out, never assumed.
--
-- occupancy_status (0003) named four cases — Move In, Arrive Today, Depart
-- Today, In House — and called everything else "In House". The daily reports
-- only ask about rooms occupied on the report date, so the catch-all rarely
-- fired there; but it hid one real case, and the reservation screen asks about
-- every room of a stay on every day:
--
--   * the room a party leaves on a move day read "In House" — on most days of
--     the year, housekeeping was told a room being vacated was occupied,
--   * on the reservation screen every room of a past or future stay, and the
--     not-yet-reached room of a stay that moves, read "In House".
--
-- Every case is now named: Future and Past for a room not occupied on the day,
-- Move Out for the room being left mid-stay, and In House only for a room held
-- that day with no arrival, departure or move in it. The In House report runs
-- Move Out beside Move In.
-- =============================================================================

set search_path = ypl, public;

create or replace function ypl.occupancy_status(
  p_arrival timestamp without time zone,
  p_departure timestamp without time zone,
  p_room_in timestamp without time zone,
  p_room_out timestamp without time zone,
  p_ref_date date
) returns text
language sql
immutable
as $$
  select case
    when p_ref_date < p_room_in::date then 'Future'
    when p_ref_date > p_room_out::date then 'Past'
    -- The room is held on the day; which day of its window is it?
    when p_room_in::date = p_ref_date and p_room_in::date > p_arrival::date then 'Move In'
    when p_arrival::date = p_ref_date then 'Arrive Today'
    when p_departure::date = p_ref_date then 'Depart Today'
    when p_room_out::date = p_ref_date and p_room_out::date < p_departure::date then 'Move Out'
    when p_ref_date between p_room_in::date and p_room_out::date then 'In House'
  end;
$$;

comment on function ypl.occupancy_status is
  'A room window''s status on a day: Future or Past when the room isn''t held that day; otherwise Arrive Today, Move In, Move Out, Depart Today, or In House. Every case is named — nothing is assumed.';

-- The In House report runs the day in order; the room being left sits with
-- the room being entered.
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
              when 'Move Out' then 3
              when 'In House' then 4
              when 'Depart Today' then 5
              else 6
            end,
            o.guestlastname,
            o.guestfirstname,
            o.roomorder nulls last;
$$;

comment on function ypl.report_in_house is
  'In House report rows for one day, grouped in the order the day runs — arrivals, room moves in and out, in house, departures — so the printed report can break into sections under their own headings.';

grant execute on all functions in schema ypl to authenticated, service_role;
