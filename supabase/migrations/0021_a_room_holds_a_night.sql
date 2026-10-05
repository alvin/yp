-- =============================================================================
-- 0021_a_room_holds_a_night.sql
-- A room on a stay is held for at least one night.
--
-- Nothing enforced it, and five live rooms opened and closed on the same day,
-- all written by this app (Access has none). Rooms held on a day
-- (rooms_held, 0014) counts the day a room is left, so each showed up on that
-- day's reports as a room arriving and leaving. Two ways in:
--
--  * Change dates shortening a stay that moves rooms on the last morning: the
--    room moved into ended with the stay and was cut back to the day it opened
--    (reservations_sync_room_dates, 0008). Arriving later onto the day of a
--    move did the same to the room being left.
--  * Rooms written with no nights directly — by Add another room, which let
--    Out equal In, or by update_room_assignment.
--
-- Now: changing the stay dates takes off (archives, as undoing a move does) any
-- room the new dates leave with no nights, and no live room can be written
-- with none. The five already on file are archived.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- The rooms already on file with no nights
-- -----------------------------------------------------------------------------

update ypl.room_assignments
   set occupancyarchive = true
 where not occupancyarchive
   and occupancyout::date = occupancyin::date;

-- -----------------------------------------------------------------------------
-- Changing the stay dates
-- -----------------------------------------------------------------------------

create or replace function ypl.reservations_sync_room_dates()
returns trigger
language plpgsql
as $$
begin
  -- A room the new dates would leave with no nights comes off the stay: the
  -- room moved into on the last morning when the stay now ends that day, or
  -- the room being left when the stay now arrives on the day of the move.
  update ypl.room_assignments ra
     set occupancyarchive = true
    from ypl.reservation_guests rg
   where rg.reservationguestid = ra.reservationguestid
     and rg.reservationid = new.reservationid
     and not rg.rgarchive
     and not ra.occupancyarchive
     and ((ra.occupancyout::date = old.resdeparturedate::date
           and ra.occupancyin::date <> old.resarrivaldate::date
           and ra.occupancyin::date = new.resdeparturedate::date)
       or (ra.occupancyin::date = old.resarrivaldate::date
           and ra.occupancyout::date <> old.resdeparturedate::date
           and ra.occupancyout::date = new.resarrivaldate::date));

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

comment on function ypl.reservations_sync_room_dates is
  'Keeps room assignments aligned when a stay is extended or shortened. Only occupancy windows that ran to the reservation''s own dates move; mid-stay room-move windows are left alone. A window the new dates would leave with no nights is archived.';

-- -----------------------------------------------------------------------------
-- Every live room holds a night
-- -----------------------------------------------------------------------------

create or replace function ypl.room_assignments_hold_a_night()
returns trigger
language plpgsql
as $$
begin
  if not new.occupancyarchive and new.occupancyout::date <= new.occupancyin::date then
    raise exception 'A room must be held for at least one night (% to %)',
      new.occupancyin::date, new.occupancyout::date;
  end if;
  return new;
end;
$$;

drop trigger if exists room_assignments_hold_a_night on ypl.room_assignments;
create trigger room_assignments_hold_a_night
  before insert or update on ypl.room_assignments
  for each row execute function ypl.room_assignments_hold_a_night();

comment on function ypl.room_assignments_hold_a_night is
  'A live room window runs at least one night: its out date is after its in date. Removed (archived) windows are not checked.';

grant execute on all functions in schema ypl to authenticated, service_role;
