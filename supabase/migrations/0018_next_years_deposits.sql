-- =============================================================================
-- 0018_next_years_deposits.sql
-- A year-end total of deposits taken for future years' stays.
--
-- The lodge asked for a yearly total of deposits received, Jan 1 to Dec 31, for
-- their year end — not itemized by guest. What a year end needs is the money
-- taken during the year for stays after it, so that is what this counts, month
-- by month: deposits received (the Deposits Received appendix's category) on
-- reservations arriving after Dec 31, and — so the year ends on what is still
-- held — what of those deposits was refunded or kept within the year.
-- =============================================================================

set search_path = ypl, public;

create or replace function ypl.report_next_years_deposits(p_year integer)
returns table (
  month date,
  deposits integer,
  received numeric,
  refunded numeric,
  kept numeric,
  held numeric
)
language sql
stable
as $$
  with months as (
    select generate_series(make_date(p_year, 1, 1), make_date(p_year, 12, 1), interval '1 month')::date as month
  ), future as (
    select date_trunc('month', p.paymentdate)::date as month,
           p.paymentcategory,
           ypl.money_amount(p.paymentamountcdn, p.paymentamount) as amount
      from ypl.payments p
      join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
      join ypl.reservations r on r.reservationid = rg.reservationid
     where not p.paymentarchive
       and not rg.rgarchive
       and not r.resarchive
       and p.paymentdate::date between make_date(p_year, 1, 1) and make_date(p_year, 12, 31)
       and r.resarrivaldate::date > make_date(p_year, 12, 31)
       and p.paymentcategory in ('Deposit (Received)', 'Deposit (Refund)', 'Deposit (Kept)')
  )
  select m.month,
         -- Access added a $0.00 deposit line to most new bookings; those
         -- aren't deposits and aren't counted.
         (count(*) filter (where f.paymentcategory = 'Deposit (Received)' and f.amount <> 0))::integer,
         round(coalesce(sum(f.amount) filter (where f.paymentcategory = 'Deposit (Received)'), 0), 2),
         round(coalesce(-sum(f.amount) filter (where f.paymentcategory = 'Deposit (Refund)'), 0), 2),
         round(coalesce(sum(f.amount) filter (where f.paymentcategory = 'Deposit (Kept)'), 0), 2),
         round(coalesce(sum(f.amount) filter (where f.paymentcategory = 'Deposit (Received)'), 0)
               + coalesce(sum(f.amount) filter (where f.paymentcategory = 'Deposit (Refund)'), 0)
               - coalesce(sum(f.amount) filter (where f.paymentcategory = 'Deposit (Kept)'), 0), 2)
    from months m
    left join future f on f.month = m.month
   group by m.month
   order by m.month;
$$;

comment on function ypl.report_next_years_deposits is
  'Deposits taken during a year for stays arriving after it, by month received: how many (not counting $0.00 placeholder lines), how much, how much of it was refunded or kept within the year, and what is still held. Refunds are stored negative and shown positive.';

grant execute on all functions in schema ypl to authenticated, service_role;
