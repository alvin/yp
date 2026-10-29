-- =============================================================================
-- 0033_weekly_kitchen_diet_with_notes.sql
-- The Weekly Kitchen Report prints the diet and its notes in one column.
--
-- The lodge asked for the Guest Diet column off the weekly report (29 Oct).
-- The column held the diet type from the old pick list, which has been off the
-- screens since 13 Oct and which Access used once in all its history. A type
-- still on file prints ahead of the notes, as it does on the Daily Kitchen/Meal
-- Report and the guest documents: the report returns v_kitchen_diets.diet_text,
-- the one rule for joining the two, in place of the two separate columns.
-- =============================================================================

set search_path = ypl, public;

-- The returned columns change, so the function is dropped and recreated.
drop function if exists ypl.report_kitchen_meal_filtered(date, date);

-- As 0014, with diet_notes in place of guestdiet and kitchenmealnotes.
create function ypl.report_kitchen_meal_filtered(p_from date, p_to date)
returns table (
  resnumber integer,
  guestlastname varchar,
  guestfirstname varchar,
  diet_notes text,
  arrival_date date,
  departure_date date
)
language sql
stable
as $$
  select r.resnumber,
         g.guestlastname,
         g.guestfirstname,
         d.diet_text,
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

comment on function ypl.report_kitchen_meal_filtered is
  'Weekly Kitchen Report: each guest with a diet on file whose stay arrives in the range, with the diet and its notes as one line.';

grant execute on all functions in schema ypl to authenticated, service_role;
