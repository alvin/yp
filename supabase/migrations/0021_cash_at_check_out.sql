-- =============================================================================
-- 0021_cash_at_check_out.sql
-- The Daily Cash Activity Report counts a stay on the day the guest checks out.
--
-- Access put a stay's charges and taxes on the sheet on the guest's check-out
-- day (qrySubreportDailyCashSalesCharges and qrySubreportDailyCashTaxes select
-- CheckOutDate = the report date) — the day the guest pays. The clerk applied
-- the stay's deposit the same day (qryAppendReservationPayment wrote a Deposit
-- (Applied) line; qryUpdateReservationPayment set the deposit line to $0.00),
-- and the sheet took it off the day's total. Lines that settle a bill without
-- money changing hands stayed out of the receipts by type of cash
-- (qrySubreportDailyCashType).
--
-- This app counted each charge on the day it was posted and never applied a
-- deposit, so the two halves of the sheet met only when a stay was booked,
-- charged and paid on one day. The rules below are Access's, except that:
--   * the database applies whatever deposit or prepayment a stay still holds
--     on its check-out day — no clerk step, and the deposit line keeps its
--     amount, so the day it was received still reads as it did;
--   * a charge posted after its stay's check-out day (a walk-in sale on a
--     daily sales account, a charge added late) counts on the day it is
--     posted — Access re-dated its daily sales accounts every night and never
--     counted a late charge;
--   * a deposit kept is the day's revenue, on a Cancellation line, and comes
--     off as Deposit (Kept) because the money came in earlier as a deposit.
--     Access had no way to show a kept deposit with a value: the lodge entered
--     every one at $0.00.
-- Deductions print with a minus sign, as refunds always have, so the lines of
-- the top section add up to its total.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Money that moves, and money that doesn't
-- -----------------------------------------------------------------------------

-- A deposit or prepayment applied, a deposit kept, a gift certificate taken in
-- payment and a bill sent to accounts settle a bill without money changing
-- hands that day. Everything else is money taken or paid out.
create or replace function ypl.payment_moves_money(p_payment_category text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_payment_category, '') not in (
    'Deposit (Applied)', 'Prepayment (Applied)', 'Deposit (Kept)',
    'Gift Certificate Received', 'A/R (Sent To Accounts)'
  );
$$;

comment on function ypl.payment_moves_money is
  'False for the payment categories that settle a bill without money changing hands that day: deposits and prepayments applied, deposits kept, gift certificates received, bills sent to accounts.';

-- A deposit kept is the charge the lodge makes for the cancellation, so it adds
-- to what the guest owes and the deposit it keeps brings the stay to zero.
-- Every other payment line reduces the balance; refunds, stored negative, add
-- it back.
create or replace function ypl.payment_balance_effect(
  p_payment_category text,
  p_amount_cdn numeric,
  p_amount numeric
) returns numeric
language sql
immutable
as $$
  select case
    when p_payment_category = 'Deposit (Kept)' then ypl.money_amount(p_amount_cdn, p_amount)
    else -1 * ypl.money_amount(p_amount_cdn, p_amount)
  end;
$$;

-- -----------------------------------------------------------------------------
-- What a day's sheet counts
-- -----------------------------------------------------------------------------

-- The charges cashed out on a day: those of stays checking out that day, and
-- any charge posted that day after its stay's check-out day.
create or replace function ypl.charges_cashed_out(p_date date)
returns setof ypl.transactions
language sql
stable
as $$
  select t.*
    from ypl.transactions t
    join ypl.reservation_guests rg on rg.reservationguestid = t.reservationguestid
   where not t.transarchive
     and greatest(t.transdate::date, coalesce(rg.checkoutdate::date, t.transdate::date)) = p_date;
$$;

comment on function ypl.charges_cashed_out is
  'The charge lines a day''s cash sheet counts: a stay''s charges on its check-out day, and a charge posted after its stay''s check-out day on the day it was posted.';

