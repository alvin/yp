-- =============================================================================
-- 0025_party_size.sql
-- The number of guests on a reservation can be changed after booking, and the
-- rooms the party is in follow it.
--
-- The daily reports count a stay's guests room by room: Housekeeping and In
-- House print each room's count, Total Guests adds them up, and the guest
-- documents print the first room's. A new number on the reservation alone
-- would change nothing the kitchen or housekeeping read, so a room the whole
-- party is in takes the new number with it. That is a room no other room of
-- the stay holds on any of its nights, which includes each room of a move.
-- Rooms held side by side split the party in a way the reservation doesn't
-- record, so they keep their own counts, and the desk sets them room by room.
--
-- Access kept the two numbers apart: NumAdults on the reservation and
-- OccupancyNumGuests on each room were typed separately, and on about one
-- single-room stay in eleven they disagree. Setting the number brings such a
-- stay's room into line. The rooms Access left with no count keep none until
-- one is set.
-- =============================================================================

set search_path = ypl, public;

create or replace function ypl.reservations_sync_room_guests()
returns trigger
language plpgsql
as $$
declare
  v_party integer := new.numadults + coalesce(new.numchildren, 0);
begin
  if new.numadults < 0 or coalesce(new.numchildren, 0) < 0 or v_party < 1 then
    raise exception 'A reservation holds at least one guest';
  end if;

  update ypl.room_assignments ra
     set occupancynumguests = v_party
    from ypl.reservation_guests rg
   where rg.reservationguestid = ra.reservationguestid
     and rg.reservationid = new.reservationid
     and not rg.rgarchive
     and not ra.occupancyarchive
     and ra.occupancynumguests is distinct from v_party
     and not exists (
       select 1
         from ypl.room_assignments other
         join ypl.reservation_guests org on org.reservationguestid = other.reservationguestid
        where org.reservationid = new.reservationid
          and not org.rgarchive
          and not other.occupancyarchive
          and other.occupancyid <> ra.occupancyid
          and other.occupancyin::date < ra.occupancyout::date
          and ra.occupancyin::date < other.occupancyout::date
     );
  return null;
end;
$$;

comment on function ypl.reservations_sync_room_guests is
  'When the number of guests on a reservation changes, every room the whole party is in (no other room of the stay shares any of its nights) takes the new number. Rooms held side by side keep their own. A reservation holds at least one guest.';

drop trigger if exists reservations_sync_room_guests on ypl.reservations;
create trigger reservations_sync_room_guests
  after update of numadults, numchildren on ypl.reservations
  for each row
  when (old.numadults is distinct from new.numadults
        or old.numchildren is distinct from new.numchildren)
  execute function ypl.reservations_sync_room_guests();

-- A room holds at least one guest. Checked when a count is written, so a room
-- Access left with no count loads, and stays, as it was.
create or replace function ypl.room_assignments_guest_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.occupancynumguests is not distinct from old.occupancynumguests then
    return new;
  end if;
  if new.occupancynumguests < 1 then
    raise exception 'A room holds at least one guest';
  end if;
  return new;
end;
$$;

drop trigger if exists room_assignments_guest_count on ypl.room_assignments;
create trigger room_assignments_guest_count
  before insert or update of occupancynumguests on ypl.room_assignments
  for each row
  when (new.occupancynumguests is not null)
  execute function ypl.room_assignments_guest_count();

grant execute on all functions in schema ypl to authenticated, service_role;
