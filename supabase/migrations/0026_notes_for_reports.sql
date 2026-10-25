-- =============================================================================
-- 0026_notes_for_reports.sql
-- Each note on a stay prints where the lodge reads it.
--
-- In Access the reservation's notes (ResNotes) were the office's own record of
-- a booking: "equal billing", "3/26/26 can no longer come…". They printed on
-- the cancellation notice, and since 0003 on the confirmation too. The lodge
-- asked for them to print on nothing, like the guest's notes. The messages
-- meant for the guest were always the room's occupancy notes ("Please let us
-- know who will be joining you"), which Access printed under the room on the
-- confirmation and on the In House report; they now also print on the
-- cancellation notice in place of the reservation's notes. The guest's
-- requests (RGNotes) print on the confirmation as well as the In House report,
-- and two reports list them: everyone at the lodge on a day, and one guest's
-- stays by date.
--
-- Also: two functions nothing called (archive_housekeeping_note,
-- archive_kitchen_meal; the screens clear a note by saving it empty) are
-- dropped, the Daily Cash summary works out its totals once, and the latest
-- deposit received is read one way by both guest documents.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Occupancy notes
-- -----------------------------------------------------------------------------

-- What's in the box is what prints; an empty box clears the note.
create or replace function ypl.set_occupancy_notes(
  p_occupancyid integer,
  p_notes text
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.room_assignments o
     set occupancynotes = nullif(trim(coalesce(p_notes, '')), '')
   where o.occupancyid = p_occupancyid
     and not o.occupancyarchive;
  if not found then
    raise exception 'Room % not found or removed', p_occupancyid;
  end if;
end;
$$;

comment on function ypl.set_occupancy_notes is
  'Sets or clears the occupancy notes of one live room of a stay.';

-- A stay's occupancy notes as the guest documents print them: each different
-- note once, in the order the stay holds its rooms.
create or replace function ypl.stay_occupancy_notes(p_reservationid integer)
returns text
language sql
stable
as $$
  select string_agg(n.note, E'\n' order by n.first_room)
    from (
      select r.note, min(r.n) as first_room
        from (
          select nullif(trim(o.occupancynotes), '') as note,
                 row_number() over (order by o.occupancyin, o.roomorder nulls last, o.occupancyid) as n
            from ypl.v_occupancy_summary o
           where o.reservationid = p_reservationid
             and not o.occupancyarchive
             and not o.rgarchive
        ) r
       where r.note is not null
       group by r.note
    ) n;
$$;

comment on function ypl.stay_occupancy_notes is
  'The occupancy notes of a stay''s live rooms, each different note once, in room order. Printed on the confirmation and the cancellation notice.';

-- The guest's requests, as the guest documents print them.
create or replace function ypl.stay_request_notes(p_reservationid integer)
returns text
language sql
stable
as $$
  select nullif(trim(rg.rgnotes), '')
    from ypl.v_reservation_summary s
    join ypl.reservation_guests rg on rg.reservationguestid = s.primary_reservationguestid
   where s.reservationid = p_reservationid;
$$;

-- -----------------------------------------------------------------------------
-- The latest deposit received, read once for both guest documents
-- -----------------------------------------------------------------------------

create or replace function ypl.latest_deposit_received(p_reservationid integer)
returns table (amount numeric, paid_on date)
language sql
stable
as $$
  select ypl.money_amount(p.paymentamountcdn, p.paymentamount),
         p.paymentdate::date
    from ypl.payments p
    join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
   where rg.reservationid = p_reservationid
     and p.paymentcategory = 'Deposit (Received)'
     and not p.paymentarchive
   order by p.paymentdate desc nulls last, p.paymentid desc
   limit 1;
$$;

-- -----------------------------------------------------------------------------
-- The confirmation: occupancy notes and requests, never the reservation's notes
-- -----------------------------------------------------------------------------

drop function if exists ypl.report_reservation_confirmation(integer);
create function ypl.report_reservation_confirmation(p_reservationid integer)
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
  date_confirmed date,
  arrival_date date,
  departure_date date,
  room text,
  in_date date,
  out_date date,
  guest_count integer,
  occupancy_notes text,
  deposit_amount numeric,
  deposit_date date,
  diet_notes text,
  housekeeping_notes text,
  request_notes text
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
         s.resdateconfirmed::date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         first_occ.room,
         first_occ.in_date,
         first_occ.out_date,
         coalesce(first_occ.guest_count, s.numadults + coalesce(s.numchildren, 0)),
         ypl.stay_occupancy_notes(s.reservationid),
         dep.amount,
         dep.paid_on,
         ypl.stay_diet_notes(s.reservationid),
         ypl.stay_housekeeping_notes(s.reservationid),
         ypl.stay_request_notes(s.reservationid)
    from ypl.v_reservation_summary s
    left join lateral (
      select r.room, r.in_date, r.out_date, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
       limit 1
    ) first_occ on true
    left join lateral ypl.latest_deposit_received(s.reservationid) dep on true
   where s.reservationid = p_reservationid;
$$;

comment on function ypl.report_reservation_confirmation is
  'Reservation confirmation slip: party, mailing details, the first room of the stay, its occupancy notes, the latest deposit, and the diet, housekeeping notes and requests on file so the guest can check them. The reservation''s own notes never print.';

-- -----------------------------------------------------------------------------
-- The cancellation notice: occupancy notes, never the reservation's notes
-- -----------------------------------------------------------------------------

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
  deposit_outcome_date date,
  occupancy_notes text
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
         outcome.deposit_outcome_date,
         ypl.stay_occupancy_notes(s.reservationid)
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
  'Cancellation notice for a cancelled reservation, with the occupancy notes of its rooms; an active one has none. The reservation''s own notes never print.';

-- The note typed when cancelling prints on the notice, so it is added to the
-- occupancy notes of the room the notice names, the stay's first. A stay that
-- holds no room (the daily sales accounts) keeps it in its own notes.
create or replace function ypl.cancel_reservation(
  p_reservationid integer,
  p_date date default current_date,
  p_deposit_handling text default 'none',
  p_notes text default null
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
    perform ypl.settle_deposit(p_reservationid, p_date, p_deposit_handling);
  end if;
end;
$$;

comment on function ypl.cancel_reservation is
  'Cancels a reservation, adds the cancellation note to the occupancy notes of its first room (where the notice prints it), and refunds or keeps any deposit still held (settle_deposit). With none, the deposit stays held until it is settled.';

-- -----------------------------------------------------------------------------
-- Requests reports
-- -----------------------------------------------------------------------------

-- Everyone at the lodge on a day, as the In House report lists them, whose
-- stay carries a request.
create or replace function ypl.report_requests(p_date date)
returns table (
  resnumber integer,
  guest text,
  rooms text,
  arrival_date date,
  departure_date date,
  request text
)
language sql
stable
as $$
  select o.resnumber,
         o.guest_name,
         string_agg(o.room, ', ' order by o.occupancyin, o.roomorder nulls last, o.occupancyid),
         o.resarrivaldate::date,
         o.resdeparturedate::date,
         trim(rg.rgnotes)
    from ypl.rooms_held(p_date) o
    join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
   where nullif(trim(rg.rgnotes), '') is not null
   group by o.reservationid, o.resnumber, o.guest_name, o.guestlastname, o.guestfirstname,
            o.resarrivaldate, o.resdeparturedate, rg.rgnotes
   order by o.guestlastname, o.guestfirstname, o.resnumber;
$$;

comment on function ypl.report_requests is
  'Requests report for a day: every stay at the lodge that day (the In House set) with a request, by guest name.';

-- One guest's requests, stay by stay in date order. A cancelled stay's
-- requests never happened, so they are left out.
create or replace function ypl.report_guest_requests(p_guestid integer)
returns table (
  resnumber integer,
  arrival_date date,
  departure_date date,
  rooms text,
  request text
)
language sql
stable
as $$
  select r.resnumber,
         r.resarrivaldate::date,
         r.resdeparturedate::date,
         (select string_agg(sr.room, ', ' order by sr.n)
            from ypl.report_stay_rooms(r.reservationid) with ordinality sr(occupancyid, room, in_date, out_date, guest_count, n)),
         trim(rg.rgnotes)
    from ypl.reservation_guests rg
    join ypl.reservations r on r.reservationid = rg.reservationid
   where rg.guestid = p_guestid
     and not rg.rgarchive
     and not r.resarchive
     and not r.rescancelled
     and nullif(trim(rg.rgnotes), '') is not null
   order by r.resarrivaldate, r.resnumber;
$$;

comment on function ypl.report_guest_requests is
  'A guest''s requests across their stays, oldest first; cancelled stays left out.';

-- -----------------------------------------------------------------------------
-- Cleanup
-- -----------------------------------------------------------------------------

drop function if exists ypl.archive_housekeeping_note(integer);
drop function if exists ypl.archive_kitchen_meal(integer);

create or replace function ypl.report_dcar_summary(p_date date)
returns table (
  business_date date,
  upper_total numeric,
  receipts_total numeric,
  balance_owed numeric,
  manual_adjustments_stored boolean,
  note text
)
language sql
stable
as $$
  select p_date,
         t.upper_total,
         t.receipts_total,
         round(t.upper_total - t.receipts_total, 2),
         false,
         'Access stores calculated DCAR data; actual amounts/adjustments are handwritten on the printed cash sheet unless a future in-app adjustment table is explicitly added.'
    from (select ypl.report_dcar_total(p_date) as upper_total,
                 ypl.report_dcar_receipts_total(p_date) as receipts_total) t;
$$;

comment on function ypl.reservation_balance is
  'Access-compatible reservation balance: transaction charges and taxes less payments on the stay.';

grant execute on all functions in schema ypl to authenticated, service_role;
