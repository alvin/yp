-- =============================================================================
-- 0027_refund_tender_on_cancelling.sql
-- A deposit is refunded on the tender the desk chooses, from the cancel dialog;
-- a deposit refund can never exceed the deposit still held.
--
-- Cancelling refunded a deposit on the tender it was taken on. When the money
-- went back another way (a card deposit returned by cheque), staff recorded the
-- refund by hand from the Payment dialog first, then cancelled. The database
-- never refunded twice — cancelling refunds only what is still held — but
-- nothing stopped a hand-entered refund larger than the deposit (a $70 refund
-- on a $35 deposit), or one entered after cancelling had already refunded it.
-- Now the cancel and settle dialogs take the refund's tender, and
-- record_payment refuses a deposit refund beyond what the guest still holds.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- The tender a deposit was taken on
-- -----------------------------------------------------------------------------

-- What the cancel and settle dialogs offer first for a refund: the tender of
-- the latest deposit received on the stay.
create or replace function ypl.reservation_deposit_tender(p_reservationid integer)
returns text
language sql
stable
as $$
  select p.paymenttype::text
    from ypl.payments p
    join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
   where rg.reservationid = p_reservationid
     and not rg.rgarchive
     and p.paymentcategory = 'Deposit (Received)'
     and not p.paymentarchive
   order by p.paymentdate desc nulls last, p.paymentid desc
   limit 1;
$$;

comment on function ypl.reservation_deposit_tender is
  'Tender of the latest deposit received on a stay — the refund tender offered first when cancelling or settling.';

-- -----------------------------------------------------------------------------
-- Refunding or keeping a deposit, on a chosen tender
-- -----------------------------------------------------------------------------

-- A refund goes out on p_paymenttype; without one, on the deposit's own
-- tender. A kept deposit moves no money and stays on the deposit's tender.
drop function if exists ypl.settle_deposit(integer, date, text);
create function ypl.settle_deposit(
  p_reservationid integer,
  p_date date default current_date,
  p_deposit_handling text default 'refund',
  p_paymenttype text default null
) returns void
language plpgsql
volatile
as $$
declare
  v_rg record;
  v_net numeric;
  v_type text;
  v_settled integer := 0;
begin
  if p_deposit_handling not in ('refund', 'keep') then
    raise exception 'Deposit handling must be refund or keep (got "%")', p_deposit_handling;
  end if;
  if not exists (select 1 from ypl.reservations r where r.reservationid = p_reservationid) then
    raise exception 'Reservation % not found', p_reservationid;
  end if;

  for v_rg in
    select rg.reservationguestid
      from ypl.reservation_guests rg
     where rg.reservationid = p_reservationid
       and not rg.rgarchive
  loop
    v_net := ypl.reservationguest_deposit_held(v_rg.reservationguestid);
    if v_net <= 0 then
      continue;
    end if;
    select p.paymenttype into v_type
      from ypl.payments p
     where p.reservationguestid = v_rg.reservationguestid
       and p.paymentcategory = 'Deposit (Received)'
       and not p.paymentarchive
     order by p.paymentdate desc, p.paymentid desc
     limit 1;

    if p_deposit_handling = 'refund' then
      insert into ypl.payments (
        reservationguestid, paymentcategory, paymenttype, paymentdate,
        paymentamount, paymentcurrency, paymentnotes, paymentarchive
      ) values (
        v_rg.reservationguestid, 'Deposit (Refund)',
        coalesce(nullif(trim(p_paymenttype), ''), v_type, 'Cheque'),
        coalesce(p_date, current_date), -v_net, 'Canadian',
        'Deposit refunded on cancellation', false
      );
    else
      insert into ypl.payments (
        reservationguestid, paymentcategory, paymenttype, paymentdate,
        paymentamount, paymentcurrency, paymentnotes, paymentarchive
      ) values (
        v_rg.reservationguestid, 'Deposit (Kept)', coalesce(v_type, 'Cheque'),
        coalesce(p_date, current_date), v_net, 'Canadian',
        'Deposit kept on cancellation', false
      );
    end if;
    v_settled := v_settled + 1;
  end loop;

  if v_settled = 0 then
    raise exception 'Reservation #% holds no deposit',
      (select r.resnumber from ypl.reservations r where r.reservationid = p_reservationid);
  end if;
end;
$$;

