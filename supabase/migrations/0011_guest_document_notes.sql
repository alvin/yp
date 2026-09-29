-- =============================================================================
-- 0011_guest_document_notes.sql
-- The diet and housekeeping notes print on both guest documents — the
-- confirmation and the check-in folio — so a party can catch a mistake when the
-- confirmation arrives and confirm their requests again when they sign in.
--
-- 0010 put the diet on the check-in folio only. This round the client asked for
-- both notes on both documents. Each document reads the same record its report
-- does, in the same wording:
--
--   * the diet is what the kitchen report prints (diet, then diet notes, for
--     every guest on the stay),
--   * the housekeeping note is what the housekeeping report prints (the most
--     recent note for each guest on the stay).
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- The notes a stay carries, as the reports print them
-- -----------------------------------------------------------------------------

create or replace function ypl.stay_diet_notes(p_reservationid integer)
returns text
language sql
stable
as $$
  select string_agg(
           trim(concat_ws(' ', nullif(k.guestdiet, ''), nullif(k.kitchenmealnotes, ''))),
           E'\n' order by rg.primaryguest desc, g.guestlastname, g.guestfirstname, k.kitchenmealid
         )
    from ypl.reservation_guests rg
    join ypl.guests g on g.guestid = rg.guestid
    join ypl.kitchen_meals k on k.guestid = g.guestid and not k.kmarchive
   where rg.reservationid = p_reservationid
     and not rg.rgarchive
     and nullif(trim(concat_ws(' ', k.guestdiet, k.kitchenmealnotes)), '') is not null;
$$;

comment on function ypl.stay_diet_notes is
  'The diet the kitchen holds for every guest on a stay, in the kitchen report''s wording, primary guest first. Null when there is none.';

-- The housekeeping report prints the latest note per guest on the stay; so do
-- the guest documents, so the party confirms exactly what housekeeping reads.
create or replace function ypl.stay_housekeeping_notes(p_reservationid integer)
returns text
language sql
stable
as $$
  select string_agg(hk.housekeepingnotes, E'\n'
                    order by rg.primaryguest desc, g.guestlastname, g.guestfirstname)
    from ypl.reservation_guests rg
    join ypl.guests g on g.guestid = rg.guestid
    join lateral (
      select h.housekeepingnotes
        from ypl.housekeeping_notes h
       where h.reservationguestid = rg.reservationguestid
         and not h.hkarchive
       order by h.hknotesdate desc nulls last, h.housekeepingnotesid desc
       limit 1
    ) hk on true
   where rg.reservationid = p_reservationid
     and not rg.rgarchive
     and nullif(trim(coalesce(hk.housekeepingnotes, '')), '') is not null;
$$;

comment on function ypl.stay_housekeeping_notes is
  'The housekeeping note for every guest on a stay — the most recent one each, as the housekeeping report prints it — primary guest first. Null when there is none.';

-- -----------------------------------------------------------------------------
-- Confirmation: gains the diet and the housekeeping note
-- -----------------------------------------------------------------------------

-- Two columns appended; everything the slip already printed is unchanged.
drop function if exists ypl.report_reservation_confirmation(integer);
create function ypl.report_reservation_confirmation(p_reservationid integer)
returns table (
  resnumber integer,
  guest text,
  guest_names text,
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
  reservation_notes text,
  deposit_amount numeric,
  deposit_date date,
  diet_notes text,
  housekeeping_notes text
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         ypl.reservation_guest_names(s.reservationid),
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
         first_occ.occupancyin::date,
         first_occ.occupancyout::date,
         coalesce(first_occ.occupancynumguests, s.numadults + coalesce(s.numchildren, 0)),
         s.resnotes,
         dep.deposit_amount,
         dep.deposit_date,
         ypl.stay_diet_notes(s.reservationid),
         ypl.stay_housekeeping_notes(s.reservationid)
    from ypl.v_reservation_summary s
    left join lateral (
      select o.room, o.occupancyin, o.occupancyout, o.occupancynumguests
        from ypl.v_occupancy_summary o
       where o.reservationid = s.reservationid
       order by o.occupancyin, o.roomorder, o.occupancyid
       limit 1
    ) first_occ on true
    left join lateral (
      select ypl.money_amount(p.paymentamountcdn, p.paymentamount) as deposit_amount,
             p.paymentdate::date as deposit_date
        from ypl.payments p
        join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
       where rg.reservationid = s.reservationid
         and p.paymentcategory = 'Deposit (Received)'
         and not p.paymentarchive
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) dep on true
   where s.reservationid = p_reservationid;
$$;

comment on function ypl.report_reservation_confirmation is
  'Reservation confirmation slip: party, mailing details, the first room of the stay, reservation notes, the latest deposit, and the diet and housekeeping notes on file so the guest can check them.';

-- -----------------------------------------------------------------------------
-- Check-in folio: gains the housekeeping note
-- -----------------------------------------------------------------------------

-- housekeeping_notes is appended; diet_notes reads the shared helper, which is
-- the expression 0010 inlined here.
drop function if exists ypl.report_check_in_folio(integer);
create function ypl.report_check_in_folio(p_reservationid integer)
returns table (
  resnumber integer,
  guest text,
  guest_names text,
  guestaddress varchar,
  guestcity varchar,
  guestregion varchar,
  guestcountry varchar,
  guestpczip varchar,
  phone varchar,
  date_printed date,
  arrival_date date,
  departure_date date,
  room text,
  in_date date,
  out_date date,
  guest_count integer,
  diet_notes text,
  vehicle_description varchar,
  vehicle_license_plate varchar,
  housekeeping_notes text
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         ypl.reservation_guest_names(s.reservationid),
         s.guestaddress,
         s.guestcity,
         s.guestregion,
         s.guestcountry,
         s.guestpczip,
         s.guestprimaryphone,
         current_date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         first_occ.room,
         first_occ.in_date,
         first_occ.out_date,
         coalesce(first_occ.guest_count, s.numadults + coalesce(s.numchildren, 0)),
         ypl.stay_diet_notes(s.reservationid),
         rg.vehicledescription,
         rg.vehiclelicenseplate,
         ypl.stay_housekeeping_notes(s.reservationid)
    from ypl.v_reservation_summary s
    left join ypl.reservation_guests rg on rg.reservationguestid = s.primary_reservationguestid
    left join lateral (
      select r.room, r.in_date, r.out_date, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
       limit 1
    ) first_occ on true
   where s.reservationid = p_reservationid;
$$;

comment on function ypl.report_check_in_folio is
  'Check-in folio header: party, mailing details, the first room of the stay, and the diet and housekeeping notes on file. The rooms of a stay come from report_stay_rooms and the money already received from report_folio_receipts.';

grant execute on all functions in schema ypl to authenticated, service_role;
