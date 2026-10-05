-- =============================================================================
-- 0022_cancellations_and_quantities.sql
-- Un-cancel a reservation; refund or keep a deposit after the cancellation;
-- a cancellation notice only for a cancelled stay; change a charge's quantity.
--
-- Access staff un-cancelled a booking by clearing its Cancelled box ("Called
-- and uncancelled the room … to not lose dep."), and often held a cancelled
-- stay's deposit until they knew whether the room re-rented ("$70 dep ref only
-- if accom/upg rent"). They corrected a charge's quantity in place
-- (frmUpdateQuantityOptions, frmChangeAmountInventory, frmChangeAmountRoom).
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Refunding or keeping a deposit
-- -----------------------------------------------------------------------------

-- Refund or keep whatever deposit the stay still holds, dated p_date, on the
-- deposit's own payment type. Cancelling does this when the desk decides on the
-- spot; a deposit left to decide later is settled here once they know. Nothing
-- reaches the cash sheet until then.
create or replace function ypl.settle_deposit(
  p_reservationid integer,
  p_date date default current_date,
  p_deposit_handling text default 'refund'
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
        v_rg.reservationguestid, 'Deposit (Refund)', coalesce(v_type, 'Cheque'),
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
  'Refunds or keeps the deposit a stay still holds, dated p_date, writing the offsetting payment line. Raises when the stay holds no deposit.';

-- Cancelling records the cancellation, then refunds or keeps the deposit when
-- the desk has decided; with none, the deposit stays held for later.
create or replace function ypl.cancel_reservation(
  p_reservationid integer,
  p_date date default current_date,
  p_deposit_handling text default 'none',
  p_notes text default null
) returns void
language plpgsql
volatile
as $$
begin
  if p_deposit_handling not in ('none', 'refund', 'keep') then
    raise exception 'Deposit handling must be none, refund, or keep (got "%")', p_deposit_handling;
  end if;

  update ypl.reservations r
     set rescancelled = true,
         resdatecancelled = coalesce(p_date, current_date),
         resnotes = case
           when nullif(trim(coalesce(p_notes, '')), '') is null then r.resnotes
           when r.resnotes is null then trim(p_notes)
           else r.resnotes || E'\n' || trim(p_notes)
         end
   where r.reservationid = p_reservationid;
  if not found then
    raise exception 'Reservation % not found', p_reservationid;
  end if;

  if p_deposit_handling <> 'none'
     and exists (
       select 1
         from ypl.reservation_guests rg
        where rg.reservationid = p_reservationid
          and not rg.rgarchive
          and ypl.reservationguest_deposit_held(rg.reservationguestid) > 0
     ) then
    perform ypl.settle_deposit(p_reservationid, p_date, p_deposit_handling);
  end if;
end;
$$;

comment on function ypl.cancel_reservation is
  'Cancels a reservation and refunds or keeps any deposit still held (settle_deposit). With none, the deposit stays held until it is settled.';

-- -----------------------------------------------------------------------------
-- Un-cancelling
-- -----------------------------------------------------------------------------

-- The booking comes back as it was: same number, dates, rooms and guests. The
-- reservations trigger clears the cancellation date with the flag. A deposit
-- refunded or kept at the cancellation stays as it was recorded.
create or replace function ypl.uncancel_reservation(p_reservationid integer)
returns void
language plpgsql
volatile
as $$
begin
  update ypl.reservations r
     set rescancelled = false
   where r.reservationid = p_reservationid
     and r.rescancelled;
  if not found then
    if exists (select 1 from ypl.reservations r where r.reservationid = p_reservationid) then
      raise exception 'Reservation #% is not cancelled',
        (select r.resnumber from ypl.reservations r where r.reservationid = p_reservationid);
    end if;
    raise exception 'Reservation % not found', p_reservationid;
  end if;
end;
$$;

comment on function ypl.uncancel_reservation is
  'Un-cancels a reservation: it stands again as it was. Any deposit refunded or kept on cancelling stays as recorded.';

-- -----------------------------------------------------------------------------
-- The cancellation notice is for a cancelled stay
-- -----------------------------------------------------------------------------

create or replace function ypl.report_cancellation_notice(p_reservationid integer)
returns table (
  resnumber integer,
  guest text,
  guestaddress varchar,
  guestcity varchar,
  guestregion varchar,
  guestcountry varchar,
  guestpczip varchar,
  phone varchar,
  date_printed date,
  date_cancelled date,
  arrival_date date,
  departure_date date,
  room text,
  guest_count integer,
  deposit_received_amount numeric,
  deposit_received_date date,
  deposit_outcome_category text,
  deposit_outcome_amount numeric,
  deposit_outcome_date date,
  cancellation_notes text
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         s.guestaddress,
         s.guestcity,
         s.guestregion,
         s.guestcountry,
         s.guestpczip,
         s.guestprimaryphone,
         current_date,
         s.resdatecancelled::date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         first_occ.room,
         coalesce(first_occ.guest_count, s.numadults + coalesce(s.numchildren, 0)),
         dep.deposit_received_amount,
         dep.deposit_received_date,
         outcome.deposit_outcome_category,
         outcome.deposit_outcome_amount,
         outcome.deposit_outcome_date,
         s.resnotes
    from ypl.v_reservation_summary s
    left join lateral (
      select r.room, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
       limit 1
    ) first_occ on true
    left join lateral (
      select ypl.money_amount(p.paymentamountcdn, p.paymentamount) as deposit_received_amount,
             p.paymentdate::date as deposit_received_date
        from ypl.payments p
        join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
       where rg.reservationid = s.reservationid
         and p.paymentcategory = 'Deposit (Received)'
         and not p.paymentarchive
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) dep on true
    left join lateral (
      select p.paymentcategory as deposit_outcome_category,
             ypl.money_amount(p.paymentamountcdn, p.paymentamount) as deposit_outcome_amount,
             p.paymentdate::date as deposit_outcome_date
        from ypl.payments p
        join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
       where rg.reservationid = s.reservationid
         and p.paymentcategory in ('Deposit (Refund)', 'Deposit (Kept)', 'Deposit (Applied)', 'Prepayment (Refund)')
         and not p.paymentarchive
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) outcome on true
   where s.reservationid = p_reservationid
     and s.rescancelled;
$$;

comment on function ypl.report_cancellation_notice is
  'Cancellation notice for a cancelled reservation; an active one has none.';

-- -----------------------------------------------------------------------------
-- Changing a charge's quantity
-- -----------------------------------------------------------------------------

-- The line keeps the price per unit it was posted at, so a price typed over
-- the list price stays. The transactions trigger recomputes the taxes. On a
-- room line the quantity is nights, and the nights it covers follow.
create or replace function ypl.change_charge_quantity(
  p_transactionid integer,
  p_quantity integer
) returns void
language plpgsql
volatile
as $$
declare
  v ypl.transactions;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;
  select * into v
    from ypl.transactions t
   where t.transactionid = p_transactionid
     and not t.transarchive;
  if not found then
    raise exception 'Charge line % not found or already removed', p_transactionid;
  end if;

  update ypl.transactions t
     set transquantity = p_quantity,
         transamount = case
           when nullif(v.transquantity, 0) is null then null
           else round(v.transamount / v.transquantity * p_quantity, 2)
         end,
         occupancyout = case
           when v.roomid is not null and v.occupancyin is not null
             then v.occupancyin::date + p_quantity
           else t.occupancyout
         end
   where t.transactionid = p_transactionid;
end;
$$;

comment on function ypl.change_charge_quantity is
  'Changes a charge line''s quantity at the price per unit it was posted at; taxes follow, and a room line''s nights follow. A quantity under one is refused.';

grant execute on all functions in schema ypl to authenticated, service_role;