-- What each stay checking out on the day still holds on deposit or prepayment,
-- applied to its bill that day: received, less refunded and kept. Stays from
-- Access already carry the applied line their clerk wrote, with the deposit line
-- set to $0.00; the larger of the two is what was applied, so no stay counts
-- twice. A cancelled stay checks out of nothing: its deposit stays held until
-- it is refunded or kept.
create or replace function ypl.applied_at_check_out(p_date date)
returns table (
  reservationguestid integer,
  reservationid integer,
  paymentcategory text,
  paymenttype text,
  paymentcurrency text,
  amount numeric
)
language sql
stable
as $$
  with stays as (
    select rg.reservationguestid, rg.reservationid
      from ypl.reservation_guests rg
      join ypl.reservations r on r.reservationid = rg.reservationid
     where rg.checkoutdate::date = p_date
       and not rg.rgarchive
       and not r.rescancelled
  ), held as (
    select s.reservationguestid,
           s.reservationid,
           k.kind,
           coalesce(sum(ypl.money_amount(p.paymentamountcdn, p.paymentamount))
             filter (where p.paymentcategory = k.kind || ' (Applied)'), 0) as recorded,
           coalesce(sum(ypl.money_amount(p.paymentamountcdn, p.paymentamount))
             filter (where p.paymentcategory in (k.kind || ' (Received)', k.kind || ' (Refund)')), 0)
           - coalesce(sum(ypl.money_amount(p.paymentamountcdn, p.paymentamount))
             filter (where p.paymentcategory = k.kind || ' (Kept)'), 0) as still_held
      from stays s
      cross join (values ('Deposit'), ('Prepayment')) as k(kind)
      join ypl.payments p
        on p.reservationguestid = s.reservationguestid
       and not p.paymentarchive
     group by s.reservationguestid, s.reservationid, k.kind
  )
  select h.reservationguestid,
         h.reservationid,
         h.kind || ' (Applied)',
         latest.paymenttype,
         latest.paymentcurrency,
         round(greatest(h.recorded, h.still_held), 2)
    from held h
    left join lateral (
      select p.paymenttype::text, p.paymentcurrency::text
        from ypl.payments p
       where p.reservationguestid = h.reservationguestid
         and not p.paymentarchive
         and p.paymentcategory in (h.kind || ' (Received)', h.kind || ' (Applied)')
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) latest on true
   where greatest(h.recorded, h.still_held) > 0;
$$;

comment on function ypl.applied_at_check_out is
  'Deposits and prepayments applied on a day: what each stay checking out that day still holds (received, less refunded and kept), or the applied line Access recorded for it. Cancelled stays are never applied.';

-- -----------------------------------------------------------------------------
-- The Daily Cash Activity Report
-- -----------------------------------------------------------------------------

