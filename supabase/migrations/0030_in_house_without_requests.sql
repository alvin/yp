-- =============================================================================
-- 0030_in_house_without_requests.sql
-- The In House report prints the occupancy notes alone.
--
-- Since 0014 its notes column joined each room's occupancy notes with the
-- guest's requests (RGNotes). The lodge asked for the requests off it (28 Oct):
-- they have their own Requests report for the day. Access's In House report
-- (qryReportInHouseOccupancy2) printed OccupancyNotes alone, so this returns it
-- to that.
-- =============================================================================

set search_path = ypl, public;

-- As 0014, with the occupancy notes and nothing else.
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
         nullif(trim(coalesce(o.occupancynotes, '')), '') as occupancy_notes
    from ypl.rooms_held(p_date) o
    join ypl.reservations r on r.reservationid = o.reservationid
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

comment on function ypl.report_in_house is
  'In House report for a day: each room held, by section (arriving, moving, in house, departing), with its occupancy notes. The guest''s requests print on the Requests report, not here.';

grant execute on all functions in schema ypl to authenticated, service_role;
