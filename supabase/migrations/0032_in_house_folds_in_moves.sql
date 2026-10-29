-- =============================================================================
-- 0032_in_house_folds_in_moves.sql
-- The In House report's sections and figures, as Access's report had them.
--
-- The lodge asked for the moves folded into In House (29 Oct). Since 0013 the
-- report gave a party moving rooms two sections of its own, Move In and Move
-- Out. Access never did: qryReportInHouseOccupancy2 names only Arrive Today,
-- Depart Today and In House, from the reservation's own dates, so both rooms
-- of a mid-stay move read In House. Within the section the room a party leaves
-- comes before the room it moves into.
--
-- Reconciling the rest of the report against Access (rptInHouse in
-- YPLogicCurrentConsolidated.accdb, and the lodge's printed sample for
-- 23-Dec-25, whose lines this report reproduces):
--   * the arrival time printed only on an arriving stay
--     (IIf([ResArrivalDate]=StartDate, [ResArrivalTime], "")); ours printed it
--     on every line;
--   * each section's figure was the guests on its lines (=Sum of
--     OccupancyNumGuests per Status group: 19, 22 and 28 on the sample), not a
--     count of lines;
--   * Total Guests was Arrive Today plus In House, leaving out the departing
--     (=DSum ... 'Arrive Today' + DSum ... 'In House': 47 on the sample).
-- One departure from Access, kept from 0013: a party moving rooms is counted
-- once, in the room it moves into. Access counted both rooms.
--
-- occupancy_status is unchanged: the housekeeping report still marks the rooms
-- Move In and Move Out, as Access's housekeeping report did.
-- =============================================================================

set search_path = ypl, public;

-- As 0030, with Move In and Move Out reported as In House, and the arrival time
-- on arriving stays only.
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
  select s.section,
         o.resnumber,
         o.guest_name,
         case when o.resarrivaldate::date = p_date
              then nullif(trim(coalesce(r.resarrivaltime, '')), '')
         end as arrival,
         o.occupancynumguests,
         o.room,
         o.occupancyin::date,
         o.occupancyout::date,
         nullif(trim(coalesce(o.occupancynotes, '')), '') as occupancy_notes
    from ypl.rooms_held(p_date) o
    join ypl.reservations r on r.reservationid = o.reservationid
    cross join lateral (
      select ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date) as status
    ) st
    cross join lateral (
      select case when st.status in ('Move In', 'Move Out') then 'In House' else st.status end as section
    ) s
   order by case s.section
              when 'Arrive Today' then 1
              when 'In House' then 2
              when 'Depart Today' then 3
            end,
            o.guestlastname,
            o.guestfirstname,
            o.occupancyin,
            o.roomorder nulls last;
$$;

comment on function ypl.report_in_house is
  'In House report for a day: each room held, by section (arriving, in house, departing; a room move is in house), with its occupancy notes. The arrival time shows on arriving stays only. The guest''s requests print on the Requests report, not here.';

-- The figures on the In House report's summary line, and the Total Guests the
-- housekeeping report ends on: the guests on each section's lines, and those
-- arriving plus those in house. The room a moving party leaves isn't added,
-- since they are counted in the room they move into.
create or replace function ypl.in_house_counts(p_date date)
returns table (
  arrive_today integer,
  depart_today integer,
  in_house integer,
  total_guests integer
)
language sql
stable
as $$
  with held as (
    select ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date) as status,
           coalesce(o.occupancynumguests, 0) as guests
      from ypl.rooms_held(p_date) o
  ), sums as (
    select coalesce(sum(guests) filter (where status = 'Arrive Today'), 0)::integer as arrive_today,
           coalesce(sum(guests) filter (where status = 'Depart Today'), 0)::integer as depart_today,
           coalesce(sum(guests) filter (where status in ('In House', 'Move In')), 0)::integer as in_house
      from held
  )
  select arrive_today, depart_today, in_house, arrive_today + in_house
    from sums;
$$;

comment on function ypl.in_house_counts is
  'Guests arriving, departing and in house on a day, as the In House report''s summary line prints them, and Total Guests (arriving plus in house, as Access''s In House and housekeeping reports counted it). A party moving rooms is counted once.';

grant execute on all functions in schema ypl to authenticated, service_role;