-- The lodge's lookup lists set the order of the lines. Anything posted under a
-- type or category not on a list still gets its own line, after the listed
-- ones, so the lines always add up to the totals beside them.
create or replace function ypl.report_dcar_upper(p_date date)
returns table (
  group_name text,
  item text,
  amount numeric,
  sort_order integer
)
language sql
stable
as $$
  with charges as (
    select coalesce(c.transtype, 'Unspecified') as item,
           c.transamount as amount,
           c.transgstamount, c.transpstamount, c.transhstamount, c.transltamount,
           c.transrtamount, c.transhtamount, c.transdmtamount
      from ypl.charges_cashed_out(p_date) c
  ), receipts as (
    select coalesce(p.paymentcategory, 'Unspecified') as item,
           ypl.payment_reporting_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) as reported,
           abs(ypl.money_amount(p.paymentamountcdn, p.paymentamount)) as magnitude
      from ypl.payments p
     where p.paymentdate::date = p_date
       and not p.paymentarchive
       and p.paymentcategory is distinct from 'Payment (Regular)'
  ), kept as (
    select coalesce(sum(r.magnitude), 0) as amount
      from receipts r
     where r.item = 'Deposit (Kept)'
  ), revenue_lines as (
    select tt.transactiontype::text as item, tt.transactiontypeorder as sort_order
      from ypl.lookup_transaction_types tt
    union
    select c.item, 98
      from charges c
     where not exists (select 1 from ypl.lookup_transaction_types tt where tt.transactiontype = c.item)
  ), revenue as (
    select l.item, coalesce(sum(c.amount), 0) as amount, l.sort_order
      from revenue_lines l
      left join charges c on c.item = l.item
     group by l.item, l.sort_order
    union all
    -- A deposit kept is the day's revenue from the cancellation.
    select 'Cancellation', k.amount, 97
      from kept k
     where k.amount <> 0
  ), taxes as (
    select 'GST'::text as item, coalesce(sum(c.transgstamount), 0) as amount, 100 as sort_order from charges c
    union all select 'PST', coalesce(sum(c.transpstamount), 0), 101 from charges c
    union all select 'HST', coalesce(sum(c.transhstamount), 0), 102 from charges c
    union all select 'Liquor Tax', coalesce(sum(c.transltamount), 0), 103 from charges c
    union all select 'Room Tax', coalesce(sum(c.transrtamount), 0), 104 from charges c
    union all select 'Hotel Tax', coalesce(sum(c.transhtamount), 0), 105 from charges c
    union all select 'Dest Mktg Tax', coalesce(sum(c.transdmtamount), 0), 106 from charges c
  ), adjustment_lines as (
    select pc.paymentcategory::text as item, 200 + coalesce(pc.paymentcategoryorder, 999) as sort_order
      from ypl.lookup_payment_categories pc
     where pc.paymentcategory <> 'Payment (Regular)'
    union
    select r.item, 10000
      from receipts r
     where not exists (select 1 from ypl.lookup_payment_categories pc where pc.paymentcategory = r.item)
  ), received as (
    select r.item, sum(r.reported) as reported, sum(r.magnitude) as magnitude
      from receipts r
     group by r.item
  ), applied as (
    select a.paymentcategory as item, sum(a.amount) as amount
      from ypl.applied_at_check_out(p_date) a
     group by a.paymentcategory
  ), adjustments as (
    -- Money taken or paid out counts as it was filed; what settled a bill
    -- without money changing hands comes off the day's total.
    select l.item,
           case
             when l.item in ('Deposit (Applied)', 'Prepayment (Applied)') then -coalesce(a.amount, 0)
             when not ypl.payment_moves_money(l.item) then -coalesce(rc.magnitude, 0)
             else coalesce(rc.reported, 0)
           end as amount,
           l.sort_order
      from adjustment_lines l
      left join received rc on rc.item = l.item
      left join applied a on a.item = l.item
  )
  select 'Revenue', item, round(amount, 2), sort_order from revenue
  union all
  select 'Revenue', 'Total Sales and Charges', round(coalesce(sum(amount), 0), 2), 99 from revenue
  union all
  select 'Taxes', item, round(amount, 2), sort_order from taxes
  union all
  select 'Taxes', 'Total Taxes', round(coalesce(sum(amount), 0), 2), 199 from taxes
  union all
  select 'Adjustments', item, round(amount, 2), sort_order from adjustments
  order by sort_order, item;
$$;

comment on function ypl.report_dcar_upper is
  'Daily Cash Activity Report, top section: the charges and taxes cashed out that day (charges_cashed_out), a Cancellation line for deposits kept, then the deposit, prepayment and account lines. Deposits and prepayments applied (applied_at_check_out), deposits kept, gift certificates received and bills sent to accounts are taken off.';

-- The top section's total is its lines, added up.
create or replace function ypl.report_dcar_total(p_date date)
returns numeric
language sql
stable
as $$
  select round(coalesce(sum(u.amount), 0), 2)
    from ypl.report_dcar_upper(p_date) u
   where u.item not in ('Total Sales and Charges', 'Total Taxes');
$$;

