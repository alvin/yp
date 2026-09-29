-- =============================================================================
-- 0015_room_rate_type.sql
-- A room night is priced at the rate type the desk chooses.
--
-- Every room carries three rates at once — Regular, Special and Split — and
-- Access made the clerk choose one for each room charge (frmChooseRoomRate →
-- qryMakeTableChooseRoomRate filters RoomRateType = the choice). The lookup
-- here ignored the type and took whichever current row was entered last, which
-- today is the Split rate for 58 of 64 rooms: a room night posted without a
-- typed price was charged at half the Regular rate.
--
-- The type is now part of the lookup, Regular unless another is chosen. The
-- date the rate is read on is unchanged and matches Access: the charge's own
-- date, one rate for every night on the line.
-- =============================================================================

set search_path = ypl, public;

drop function if exists ypl.effective_room_rate(integer, date);
create function ypl.effective_room_rate(
  p_roomid integer,
  p_date date,
  p_ratetype text default 'Regular'
) returns numeric
language sql
stable
as $$
  select r.roomrate::numeric
    from ypl.room_rates r
   where r.roomid = p_roomid
     and r.roomratetype = coalesce(p_ratetype, 'Regular')
     and not r.roomratearchive
     and p_date between r.roomratestartdate::date and r.roomrateenddate::date
   order by r.roomratestartdate desc, r.roomrateid desc
   limit 1;
$$;

comment on function ypl.effective_room_rate is
  'Nightly rate of a room on a date for a rate type (Regular, Special or Split; Regular when not given), from ypl.room_rates. Null when no rate row covers the date.';

drop function if exists ypl.post_room_nights(integer, integer, date, date, numeric, date, text);
create function ypl.post_room_nights(
  p_reservationguestid integer,
  p_roomid integer,
  p_occupancyin date,
  p_occupancyout date,
  p_rate numeric default null,
  p_transdate date default current_date,
  p_notes text default null,
  p_ratetype text default 'Regular'
) returns integer
language plpgsql
volatile
as $$
declare
  v_nights integer;
  v_rate numeric;
  v_transactionid integer;
begin
  v_nights := p_occupancyout - p_occupancyin;
  if v_nights <= 0 then
    raise exception 'Room-night charge needs at least one night (in %, out %)', p_occupancyin, p_occupancyout;
  end if;
  v_rate := coalesce(p_rate, ypl.effective_room_rate(p_roomid, p_transdate, p_ratetype));
  if v_rate is null then
    raise exception 'No current % rate found for room % — supply a rate', coalesce(p_ratetype, 'Regular'), p_roomid;
  end if;

  insert into ypl.transactions (
    reservationguestid, transdate, transtype, roomid, transquantity,
    transamount, transnotes, transarchive, occupancyin, occupancyout
  ) values (
    p_reservationguestid, coalesce(p_transdate, current_date), 'Room', p_roomid, v_nights,
    round(v_rate * v_nights, 2), p_notes, false, p_occupancyin, p_occupancyout
  )
  returning transactionid into v_transactionid;
  return v_transactionid;
end;
$$;

comment on function ypl.post_room_nights is
  'Posts a room-night charge line (nights × the rate of the chosen type on the charge date) with the occupancy window; taxes fill in from the room''s tax flags automatically.';

grant execute on all functions in schema ypl to authenticated, service_role;
