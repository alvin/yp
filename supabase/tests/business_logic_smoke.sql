-- =============================================================================
-- business_logic_smoke.sql
-- End-to-end smoke test of the ypl business-logic layer (migration 0005).
-- Run against a database with migrations 0001–0005 and seed.sql applied:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/business_logic_smoke.sql
-- Everything runs in one transaction and rolls back — no data is left behind.
-- =============================================================================

begin;
set search_path = ypl, public;

do $$
declare
  v_guestid integer;
  v_guestid2 integer;
  v_res record;
  v_res2 record;
  v_rgid2 integer;
  v_txid integer;
  v_payid integer;
  v_occ integer;
  v_occ2 integer;
  v_tx ypl.transactions;
  v_pay ypl.payments;
  v_r ypl.reservations;
  v_num numeric;
  v_int integer;
  v_count integer;
  v_upper numeric;
  v_lower numeric;
  v_roomid integer;
  v_invid integer;
  v_rate numeric;
begin
  ------------------------------------------------------------------
  -- Reference data sanity
  ------------------------------------------------------------------
  select roomid into v_roomid from ypl.rooms where not roomarchive order by roomorder limit 1;
  assert v_roomid is not null, 'seed rooms missing';
  select inventoryid into v_invid from ypl.inventory_items
   where not invarchive and invamount > 0 and invgst order by inventoryid limit 1;
  assert v_invid is not null, 'seed inventory missing';
  assert ypl.effective_tax_rate('GST', current_date) > 0, 'GST rate missing for today';

  ------------------------------------------------------------------
  -- Guest + reservation creation
  ------------------------------------------------------------------
  v_guestid := ypl.create_guest('SMOKE-TEST', 'Casey', p_city => 'Ladysmith', p_region => 'BC');
  assert v_guestid is not null, 'create_guest failed';

  select * into v_res from ypl.create_reservation(
    v_guestid, current_date, current_date + 3, 'st',
    p_numadults => 2, p_numchildren => 1, p_roomid => v_roomid, p_numguests => 3);
  assert v_res.resnumber is not null and v_res.resnumber > 0, 'resnumber not assigned';
  assert v_res.reservationguestid is not null, 'primary reservation guest missing';

  select * into v_r from ypl.reservations where reservationid = v_res.reservationid;
  assert v_r.numnights = 3, format('numnights expected 3, got %s', v_r.numnights);
  assert v_r.resbookedby = 'ST', 'bookedby not upcased';
  assert v_r.resbookingdate::date = current_date, 'booking date default missing';

  -- One-year horizon enforced
  begin
    perform ypl.create_reservation(v_guestid, current_date + 400, current_date + 403, 'ST');
    raise exception 'horizon check failed to raise';
  exception when others then
    if sqlerrm = 'horizon check failed to raise' then raise; end if;
  end;

  -- Departure before arrival rejected
  begin
    perform ypl.create_reservation(v_guestid, current_date + 5, current_date + 5, 'ST');
    raise exception 'date-order check failed to raise';
  exception when others then
    if sqlerrm = 'date-order check failed to raise' then raise; end if;
  end;

  ------------------------------------------------------------------
  -- Single primary guest + defaults from reservation
  ------------------------------------------------------------------
  v_guestid2 := ypl.create_guest('SMOKE-TEST-TWO', 'Jordan');
  v_rgid2 := ypl.add_reservation_guest(v_res.reservationid, v_guestid2, p_primaryguest => true);
  assert (select count(*) from ypl.reservation_guests
           where reservationid = v_res.reservationid and primaryguest and not rgarchive) = 1,
    'more than one primary guest';
  assert (select checkindate::date from ypl.reservation_guests where reservationguestid = v_rgid2)
         = current_date, 'rg check-in default not taken from reservation';

  ------------------------------------------------------------------
  -- Room-night charge: amount + taxes computed by the database
  ------------------------------------------------------------------
  v_txid := ypl.post_room_nights(v_res.reservationguestid, v_roomid,
              current_date, current_date + 3, p_rate => 200, p_transdate => current_date);
  select * into v_tx from ypl.transactions where transactionid = v_txid;
  assert v_tx.transamount = 600.00, format('room amount expected 600, got %s', v_tx.transamount);
  assert v_tx.transquantity = 3, 'room nights quantity wrong';
  -- Tax amounts follow the room flags × current rates
  select case when r.roomgst then round(600 * ypl.effective_tax_rate('GST', current_date), 2) else 0 end
    into v_num from ypl.rooms r where r.roomid = v_roomid;
  assert v_tx.transgstamount = v_num, format('room GST expected %s, got %s', v_num, v_tx.transgstamount);
  select case when r.roomrt then round(600 * ypl.effective_tax_rate('Room', current_date), 2) else 0 end
    into v_num from ypl.rooms r where r.roomid = v_roomid;
  assert v_tx.transrtamount = v_num, 'room tax mismatch';

  ------------------------------------------------------------------
  -- Inventory charge: list price default + manual override respected
  ------------------------------------------------------------------
  v_txid := ypl.post_charge(v_res.reservationguestid, v_invid, p_quantity => 2, p_transdate => current_date);
  select * into v_tx from ypl.transactions where transactionid = v_txid;
  select round(coalesce(invamount, 0) * 2, 2) into v_num from ypl.inventory_items where inventoryid = v_invid;
  assert v_tx.transamount = v_num, format('inventory default price expected %s, got %s', v_num, v_tx.transamount);

  v_txid := ypl.post_charge(v_res.reservationguestid, v_invid, p_quantity => 1,
              p_transdate => current_date, p_amount => 123.45);
  select * into v_tx from ypl.transactions where transactionid = v_txid;
  assert v_tx.transamount = 123.45, 'price override not respected';
  assert v_tx.transgstamount = round(123.45 * ypl.effective_tax_rate('GST', current_date), 2),
    'override taxes not computed';

  ------------------------------------------------------------------
  -- Table-editor path: raw insert/update stays consistent via triggers
  ------------------------------------------------------------------
  insert into ypl.transactions (reservationguestid, transdate, transtype, inventoryid, transquantity)
  values (v_res.reservationguestid, current_date, 'Sundries', v_invid, 1)
  returning transactionid into v_txid;
  select * into v_tx from ypl.transactions where transactionid = v_txid;
  assert v_tx.transamount is not null and v_tx.transamount > 0, 'raw insert did not auto-complete amount';
  assert v_tx.transgstamount is not null, 'raw insert did not compute taxes';

  update ypl.transactions set transamount = 100 where transactionid = v_txid;
  select * into v_tx from ypl.transactions where transactionid = v_txid;
  assert v_tx.transgstamount = round(100 * ypl.effective_tax_rate('GST', current_date), 2),
    'taxes not recomputed after amount edit';

  ------------------------------------------------------------------
  -- Payments: code + CDN conversion + refund sign
  ------------------------------------------------------------------
  v_payid := ypl.record_payment(v_res.reservationguestid, 'Deposit (Received)', 'Visa', 400);
  select * into v_pay from ypl.payments where paymentid = v_payid;
  assert v_pay.paymentcode = 'D01', format('payment code expected D01, got %s', v_pay.paymentcode);
  assert v_pay.paymentamountcdn = 400.00, 'CDN copy for Canadian payment wrong';

  v_payid := ypl.record_payment(v_res.reservationguestid, 'Payment (Regular)', 'U.S. Cash', 100, 'US');
  select * into v_pay from ypl.payments where paymentid = v_payid;
  v_rate := ypl.effective_exchange_rate(current_date);
  assert v_pay.paymentamountcdn = round(100 * v_rate, 2),
    format('US conversion expected %s, got %s', round(100 * v_rate, 2), v_pay.paymentamountcdn);

  v_payid := ypl.record_payment(v_res.reservationguestid, 'Deposit (Refund)', 'Visa', 50);
  select * into v_pay from ypl.payments where paymentid = v_payid;
  assert v_pay.paymentamount = -50.00, 'refund not stored negative';

  -- Raw insert path fills code/date/cdn too
  insert into ypl.payments (reservationguestid, paymentcategory, paymenttype, paymentamount, paymentcurrency)
  values (v_res.reservationguestid, 'Gratuity', 'Cash', 25, 'Canadian')
  returning paymentid into v_payid;
  select * into v_pay from ypl.payments where paymentid = v_payid;
  assert v_pay.paymentcode = 'G01' and v_pay.paymentdate::date = current_date
         and v_pay.paymentamountcdn = 25.00, 'raw payment insert not normalized';

  ------------------------------------------------------------------
  -- Ledger + balance agree
  ------------------------------------------------------------------
  v_num := ypl.reservation_balance(v_res.reservationid);
  select round(coalesce(sum(ypl.transaction_total(transamount, transgstamount, transpstamount,
           transhstamount, transltamount, transrtamount, transhtamount, transdmtamount)), 0)
       - (select coalesce(sum(ypl.money_amount(paymentamountcdn, paymentamount)), 0)
            from ypl.payments p join ypl.reservation_guests rg using (reservationguestid)
           where rg.reservationid = v_res.reservationid and not p.paymentarchive), 2)
    into v_rate
    from ypl.transactions t join ypl.reservation_guests rg using (reservationguestid)
   where rg.reservationid = v_res.reservationid and not t.transarchive;
  assert v_num = v_rate, format('balance mismatch: %s vs %s', v_num, v_rate);
  assert (select count(*) from ypl.reservation_ledger(v_res.reservationid)) > 0, 'ledger empty';

  ------------------------------------------------------------------
  -- Room move: history preserved, dates split
  ------------------------------------------------------------------
  select occupancyid into v_occ from ypl.room_assignments o
    join ypl.reservation_guests rg using (reservationguestid)
   where rg.reservationid = v_res.reservationid limit 1;
  select roomid into v_int from ypl.rooms where roomid <> v_roomid and not roomarchive limit 1;
  v_occ2 := ypl.record_room_move(v_occ, v_int, current_date + 1, 'Smoke move');
  assert (select occupancyout::date from ypl.room_assignments where occupancyid = v_occ) = current_date + 1,
    'old occupancy not closed at move date';
  assert (select occupancyin::date from ypl.room_assignments where occupancyid = v_occ2) = current_date + 1,
    'new occupancy not opened at move date';

  ------------------------------------------------------------------
  -- DCAR balances: upper total equals receipts when the day is self-contained
  ------------------------------------------------------------------
  v_upper := ypl.report_dcar_total(current_date);
  v_lower := ypl.report_dcar_receipts_total(current_date);
  -- The day so far: charges+taxes and payments recorded above. Settle the
  -- difference with a regular payment, then the two sections must balance.
  v_payid := ypl.record_payment(v_res.reservationguestid, 'Payment (Regular)', 'Cash', v_upper - v_lower);
  assert ypl.report_dcar_total(current_date) = ypl.report_dcar_receipts_total(current_date),
    'DCAR upper and lower sections do not balance';

  ------------------------------------------------------------------
  -- Cancellation with deposit refund
  ------------------------------------------------------------------
  select * into v_res2 from ypl.create_reservation(v_guestid, current_date + 10, current_date + 12, 'ST');
  perform ypl.record_payment(v_res2.reservationguestid, 'Deposit (Received)', 'Visa', 150);
  perform ypl.cancel_reservation(v_res2.reservationid, current_date, 'refund', 'Smoke cancellation');
  select * into v_r from ypl.reservations where reservationid = v_res2.reservationid;
  assert v_r.rescancelled and v_r.resdatecancelled::date = current_date, 'cancel flags not set';
  select count(*) into v_count from ypl.payments p
   where p.reservationguestid = v_res2.reservationguestid
     and p.paymentcategory = 'Deposit (Refund)' and p.paymentamount = -150.00;
  assert v_count = 1, 'deposit refund row missing';
  assert ypl.reservationguest_deposit_held(v_res2.reservationguestid) = 0, 'deposit still held after refund';
  assert (select count(*) from ypl.report_cancellation_list(current_date)) >= 1, 'cancellation list empty';

  ------------------------------------------------------------------
  -- Re-book with deposit transfer
  ------------------------------------------------------------------
  select * into v_res2 from ypl.create_reservation(v_guestid, current_date + 20, current_date + 22, 'ST');
  perform ypl.record_payment(v_res2.reservationguestid, 'Deposit (Received)', 'Visa', 200);
  select * into v_r from ypl.reservations where reservationid = v_res2.reservationid;
  declare
    v_new record;
  begin
    select * into v_new from ypl.rebook_reservation(v_res2.reservationid, current_date + 30, current_date + 33, 'ST');
    assert v_new.resnumber <> v_r.resnumber, 'rebook did not create a new reservation';
    assert (select rescancelled from ypl.reservations where reservationid = v_res2.reservationid),
      'original not cancelled on rebook';
    -- Deposit moved: old guest holds 0, new reservation holds 200
    assert ypl.reservationguest_deposit_held(v_res2.reservationguestid) = 0, 'deposit not moved off original';
    select coalesce(sum(ypl.reservationguest_deposit_held(rg.reservationguestid)), 0) into v_num
      from ypl.reservation_guests rg where rg.reservationid = v_new.reservationid and not rg.rgarchive;
    assert v_num = 200.00, format('transferred deposit expected 200, got %s', v_num);
    assert (select numnights from ypl.reservations where reservationid = v_new.reservationid) = 3,
      'rebooked nights wrong';
  end;

  ------------------------------------------------------------------
  -- Gift certificate: charge side + receipt side
  ------------------------------------------------------------------
  v_txid := ypl.sell_gift_certificate(v_res.reservationguestid, 300, 'Visa');
  select * into v_tx from ypl.transactions where transactionid = v_txid;
  assert v_tx.transtype = 'Gift Certificate' and v_tx.transamount = 300.00, 'gift certificate charge wrong';
  select count(*) into v_count from ypl.payments
   where reservationguestid = v_res.reservationguestid
     and paymentnotes = 'Gift certificate' and paymentamount = 300.00;
  assert v_count = 1, 'gift certificate receipt missing';

  ------------------------------------------------------------------
  -- Notes
  ------------------------------------------------------------------
  perform ypl.add_housekeeping_note(v_res.reservationguestid, 'Twin beds needed');
  perform ypl.save_kitchen_meal(v_guestid, 'Vegetarian', 'No mushrooms');
  perform ypl.set_reservation_notes(v_res.reservationid, 'Anniversary stay');
  perform ypl.set_guest_notes(v_guestid, 'Office-only note');
  assert (select count(*) from ypl.report_housekeeping(current_date)) >= 1, 'housekeeping report empty';
  assert (select count(*) from ypl.report_kitchen_meal(current_date)) >= 1, 'kitchen report empty';

  ------------------------------------------------------------------
  -- Report RPCs all execute
  ------------------------------------------------------------------
  perform * from ypl.report_reservation_confirmation(v_res.reservationid);
  perform * from ypl.report_check_in_folio(v_res.reservationid);
  perform * from ypl.report_checkout_bill_header(v_res.reservationid);
  perform * from ypl.report_checkout_bill_lines(v_res.reservationid);
  perform * from ypl.report_cancellation_notice(v_res2.reservationid);
  perform * from ypl.report_guest_document_queue('check_in_folio', current_date);
  perform * from ypl.report_in_house(current_date);
  perform * from ypl.report_manual_sales(current_date);
  perform * from ypl.report_kitchen_meal_filtered(current_date, current_date + 7);
  perform ypl.report_kitchen_meal_total_guests(current_date);
  perform * from ypl.report_dcar_upper(current_date);
  perform * from ypl.report_dcar_payments(current_date);
  perform * from ypl.report_dcar_summary(current_date);
  perform * from ypl.report_deposits_received(current_date);
  perform * from ypl.report_deposits_applied(current_date);
  perform * from ypl.report_cashier_detail(current_date);
  perform * from ypl.report_items_cashed_out(current_date);
  perform * from ypl.search_guests_by_name('SMOKE');
  perform * from ypl.search_all_fields('SMOKE');
  perform * from ypl.search_by_date(current_date, 'in_house');
  perform * from ypl.search_by_date_range(current_date, current_date + 30, 'overlap');
  perform * from ypl.guest_history(v_guestid, current_date);
  perform * from ypl.room_directory(current_date, current_date + 2);

  raise notice 'ALL BUSINESS-LOGIC SMOKE TESTS PASSED';
end;
$$;

rollback;