-- Receipts by type of cash: the money taken or paid out that day. Gift
-- certificates and bills sent to accounts aren't money, so their types print
-- only if a receipt was filed under one.
create or replace function ypl.report_dcar_payments(p_date date)
returns table (
  paymenttype text,
  calc_amount numeric,
  actual_amount numeric,
  adjustment numeric,
  sort_order integer
)
language sql
stable
as $$
  with day as (
    select coalesce(p.paymenttype, 'Unspecified') as paymenttype,
           ypl.payment_cash_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) as amount
      from ypl.payments p
     where p.paymentdate::date = p_date
       and not p.paymentarchive
       and ypl.payment_moves_money(p.paymentcategory)
  ), listed as (
    select pt.paymenttype::text as paymenttype, pt.paymenttypeorder as sort_order
      from ypl.lookup_payment_types pt
     where pt.paymenttype not in ('Gift Certificate', 'None (Sent to A/R)')
  ), lines as (
    select l.paymenttype, l.sort_order from listed l
    union
    select d.paymenttype, 10000
      from day d
     where not exists (select 1 from listed l where l.paymenttype = d.paymenttype)
  )
  select l.paymenttype,
         round(coalesce(sum(d.amount), 0), 2),
         null::numeric,
         null::numeric,
         l.sort_order
    from lines l
    left join day d on d.paymenttype = l.paymenttype
   group by l.paymenttype, l.sort_order
   order by l.sort_order, l.paymenttype;
$$;

-- Total Receipts Today is the receipts lines, added up.
create or replace function ypl.report_dcar_receipts_total(p_date date)
returns numeric
language sql
stable
as $$
  select round(coalesce(sum(d.calc_amount), 0), 2)
    from ypl.report_dcar_payments(p_date) d;
$$;

-- -----------------------------------------------------------------------------
-- The appendices
-- -----------------------------------------------------------------------------

create or replace function ypl.report_deposits_applied(p_date date)
returns table (
  payment_type text,
  resnumber integer,
  guestlastname varchar,
  guestfirstname varchar,
  guest text,
  pymt_amount numeric,
  funds varchar,
  pymt_cdn numeric
)
language sql
stable
as $$
  select a.paymenttype,
         r.resnumber,
         g.guestlastname,
         g.guestfirstname,
         ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany),
         a.amount,
         a.paymentcurrency::varchar,
         a.amount
    from ypl.applied_at_check_out(p_date) a
    join ypl.reservations r on r.reservationid = a.reservationid
    join ypl.reservation_guests rg on rg.reservationguestid = a.reservationguestid
    join ypl.guests g on g.guestid = rg.guestid
   where a.paymentcategory = 'Deposit (Applied)'
   order by a.paymenttype, g.guestlastname, g.guestfirstname, r.resnumber;
$$;

comment on function ypl.report_deposits_applied is
  'Deposits Applied appendix: each stay checking out that day with the deposit applied to its bill, grouped by the deposit''s payment type.';

create or replace function ypl.report_cashier_detail(p_date date)
returns table (
  payment_type text,
  resnumber integer,
  pymt_date date,
  pymt_category text,
  amount numeric,
  guest text
)
language sql
stable
as $$
  select p.paymenttype::text,
         r.resnumber,
         p.paymentdate::date,
         p.paymentcategory::text,
         ypl.payment_cash_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount),
         ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany)
    from ypl.payments p
    join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
    join ypl.reservations r on r.reservationid = rg.reservationid
    join ypl.guests g on g.guestid = rg.guestid
   where p.paymentdate::date = p_date
     and not p.paymentarchive
     and ypl.payment_moves_money(p.paymentcategory)
   order by p.paymenttype, p.paymentdate, r.resnumber, p.paymentid;
$$;

comment on function ypl.report_cashier_detail is
  'Cashier Detail appendix: the money taken or paid out that day, by payment type.';

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
   order by coalesce(inv.invcode, t.invcode), t.resnumber, t.transactionid;
$$;

comment on function ypl.report_items_cashed_out is
  'Items Cashed Out appendix: the charge lines the day''s cash sheet counts (charges_cashed_out), by item code.';

grant execute on all functions in schema ypl to authenticated, service_role;
