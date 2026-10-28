-- =============================================================================
-- 0029_no_notes_on_the_cancellation_notice.sql
-- The cancellation notice prints no notes.
--
-- Since 0026 the notice printed the rooms' occupancy notes, as the lodge's
-- 25 Oct chart asked. Those are messages for a guest who is coming ("Please
-- let us know who will be joining you"), and the lodge doesn't want them on a
-- cancellation (28 Oct). The reservation notes, where the note typed when
-- cancelling goes, are office-only and print on the Cancellation List alone
-- (0028). So the notice carries the booking, the dates and the deposit, and
-- no note of any kind.
-- =============================================================================

set search_path = ypl, public;

-- As 0026, without occupancy_notes.
drop function if exists ypl.report_cancellation_notice(integer);
create function ypl.report_cancellation_notice(p_reservationid integer)
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
  deposit_outcome_date date
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
         dep.amount,
         dep.paid_on,
         outcome.deposit_outcome_category,
         outcome.deposit_outcome_amount,
         outcome.deposit_outcome_date
    from ypl.v_reservation_summary s
    left join lateral (
      select r.room, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
       limit 1
    ) first_occ on true
    left join lateral ypl.latest_deposit_received(s.reservationid) dep on true
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
  'Cancellation notice for a cancelled reservation: the booking, its dates, room and party, and the deposit received and what became of it. It prints no notes. An active reservation has none.';

grant execute on all functions in schema ypl to authenticated, service_role;
