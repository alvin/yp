-- =============================================================================
-- 0017_no_charge_notes.sql
-- Charge lines carry no notes.
--
-- The Add charge dialog had a Notes box because the Access charges table had a
-- notes column. Nobody asked for it: Access never printed it (its bill line is
-- the item description, or the room's name and number), and staff used it once
-- in 55,760 charges. Here a room charge's note printed on the bill in place of
-- "Room", and an item with no description showed its note instead. The box,
-- the parameters that wrote it and every description that read it are gone.
--
-- ypl.transactions.transnotes stays as a column: the table mirrors Access's
-- tblTransaction for the lossless import, and it holds that one legacy note.
-- Nothing reads or writes it.
-- =============================================================================

set search_path = ypl, public;

-- A line's description is its item's description, or its charge type ("Room"
-- for a room night) — never a note. transnotes leaves the view.
drop view if exists ypl.v_transaction_lines;
create view ypl.v_transaction_lines as
select
  t.transactionid,
  t.reservationguestid,
  rg.reservationid,
  r.resnumber,
  t.transdate,
  t.transtype,
  t.inventoryid,
  inv.invcode,
  coalesce(inv.invitemdescription, t.transtype) as description,
  t.roomid,
  ypl.room_display(room.roomname, room.roomnumber) as room,
  t.transquantity,
  t.transamount,
  t.transgstamount,
  t.transpstamount,
  t.transhstamount,
  t.transltamount,
  t.transrtamount,
  t.transhtamount,
  t.transdmtamount,
  ypl.transaction_tax_total(t.transgstamount, t.transpstamount, t.transhstamount,
                            t.transltamount, t.transrtamount, t.transhtamount, t.transdmtamount) as tax_total,
  ypl.transaction_total(t.transamount, t.transgstamount, t.transpstamount, t.transhstamount,
                        t.transltamount, t.transrtamount, t.transhtamount, t.transdmtamount) as line_total,
  t.transarchive,
  t.occupancyin,
  t.occupancyout,
  room.roomname,
  room.roomnumber
from ypl.transactions t
join ypl.reservation_guests rg on rg.reservationguestid = t.reservationguestid
join ypl.reservations r on r.reservationid = rg.reservationid
left join ypl.inventory_items inv on inv.inventoryid = t.inventoryid
left join ypl.rooms room on room.roomid = t.roomid;

comment on view ypl.v_transaction_lines is
  'Charge lines with their item or room, taxes and totals. The description is the item''s description, or the charge type for a room night.';

drop function if exists ypl.post_room_nights(integer, integer, date, date, numeric, date, text, text);
create function ypl.post_room_nights(
  p_reservationguestid integer,
  p_roomid integer,
  p_occupancyin date,
  p_occupancyout date,
  p_rate numeric default null,
  p_transdate date default current_date,
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
    transamount, transarchive, occupancyin, occupancyout
  ) values (
    p_reservationguestid, coalesce(p_transdate, current_date), 'Room', p_roomid, v_nights,
    round(v_rate * v_nights, 2), false, p_occupancyin, p_occupancyout
  )
  returning transactionid into v_transactionid;
  return v_transactionid;
end;
$$;

comment on function ypl.post_room_nights is
  'Posts a room-night charge line (nights × the rate of the chosen type on the charge date) with the occupancy window; taxes fill in from the room''s tax flags automatically.';

drop function if exists ypl.post_charge(integer, integer, integer, date, numeric, text, text);
create function ypl.post_charge(
  p_reservationguestid integer,
  p_inventoryid integer,
  p_quantity integer default 1,
  p_transdate date default current_date,
  p_amount numeric default null,
  p_transtype text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_type text;
  v_transactionid integer;
begin
  select coalesce(p_transtype, ypl.charge_category(i.invtype))
    into v_type
    from ypl.inventory_items i
   where i.inventoryid = p_inventoryid;
  if v_type is null then
    raise exception 'Inventory item % not found', p_inventoryid;
  end if;

  insert into ypl.transactions (
    reservationguestid, transdate, transtype, inventoryid, transquantity,
    transamount, transarchive
  ) values (
    p_reservationguestid, coalesce(p_transdate, current_date), v_type, p_inventoryid,
    coalesce(p_quantity, 1), p_amount, false
  )
  returning transactionid into v_transactionid;
  return v_transactionid;
end;
$$;

comment on function ypl.post_charge is
  'Posts a charge for a price-list item; the amount defaults to the list price × quantity and the daily cash category to the item''s (charge_category) unless given.';

drop function if exists ypl.sell_gift_certificate(integer, numeric, text, date, text);
create function ypl.sell_gift_certificate(
  p_reservationguestid integer,
  p_amount numeric,
  p_paymenttype text,
  p_date date default current_date
) returns integer
language plpgsql
volatile
as $$
declare
  v_inventoryid integer;
  v_transactionid integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Gift certificate amount must be positive';
  end if;

  select i.inventoryid into v_inventoryid
    from ypl.inventory_items i
   where not i.invarchive
     and (i.invtype = 'Gift Certificate' or i.invitemdescription ilike '%gift%certificate%')
   order by i.inventoryid
   limit 1;

  -- Charge side: the sale feeds the DCAR upper section as charge activity.
  insert into ypl.transactions (
    reservationguestid, transdate, transtype, inventoryid, transquantity,
    transamount, transarchive
  ) values (
    p_reservationguestid, coalesce(p_date, current_date), 'Gift Certificate', v_inventoryid, 1,
    round(p_amount, 2), false
  )
  returning transactionid into v_transactionid;

  -- Receipt side: the money taken for it lands in the day's cash by type.
  perform ypl.record_payment(
    p_reservationguestid, 'Payment (Regular)', p_paymenttype, p_amount,
    'Canadian', coalesce(p_date, current_date), 'Gift certificate');

  return v_transactionid;
end;
$$;

grant execute on all functions in schema ypl to authenticated, service_role;
