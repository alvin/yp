-- =============================================================================
-- 0019_move_on_the_check_out_date.sql
-- A move can fall on the stay's check-out date. A guest who would stay longer
-- if another room is free, but has to leave theirs, moves on the morning they
-- were due to go: the stay runs on in the new room to a new departure.
--
-- record_room_move (0005) took a move date strictly inside the room being
-- left. The check-out date is now allowed too, for the room that runs to the
-- end of the stay. The stay's departure moves to p_out (one night on when not
-- given); the guests leaving with the stay follow it, as they do when the
-- dates are changed. Only the new room covers the added nights — any other
-- room the party holds still ends on the old date.
-- =============================================================================

set search_path = ypl, public;

drop function if exists ypl.record_room_move(integer, integer, date, text);

create or replace function ypl.record_room_move(
  p_occupancyid integer,
  p_new_roomid integer,
  p_move_date date,
  p_notes text default null,
  p_out date default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_old ypl.room_assignments;
  v_res ypl.reservations;
  v_out date;
  v_ending integer[];
  v_new_id integer;
begin
  select * into v_old from ypl.room_assignments o where o.occupancyid = p_occupancyid;
  if not found then
    raise exception 'Room assignment % not found', p_occupancyid;
  end if;
  select r.* into v_res
    from ypl.reservation_guests rg
    join ypl.reservations r on r.reservationid = rg.reservationid
   where rg.reservationguestid = v_old.reservationguestid;
  if p_new_roomid = v_old.roomid then
    raise exception 'The new room must differ from the current room';
  end if;

  if p_move_date = v_old.occupancyout::date
     and v_old.occupancyout::date = v_res.resdeparturedate::date then
    -- On the check-out date: the stay runs on to the new departure. Rooms
    -- ending with the old stay would follow it there, so they are held back
    -- to the old date; the new room alone covers the added nights.
    v_out := coalesce(p_out, p_move_date + 1);
    if v_out <= p_move_date then
      raise exception 'Departure % must be after the move date %', v_out, p_move_date;
    end if;
    select array_agg(ra.occupancyid) into v_ending
      from ypl.room_assignments ra
      join ypl.reservation_guests rg on rg.reservationguestid = ra.reservationguestid
     where rg.reservationid = v_res.reservationid
       and not ra.occupancyarchive
       and ra.occupancyout::date = p_move_date;
    update ypl.reservations r
       set resdeparturedate = v_out
     where r.reservationid = v_res.reservationid;
    update ypl.room_assignments ra
       set occupancyout = p_move_date
     where ra.occupancyid = any (v_ending);
  else
    if p_move_date <= v_old.occupancyin::date or p_move_date >= v_old.occupancyout::date then
      raise exception 'Move date % must fall inside the current occupancy (% to %)',
        p_move_date, v_old.occupancyin::date, v_old.occupancyout::date;
    end if;
    if p_out is not null then
      raise exception 'A departure is given only for a move on the check-out date';
    end if;
    v_out := v_old.occupancyout::date;
  end if;

  -- Close the room being left on the move date and open the room being entered,
  -- so both rooms stay visible in the stay history with their move dates.
  update ypl.room_assignments o
     set occupancyout = p_move_date
   where o.occupancyid = p_occupancyid;

  insert into ypl.room_assignments (
    reservationguestid, roomid, occupancyin, occupancyout,
    occupancynumguests, occupancynotes, occupancyarchive
  ) values (
    v_old.reservationguestid, p_new_roomid, p_move_date, v_out,
    v_old.occupancynumguests, p_notes, false
  )
  returning occupancyid into v_new_id;
  return v_new_id;
end;
$$;

comment on function ypl.record_room_move is
  'Records a room move: shortens the current occupancy at the move date and opens the new room for the remainder, preserving both rooms in the occupancy history. A move on the stay''s check-out date extends the stay to p_out (default one night) in the new room only.';

grant execute on all functions in schema ypl to authenticated, service_role;