comment on function ypl.settle_deposit is
  'Refunds or keeps the deposit a stay still holds, dated p_date, writing the offsetting payment line. A refund goes out on p_paymenttype, or the deposit''s own tender without one. Raises when the stay holds no deposit.';

-- As 0026, with the refund's tender passed through to settle_deposit.
drop function if exists ypl.cancel_reservation(integer, date, text, text);
create function ypl.cancel_reservation(
  p_reservationid integer,
  p_date date default current_date,
  p_deposit_handling text default 'none',
  p_notes text default null,
  p_paymenttype text default null
) returns void
language plpgsql
volatile
as $$
declare
  v_note text := nullif(trim(coalesce(p_notes, '')), '');
  v_first integer;
begin
  if p_deposit_handling not in ('none', 'refund', 'keep') then
    raise exception 'Deposit handling must be none, refund, or keep (got "%")', p_deposit_handling;
  end if;

  update ypl.reservations r
     set rescancelled = true,
         resdatecancelled = coalesce(p_date, current_date)
   where r.reservationid = p_reservationid;
  if not found then
    raise exception 'Reservation % not found', p_reservationid;
  end if;

  if v_note is not null then
    select sr.occupancyid into v_first
      from ypl.report_stay_rooms(p_reservationid) sr
     limit 1;
    if v_first is not null then
      update ypl.room_assignments o
         set occupancynotes = concat_ws(E'\n', nullif(trim(coalesce(o.occupancynotes, '')), ''), v_note)
       where o.occupancyid = v_first;
    else
      update ypl.reservations r
         set resnotes = concat_ws(E'\n', nullif(trim(coalesce(r.resnotes, '')), ''), v_note)
       where r.reservationid = p_reservationid;
    end if;
  end if;

  if p_deposit_handling <> 'none' and ypl.reservation_deposit_held(p_reservationid) > 0 then
    perform ypl.settle_deposit(p_reservationid, p_date, p_deposit_handling, p_paymenttype);
  end if;
end;
$$;

comment on function ypl.cancel_reservation is
  'Cancels a reservation, adds the cancellation note to the occupancy notes of its first room (where the notice prints it), and refunds (on p_paymenttype, or the deposit''s own tender) or keeps any deposit still held (settle_deposit). With none, the deposit stays held until it is settled.';

-- -----------------------------------------------------------------------------
-- A deposit refund never exceeds the deposit held
-- -----------------------------------------------------------------------------

-- As 0005, refusing a deposit refund larger than what the guest still holds,
-- so a refund cannot be entered twice, by hand or after cancelling.
create or replace function ypl.record_payment(
  p_reservationguestid integer,
  p_paymentcategory text,
  p_paymenttype text,
  p_amount numeric,
  p_currency text default 'Canadian',
  p_paymentdate date default current_date,
  p_notes text default null,
  p_ccname text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_amount numeric;
  v_held numeric;
  v_paymentid integer;
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'Payment amount is required';
  end if;

  -- Money going out of the till is stored negative; receipts stay positive.
  if p_paymentcategory in ('Deposit (Refund)', 'Prepayment (Refund)', 'Paid Out') then
    v_amount := -abs(p_amount);
  else
    v_amount := p_amount;
  end if;

  if p_paymentcategory = 'Deposit (Refund)' then
    v_held := ypl.reservationguest_deposit_held(p_reservationguestid);
    if abs(p_amount) > greatest(v_held, 0) then
      raise exception 'The deposit held is %; a refund cannot be more',
        to_char(greatest(v_held, 0), 'FM$999,990.00');
    end if;
  end if;

  insert into ypl.payments (
    reservationguestid, paymentcategory, paymenttype, paymentdate,
    paymentamount, paymentcurrency, ccname, paymentnotes, paymentarchive
  ) values (
    p_reservationguestid, p_paymentcategory, p_paymenttype, coalesce(p_paymentdate, current_date),
    v_amount, coalesce(p_currency, 'Canadian'), p_ccname, p_notes, false
  )
  returning paymentid into v_paymentid;
  return v_paymentid;
end;
$$;

comment on function ypl.record_payment is
  'Records any payment-ledger row (deposits, prepayments, payments, refunds, gratuities, A/R). The payment code and CDN conversion fill automatically; refund-style categories are stored negative, and a deposit refund cannot exceed the deposit held.';

grant execute on all functions in schema ypl to authenticated, service_role;
