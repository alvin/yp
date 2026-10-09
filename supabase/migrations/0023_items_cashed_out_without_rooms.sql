-- =============================================================================
-- 0023_items_cashed_out_without_rooms.sql
-- Items Cashed Out lists the items sold, not the room nights.
--
-- Access's appendix never listed rooms: qryReportItemCashedOut selects
-- tblTransaction.RoomID Is Null. Ours listed every charge the day's cash sheet
-- counts, room nights included, and the lodge asked for them to come off.
--
-- A line is left out by its daily cash category, Room, rather than by having a
-- room: the cash sheet totals its Room line by category, so the appendix and
-- the sheet's other sales lines stay equal line for line. The two differ on
-- three Access lines in all (two typed Room with no room, one liquor line
-- carrying a room).
-- =============================================================================

set search_path = ypl, public;

create or replace function ypl.report_items_cashed_out(p_date date)
returns table (
  inv_code varchar,
  resnumber integer,
  guestlastname varchar,
  guestfirstname varchar,
  item text,
  quantity integer,
  total numeric,
  gst numeric,
  pst numeric,
  hst numeric,
  dmt numeric,
  liquor numeric,
  room_tax numeric,
  hotel_tax numeric
)
language sql
stable
as $$
  select coalesce(inv.invcode, t.invcode),
         t.resnumber,
         g.guestlastname,
         g.guestfirstname,
         t.description,
         t.transquantity,
         t.transamount,
         t.transgstamount,
         t.transpstamount,
         t.transhstamount,
         t.transdmtamount,
         t.transltamount,
         t.transrtamount,
         t.transhtamount
    from ypl.charges_cashed_out(p_date) c
    join ypl.v_transaction_lines t on t.transactionid = c.transactionid
    join ypl.reservation_guests rg on rg.reservationguestid = t.reservationguestid
    join ypl.guests g on g.guestid = rg.guestid
    left join ypl.inventory_items inv on inv.inventoryid = t.inventoryid
   where c.transtype is distinct from 'Room'
   order by coalesce(inv.invcode, t.invcode), t.resnumber, t.transactionid;
$$;

comment on function ypl.report_items_cashed_out is
  'Items Cashed Out appendix: the charge lines the day''s cash sheet counts (charges_cashed_out), by item code. Room nights are left out, as in Access.';

grant execute on all functions in schema ypl to authenticated, service_role;
