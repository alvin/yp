-- =============================================================================
-- 0031_manual_sales_without_check_outs.sql
-- The Manual Sales List leaves off the rooms checking out that day.
--
-- The sheet is where the desk writes down sales at busy times (drinks before
-- dinner) to enter later, so it lists the rooms a guest sleeps in that night.
-- A room checking out that day only mattered on the days before. Since 0014 it
-- read every room held that day, departures included. Access's list
-- (qrySubreportManualSalesListRoom) took StartDate between OccupancyIn and
-- OccupancyOut - 1, so this returns it to that. A room a moving party leaves
-- that day goes with it; they are on the sheet in the room they move into.
-- =============================================================================

set search_path = ypl, public;

-- As 0014, without the rooms whose window ends on p_date.
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
   where o.occupancyout::date > p_date
   order by o.roomorder nulls last, o.room_compact, o.resnumber;
$$;

comment on function ypl.report_manual_sales is
  'Manual Sales List for a day: each room a guest sleeps in that night (not the rooms checking out), in the lodge''s room order, with its reservation and guest; cancelled stays only when asked.';

grant execute on all functions in schema ypl to authenticated, service_role;
