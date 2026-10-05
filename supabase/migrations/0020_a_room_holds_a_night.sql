-- =============================================================================
-- 0020_a_room_holds_a_night.sql
-- A room on a stay is held for at least one night.
--
-- Rooms held on a day (rooms_held, 0014) counts the day a room is left, so a
-- room opening and closing on the same day shows on that day's reports as
-- arriving and leaving. Changing the stay dates could leave one (the room moved
-- into on the last morning, when the stay now ends that day), and nothing
-- stopped one being written directly.
--
-- Changing the stay dates now deletes a room it leaves with no nights, and no
-- live room can be written with none.
-- =============================================================================

set search_path = ypl, public;

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
  delete from ypl.room_assignments ra
   using ypl.reservation_guests rg
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
  'Keeps room assignments aligned when a stay is extended or shortened. Only occupancy windows that ran to the reservation''s own dates move; mid-stay room-move windows are left alone. A window the new dates would leave with no nights is deleted.';

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
