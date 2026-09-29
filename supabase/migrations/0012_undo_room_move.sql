-- =============================================================================
-- 0012_undo_room_move.sql
-- A room move can be undone. The lodge books moves ahead of time and watches
-- for cancellations so the party doesn't have to move; when a room frees up,
-- the move comes off and the stay keeps the room it was leaving.
--
-- record_room_move (0005) writes a move as two windows: the room being left is
-- cut short at the move date and the room being entered opens there. There is
-- no link between them, so a move is recognised the way the stay history reads
-- it — a window that opens, for the same guest on the stay, in a different room
-- on the day another window closes. A party in two rooms that both move on one
-- day has two windows closing that day; the desk says which one the stay goes
-- back to.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Which windows of a stay are moves, and the room each was a move from
-- -----------------------------------------------------------------------------

create or replace function ypl.room_moves(p_reservationid integer)
returns table (
  occupancyid integer,
  from_occupancyid integer
)
language sql
stable
as $$
  select n.occupancyid, p.occupancyid
    from ypl.room_assignments n
    join ypl.reservation_guests rg on rg.reservationguestid = n.reservationguestid
    join ypl.room_assignments p
      on p.reservationguestid = n.reservationguestid
     and p.occupancyid <> n.occupancyid
     and p.roomid <> n.roomid
     and p.occupancyout::date = n.occupancyin::date
     and not p.occupancyarchive
   where rg.reservationid = p_reservationid
     and not rg.rgarchive
     and not n.occupancyarchive
   order by n.occupancyid, p.occupancyid;
$$;

comment on function ypl.room_moves is
  'The room windows of a stay that are moves, each with the window it moved from (same guest, another room, closing the day this one opens). A window with two rows is one of two rooms that moved on the same day.';

-- -----------------------------------------------------------------------------
-- Undoing a move
-- -----------------------------------------------------------------------------

create or replace function ypl.undo_room_move(
  p_occupancyid integer,
  p_from_occupancyid integer default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_move ypl.room_assignments;
  v_from integer;
  v_candidates integer;
  v_back ypl.room_assignments;
begin
  select * into v_move
    from ypl.room_assignments o
   where o.occupancyid = p_occupancyid and not o.occupancyarchive
     for update;
  if not found then
    raise exception 'Room move % not found', p_occupancyid;
  end if;

  select count(*), min(m.from_occupancyid) filter (
           where p_from_occupancyid is null or m.from_occupancyid = p_from_occupancyid)
    into v_candidates, v_from
    from ypl.reservation_guests rg,
         lateral ypl.room_moves(rg.reservationid) m
   where rg.reservationguestid = v_move.reservationguestid
     and m.occupancyid = p_occupancyid;

  if v_candidates = 0 then
    raise exception 'This room is not a move from another room';
  end if;
  if p_from_occupancyid is not null and v_from is null then
    raise exception 'Room % is not the room this move was from', p_from_occupancyid;
  end if;
  if p_from_occupancyid is null and v_candidates > 1 then
    raise exception 'Two rooms moved that day — choose the one the stay goes back to';
  end if;

  -- The room being left runs on to where the move ran, and the move comes off.
  -- Archived, not deleted, like a charge removed in error.
  update ypl.room_assignments o
     set occupancyout = v_move.occupancyout
   where o.occupancyid = v_from;
  update ypl.room_assignments o
     set occupancyarchive = true
   where o.occupancyid = p_occupancyid;

  -- A stay that moved out and back (A → B → A) is in one room again: join the
  -- window it came back to onto the one it never left.
  select * into v_back from ypl.room_assignments o where o.occupancyid = v_from;
  update ypl.room_assignments o
     set occupancyarchive = true
   where o.reservationguestid = v_back.reservationguestid
     and o.roomid = v_back.roomid
     and o.occupancyin::date = v_back.occupancyout::date
     and o.occupancyid <> v_from
     and not o.occupancyarchive
  returning o.occupancyout into v_move.occupancyout;
  if found then
    update ypl.room_assignments o
       set occupancyout = v_move.occupancyout
     where o.occupancyid = v_from;
  end if;

  return v_from;
end;
$$;

comment on function ypl.undo_room_move is
  'Undoes a room move: the room being left runs on to the end of the move and the moved-to window is archived. Pass p_from_occupancyid when two rooms moved on the same day. Returns the room window the stay keeps. Charges already posted stay as posted.';

grant execute on all functions in schema ypl to authenticated, service_role;
