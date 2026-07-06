-- =============================================================================
-- 0005_business_logic.sql
-- Yellow Point Lodge — business logic expressed in the database layer.
-- =============================================================================
-- The database must stay consistent no matter how rows are written (app RPCs,
-- Supabase table editor, SQL editor, imports). Everything the old Access forms
-- calculated automatically is therefore enforced here with triggers:
--
--   * reservations   — resnumber assignment, numnights, one-year booking
--                      horizon, confirmation/cancellation date consistency
--   * reservation_guests — check-in/out defaults from the reservation,
--                      single primary guest per reservation
--   * transactions   — amount auto-complete from the price list and
--                      tax amounts from room/inventory tax flags × the
--                      tax rate effective on the transaction date
--   * payments       — payment code from the category, payment date default,
--                      CDN conversion from the effective exchange rate,
--                      refund sign normalization stays with the caller RPCs
--   * room_assignments — date validation and guest-count defaults
--
-- Workflow RPCs then give the app (and power users) one obvious, safe entry
-- point per front-desk action. Triggers still run underneath them, so the two
-- paths can never disagree.
--
-- Legacy-import safety: triggers only fill values that are missing and only
-- recompute derived values when their inputs change, so the air-gapped Access
-- import (which supplies every stored value) loads losslessly.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Column defaults so direct table-editor inserts behave like the app
-- -----------------------------------------------------------------------------

alter table ypl.guests
  alter column guestvoid set default false,
  alter column guestarchive set default false;

alter table ypl.reservations
  alter column resconfirmed set default false,
  alter column rescancelled set default false,
  alter column resarchive set default false,
  alter column numrooms set default 1,
  alter column numadults set default 2,
  alter column numchildren set default 0;

alter table ypl.reservation_guests
  alter column primaryguest set default false,
  alter column guestinhouse set default false,
  alter column rgarchive set default false,
  alter column percentageofbill set default 0;

alter table ypl.room_assignments
  alter column occupancyarchive set default false;

alter table ypl.transactions
  alter column transquantity set default 1,
  alter column transarchive set default false;

alter table ypl.payments
  alter column paymentcurrency set default 'Canadian',
  alter column paymentarchive set default false;

alter table ypl.housekeeping_notes
  alter column hkarchive set default false;

alter table ypl.kitchen_meals
  alter column kmarchive set default false;

-- -----------------------------------------------------------------------------
-- Effective-rate helpers (tax, exchange, room rate)
-- -----------------------------------------------------------------------------

create or replace function ypl.effective_tax_rate(p_taxratetype text, p_date date)
returns numeric
language sql
stable
as $$
  select coalesce(
    (select t.taxrate::numeric
       from ypl.tax_rates t
      where t.taxratetype = p_taxratetype
        and not t.taxratearchive
        and p_date between t.taxratestartdate::date and t.taxrateenddate::date
      order by t.taxratestartdate desc, t.taxrateid desc
      limit 1),
    0);
$$;

comment on function ypl.effective_tax_rate is
  'Tax rate (fraction) of the given type effective on a date, from ypl.tax_rates. 0 when no rate row covers the date.';

create or replace function ypl.effective_exchange_rate(p_date date)
returns numeric
language sql
stable
as $$
  select coalesce(
    (select e.exchangerate::numeric
       from ypl.exchange_rates e
      where not e.exchangeratearchive
        and p_date between e.exchangeratestartdate::date and e.exchangerateenddate::date
      order by e.exchangeratestartdate desc, e.exchangerateid desc
      limit 1),
    (select e.exchangerate::numeric
       from ypl.exchange_rates e
      where not e.exchangeratearchive
        and e.exchangeratestartdate::date <= p_date
      order by e.exchangeratestartdate desc, e.exchangerateid desc
      limit 1),
    1.0);
$$;

comment on function ypl.effective_exchange_rate is
  'US→CDN exchange rate effective on a date; falls back to the most recent earlier rate, then 1.0.';

create or replace function ypl.effective_room_rate(p_roomid integer, p_date date)
returns numeric
language sql
stable
as $$
  select r.roomrate::numeric
    from ypl.room_rates r
   where r.roomid = p_roomid
     and not r.roomratearchive
     and p_date between r.roomratestartdate::date and r.roomrateenddate::date
   order by r.roomratestartdate desc, r.roomrateid desc
   limit 1;
$$;

comment on function ypl.effective_room_rate is
  'Nightly room rate effective on a date, from ypl.room_rates. Null when no rate row covers the date.';

-- -----------------------------------------------------------------------------
-- Reservation numbers
-- -----------------------------------------------------------------------------

create sequence if not exists ypl.resnumber_seq;

create or replace function ypl.next_resnumber()
returns integer
language plpgsql
volatile
as $$
declare
  v_max integer;
  v_next integer;
begin
  -- Keep the sequence ahead of imported data, then skip any number already used.
  select coalesce(max(r.resnumber), 100000) into v_max from ypl.reservations r;
  if (select s.last_value from ypl.resnumber_seq s) < v_max then
    perform setval('ypl.resnumber_seq', v_max);
  end if;
  loop
    v_next := nextval('ypl.resnumber_seq');
    exit when not exists (select 1 from ypl.reservations r where r.resnumber = v_next);
  end loop;
  return v_next;
end;
$$;

comment on function ypl.next_resnumber is
  'Next in-house reservation number. Import-safe: always advances past the highest stored resnumber.';

-- -----------------------------------------------------------------------------
-- Trigger: reservations — automatic entry fields and policy checks
-- -----------------------------------------------------------------------------

create or replace function ypl.reservations_autofill()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.resbookingdate is null then
      new.resbookingdate := current_date;
    end if;
    if new.resnumber is null or new.resnumber = 0 then
      new.resnumber := ypl.next_resnumber();
    end if;
  end if;

  if new.resdeparturedate::date <= new.resarrivaldate::date then
    raise exception 'Departure date must be after arrival date';
  end if;

  -- Access: "Automatic entry. Number of nights party is staying."
  new.numnights := new.resdeparturedate::date - new.resarrivaldate::date;

  -- Reservation policy: stays are stored only one year in advance.
  if new.resarrivaldate::date >
     (greatest(coalesce(new.resbookingdate::date, current_date), current_date) + interval '1 year')::date then
    raise exception 'Reservations are stored only one year in advance (arrival % is past the policy horizon)',
      new.resarrivaldate::date;
  end if;

  if new.resconfirmed and new.resdateconfirmed is null then
    new.resdateconfirmed := current_date;
  end if;

  if new.rescancelled and new.resdatecancelled is null then
    new.resdatecancelled := current_date;
  elsif not new.rescancelled then
    new.resdatecancelled := null;
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_autofill on ypl.reservations;
create trigger reservations_autofill
  before insert or update on ypl.reservations
  for each row execute function ypl.reservations_autofill();

-- When the stay dates move, reservation guests that tracked the old dates move
-- with them (their check-in/out defaults come from the reservation).
create or replace function ypl.reservations_sync_guest_dates()
returns trigger
language plpgsql
as $$
begin
  if new.resarrivaldate::date is distinct from old.resarrivaldate::date then
    update ypl.reservation_guests rg
       set checkindate = new.resarrivaldate
     where rg.reservationid = new.reservationid
       and rg.checkindate::date = old.resarrivaldate::date
       and not rg.rgarchive;
  end if;
  if new.resdeparturedate::date is distinct from old.resdeparturedate::date then
    update ypl.reservation_guests rg
       set checkoutdate = new.resdeparturedate
     where rg.reservationid = new.reservationid
       and rg.checkoutdate::date = old.resdeparturedate::date
       and not rg.rgarchive;
  end if;
  return null;
end;
$$;

drop trigger if exists reservations_sync_guest_dates on ypl.reservations;
create trigger reservations_sync_guest_dates
  after update of resarrivaldate, resdeparturedate on ypl.reservations
  for each row execute function ypl.reservations_sync_guest_dates();

-- -----------------------------------------------------------------------------
-- Trigger: reservation_guests — defaults from the reservation, single primary
-- -----------------------------------------------------------------------------

create or replace function ypl.reservation_guests_autofill()
returns trigger
language plpgsql
as $$
declare
  v_res ypl.reservations;
begin
  if tg_op = 'INSERT' then
    select * into v_res from ypl.reservations r where r.reservationid = new.reservationid;
    if new.checkindate is null then
      new.checkindate := v_res.resarrivaldate;
    end if;
    if new.checkoutdate is null then
      new.checkoutdate := v_res.resdeparturedate;
    end if;
    if new.primaryguest is null then
      new.primaryguest := not exists (
        select 1 from ypl.reservation_guests rg
         where rg.reservationid = new.reservationid
           and rg.primaryguest
           and not rg.rgarchive);
    end if;
    if new.percentageofbill is null then
      new.percentageofbill := case when new.primaryguest then 100 else 0 end;
    end if;
    if new.guestinhouse is null then
      new.guestinhouse := false;
    end if;
    if new.rgarchive is null then
      new.rgarchive := false;
    end if;
  end if;

  if new.checkoutdate::date < new.checkindate::date then
    raise exception 'Check-out date must not be before check-in date';
  end if;

  return new;
end;
$$;

drop trigger if exists reservation_guests_autofill on ypl.reservation_guests;
create trigger reservation_guests_autofill
  before insert or update on ypl.reservation_guests
  for each row execute function ypl.reservation_guests_autofill();

create or replace function ypl.reservation_guests_single_primary()
returns trigger
language plpgsql
as $$
begin
  if new.primaryguest then
    update ypl.reservation_guests rg
       set primaryguest = false
     where rg.reservationid = new.reservationid
       and rg.reservationguestid <> new.reservationguestid
       and rg.primaryguest;
  end if;
  return null;
end;
$$;

drop trigger if exists reservation_guests_single_primary on ypl.reservation_guests;
create trigger reservation_guests_single_primary
  after insert or update of primaryguest on ypl.reservation_guests
  for each row execute function ypl.reservation_guests_single_primary();

-- -----------------------------------------------------------------------------
-- Trigger: room_assignments — date validation and guest-count default
-- -----------------------------------------------------------------------------

create or replace function ypl.room_assignments_autofill()
returns trigger
language plpgsql
as $$
begin
  if new.occupancyout::date < new.occupancyin::date then
    raise exception 'Occupancy end date must not be before its start date';
  end if;
  if tg_op = 'INSERT' and new.occupancynumguests is null then
    select r.numadults + coalesce(r.numchildren, 0)
      into new.occupancynumguests
      from ypl.reservation_guests rg
      join ypl.reservations r on r.reservationid = rg.reservationid
     where rg.reservationguestid = new.reservationguestid;
  end if;
  return new;
end;
$$;

drop trigger if exists room_assignments_autofill on ypl.room_assignments;
create trigger room_assignments_autofill
  before insert or update on ypl.room_assignments
  for each row execute function ypl.room_assignments_autofill();

-- -----------------------------------------------------------------------------
-- Trigger: transactions — auto-complete amount and tax amounts
-- -----------------------------------------------------------------------------
-- Access marks transamount "Auto-completed field" (price list) and every tax
-- column "Auto-calculated and completed field". The amount is only filled when
-- missing, so manual price overrides always stick. Taxes recompute whenever the
-- taxable basis changes; an insert that already carries tax amounts (the legacy
-- import) is preserved as stored.

create or replace function ypl.transactions_autofill()
returns trigger
language plpgsql
as $$
declare
  v_gst boolean := false;
  v_pst boolean := false;
  v_hst boolean := false;
  v_lt  boolean := false;
  v_rt  boolean := false;
  v_ht  boolean := false;
  v_dmt boolean := false;
  v_basis_changed boolean;
  v_has_explicit_taxes boolean;
  v_date date;
begin
  if new.transdate is null then
    new.transdate := current_date;
  end if;
  if new.transquantity is null then
    new.transquantity := 1;
  end if;
  if new.transarchive is null then
    new.transarchive := false;
  end if;

  -- Auto-complete the amount from the price list when not supplied.
  if new.transamount is null then
    if new.inventoryid is not null then
      select round(coalesce(i.invamount, 0) * new.transquantity, 2)
        into new.transamount
        from ypl.inventory_items i
       where i.inventoryid = new.inventoryid;
    elsif new.roomid is not null then
      new.transamount :=
        round(coalesce(ypl.effective_room_rate(new.roomid, new.transdate::date), 0) * new.transquantity, 2);
    end if;
  end if;

  v_has_explicit_taxes :=
    new.transgstamount is not null or new.transpstamount is not null or
    new.transhstamount is not null or new.transltamount  is not null or
    new.transrtamount  is not null or new.transhtamount  is not null or
    new.transdmtamount is not null;

  if tg_op = 'INSERT' then
    -- Preserve stored tax amounts (legacy import) when the row brings its own.
    if v_has_explicit_taxes then
      return new;
    end if;
    v_basis_changed := true;
  else
    v_basis_changed :=
      new.transamount   is distinct from old.transamount   or
      new.transdate     is distinct from old.transdate     or
      new.inventoryid   is distinct from old.inventoryid   or
      new.roomid        is distinct from old.roomid        or
      new.transtype     is distinct from old.transtype     or
      new.transquantity is distinct from old.transquantity;
    if not v_basis_changed then
      return new;
    end if;
  end if;

  -- Tax flags come from the room (room-night lines) or the inventory item.
  if new.roomid is not null then
    select r.roomgst, r.roompst, r.roomhst, false, r.roomrt, r.roomht, r.roomdmt
      into v_gst, v_pst, v_hst, v_lt, v_rt, v_ht, v_dmt
      from ypl.rooms r
     where r.roomid = new.roomid;
  elsif new.inventoryid is not null then
    select i.invgst, i.invpst, i.invhst, i.invlt, i.invrt, i.invht, i.invdmt
      into v_gst, v_pst, v_hst, v_lt, v_rt, v_ht, v_dmt
      from ypl.inventory_items i
     where i.inventoryid = new.inventoryid;
  end if;

  v_date := new.transdate::date;
  new.transgstamount := case when coalesce(v_gst, false) then round(coalesce(new.transamount, 0) * ypl.effective_tax_rate('GST', v_date), 2) else 0 end;
  new.transpstamount := case when coalesce(v_pst, false) then round(coalesce(new.transamount, 0) * ypl.effective_tax_rate('PST', v_date), 2) else 0 end;
  new.transhstamount := case when coalesce(v_hst, false) then round(coalesce(new.transamount, 0) * ypl.effective_tax_rate('HST', v_date), 2) else 0 end;
  new.transltamount  := case when coalesce(v_lt, false)  then round(coalesce(new.transamount, 0) * ypl.effective_tax_rate('Liquor', v_date), 2) else 0 end;
  new.transrtamount  := case when coalesce(v_rt, false)  then round(coalesce(new.transamount, 0) * ypl.effective_tax_rate('Room', v_date), 2) else 0 end;
  new.transhtamount  := case when coalesce(v_ht, false)  then round(coalesce(new.transamount, 0) * ypl.effective_tax_rate('Hotel', v_date), 2) else 0 end;
  new.transdmtamount := case when coalesce(v_dmt, false) then round(coalesce(new.transamount, 0) * ypl.effective_tax_rate('DMT', v_date), 2) else 0 end;

  return new;
end;
$$;

drop trigger if exists transactions_autofill on ypl.transactions;
create trigger transactions_autofill
  before insert or update on ypl.transactions
  for each row execute function ypl.transactions_autofill();

-- -----------------------------------------------------------------------------
-- Trigger: payments — payment code, date default, CDN conversion
-- -----------------------------------------------------------------------------
-- Access: "Automatically generated field - if payment in US, db does conversion
-- to Cdn and updates this field. If payment in Cdn, db transfers amount from
-- PaymentAmount to this field."

create or replace function ypl.payments_autofill()
returns trigger
language plpgsql
as $$
declare
  v_recalc boolean;
begin
  if new.paymentdate is null then
    new.paymentdate := current_date;
  end if;
  if new.paymentcurrency is null or trim(new.paymentcurrency) = '' then
    new.paymentcurrency := 'Canadian';
  end if;
  if new.paymentarchive is null then
    new.paymentarchive := false;
  end if;

  -- Keep the payment code derived from the category.
  if new.paymentcode is null
     or (tg_op = 'UPDATE' and new.paymentcategory is distinct from old.paymentcategory) then
    select coalesce(pc.paymentcode, new.paymentcode)
      into new.paymentcode
      from ypl.lookup_payment_categories pc
     where pc.paymentcategory = new.paymentcategory;
    if new.paymentcode is null then
      raise exception 'Unknown payment category "%" (no payment code found)', new.paymentcategory;
    end if;
  end if;

  v_recalc := new.paymentamountcdn is null
    or (tg_op = 'UPDATE' and (
          new.paymentamount   is distinct from old.paymentamount or
          new.paymentcurrency is distinct from old.paymentcurrency or
          new.paymentdate     is distinct from old.paymentdate));

  if v_recalc then
    if new.paymentamount is null then
      new.paymentamountcdn := null;
    elsif upper(left(trim(new.paymentcurrency), 1)) = 'U' then
      new.paymentamountcdn :=
        round(new.paymentamount * ypl.effective_exchange_rate(new.paymentdate::date), 2);
    else
      new.paymentamountcdn := new.paymentamount;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_autofill on ypl.payments;
create trigger payments_autofill
  before insert or update on ypl.payments
  for each row execute function ypl.payments_autofill();

-- -----------------------------------------------------------------------------
-- Trigger: housekeeping_notes — note date default
-- -----------------------------------------------------------------------------

create or replace function ypl.housekeeping_notes_autofill()
returns trigger
language plpgsql
as $$
begin
  if new.hknotesdate is null then
    new.hknotesdate := current_date;
  end if;
  return new;
end;
$$;

drop trigger if exists housekeeping_notes_autofill on ypl.housekeeping_notes;
create trigger housekeeping_notes_autofill
  before insert on ypl.housekeeping_notes
  for each row execute function ypl.housekeeping_notes_autofill();

-- =============================================================================
-- Workflow RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Guests
-- -----------------------------------------------------------------------------

create or replace function ypl.create_guest(
  p_lastname text,
  p_firstname text default null,
  p_salutation text default null,
  p_address text default null,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_pczip text default null,
  p_primaryphone text default null,
  p_primaryphonetype text default null,
  p_secondaryphone text default null,
  p_secondaryphonetype text default null,
  p_email text default null,
  p_company text default null,
  p_notes text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_guestid integer;
begin
  if nullif(trim(p_lastname), '') is null then
    raise exception 'Guest last name is required';
  end if;
  insert into ypl.guests (
    guestsalutation, guestfirstname, guestlastname, guestaddress, guestcity,
    guestregion, guestcountry, guestpczip, guestprimaryphone, guestprimaryphonetype,
    guestsecondaryphone, guestsecondaryphonetype, guestemailaddress, guestcompany,
    guestvoid, guestnotes, guestarchive
  ) values (
    p_salutation, p_firstname, trim(p_lastname), p_address, p_city,
    p_region, p_country, p_pczip, p_primaryphone, p_primaryphonetype,
    p_secondaryphone, p_secondaryphonetype, p_email, p_company,
    false, p_notes, false
  )
  returning guestid into v_guestid;
  return v_guestid;
end;
$$;

create or replace function ypl.update_guest(
  p_guestid integer,
  p_lastname text default null,
  p_firstname text default null,
  p_salutation text default null,
  p_address text default null,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_pczip text default null,
  p_primaryphone text default null,
  p_primaryphonetype text default null,
  p_secondaryphone text default null,
  p_secondaryphonetype text default null,
  p_email text default null,
  p_company text default null
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.guests g
     set guestlastname = coalesce(nullif(trim(p_lastname), ''), g.guestlastname),
         guestfirstname = coalesce(p_firstname, g.guestfirstname),
         guestsalutation = coalesce(p_salutation, g.guestsalutation),
         guestaddress = coalesce(p_address, g.guestaddress),
         guestcity = coalesce(p_city, g.guestcity),
         guestregion = coalesce(p_region, g.guestregion),
         guestcountry = coalesce(p_country, g.guestcountry),
         guestpczip = coalesce(p_pczip, g.guestpczip),
         guestprimaryphone = coalesce(p_primaryphone, g.guestprimaryphone),
         guestprimaryphonetype = coalesce(p_primaryphonetype, g.guestprimaryphonetype),
         guestsecondaryphone = coalesce(p_secondaryphone, g.guestsecondaryphone),
         guestsecondaryphonetype = coalesce(p_secondaryphonetype, g.guestsecondaryphonetype),
         guestemailaddress = coalesce(p_email, g.guestemailaddress),
         guestcompany = coalesce(p_company, g.guestcompany)
   where g.guestid = p_guestid;
  if not found then
    raise exception 'Guest % not found', p_guestid;
  end if;
end;
$$;

create or replace function ypl.set_guest_notes(
  p_guestid integer,
  p_notes text
) returns void
language plpgsql
volatile
as $$
begin
  -- Guest notes are office-facing only; report RPCs never read this column.
  update ypl.guests g
     set guestnotes = nullif(trim(coalesce(p_notes, '')), '')
   where g.guestid = p_guestid;
  if not found then
    raise exception 'Guest % not found', p_guestid;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reservations
-- -----------------------------------------------------------------------------

create or replace function ypl.create_reservation(
  p_guestid integer,
  p_arrival date,
  p_departure date,
  p_bookedby text,
  p_numadults integer default 2,
  p_numchildren integer default 0,
  p_numrooms integer default 1,
  p_bedtype text default 'Double',
  p_arrivaltime text default null,
  p_groupname text default null,
  p_notes text default null,
  p_roomid integer default null,
  p_numguests integer default null
) returns table (reservationid integer, resnumber integer, reservationguestid integer)
language plpgsql
volatile
as $$
declare
  v_res ypl.reservations;
  v_rgid integer;
begin
  insert into ypl.reservations (
    resbookedby, resgroupname, resarrivaldate, resdeparturedate,
    numrooms, numadults, numchildren,
    resconfirmed, rescancelled, resnotes, resarchive, resarrivaltime, bedtype
  ) values (
    upper(trim(p_bookedby)), p_groupname, p_arrival, p_departure,
    coalesce(p_numrooms, 1), coalesce(p_numadults, 2), coalesce(p_numchildren, 0),
    false, false, p_notes, false, p_arrivaltime, coalesce(p_bedtype, 'Double')
  )
  returning * into v_res;

  insert into ypl.reservation_guests (
    reservationid, guestid, primaryguest, checkindate, checkoutdate,
    guestinhouse, percentageofbill, rgarchive
  ) values (
    v_res.reservationid, p_guestid, true, p_arrival, p_departure,
    false, 100, false
  )
  returning ypl.reservation_guests.reservationguestid into v_rgid;

  if p_roomid is not null then
    insert into ypl.room_assignments (
      reservationguestid, roomid, occupancyin, occupancyout,
      occupancynumguests, occupancyarchive
    ) values (
      v_rgid, p_roomid, p_arrival, p_departure,
      coalesce(p_numguests, coalesce(p_numadults, 2) + coalesce(p_numchildren, 0)), false
    );
  end if;

  return query select v_res.reservationid, v_res.resnumber, v_rgid;
end;
$$;

comment on function ypl.create_reservation is
  'Creates the reservation header, its primary reservation guest, and (optionally) the first room assignment in one call.';

create or replace function ypl.update_reservation(
  p_reservationid integer,
  p_arrival date default null,
  p_departure date default null,
  p_numadults integer default null,
  p_numchildren integer default null,
  p_numrooms integer default null,
  p_bedtype text default null,
  p_arrivaltime text default null,
  p_groupname text default null,
  p_bookedby text default null
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.reservations r
     set resarrivaldate = coalesce(p_arrival, r.resarrivaldate),
         resdeparturedate = coalesce(p_departure, r.resdeparturedate),
         numadults = coalesce(p_numadults, r.numadults),
         numchildren = coalesce(p_numchildren, r.numchildren),
         numrooms = coalesce(p_numrooms, r.numrooms),
         bedtype = coalesce(p_bedtype, r.bedtype),
         resarrivaltime = coalesce(p_arrivaltime, r.resarrivaltime),
         resgroupname = coalesce(p_groupname, r.resgroupname),
         resbookedby = coalesce(upper(trim(p_bookedby)), r.resbookedby)
   where r.reservationid = p_reservationid;
  if not found then
    raise exception 'Reservation % not found', p_reservationid;
  end if;
end;
$$;

create or replace function ypl.confirm_reservation(
  p_reservationid integer,
  p_confirmed boolean default true,
  p_date date default current_date
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.reservations r
     set resconfirmed = p_confirmed,
         resdateconfirmed = case when p_confirmed then coalesce(p_date, current_date) else null end
   where r.reservationid = p_reservationid;
  if not found then
    raise exception 'Reservation % not found', p_reservationid;
  end if;
end;
$$;

create or replace function ypl.set_reservation_notes(
  p_reservationid integer,
  p_notes text
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.reservations r
     set resnotes = nullif(trim(coalesce(p_notes, '')), '')
   where r.reservationid = p_reservationid;
  if not found then
    raise exception 'Reservation % not found', p_reservationid;
  end if;
end;
$$;

-- Net deposit still held against one reservation guest: deposits received plus
-- refund rows (stored negative), less deposits applied to the bill or kept.
create or replace function ypl.reservationguest_deposit_held(p_reservationguestid integer)
returns numeric
language sql
stable
as $$
  select coalesce(round(sum(case p.paymentcategory
           when 'Deposit (Received)' then ypl.money_amount(p.paymentamountcdn, p.paymentamount)
           when 'Deposit (Refund)'   then ypl.money_amount(p.paymentamountcdn, p.paymentamount)
           when 'Deposit (Applied)'  then -ypl.money_amount(p.paymentamountcdn, p.paymentamount)
           when 'Deposit (Kept)'     then -ypl.money_amount(p.paymentamountcdn, p.paymentamount)
           else 0 end), 2), 0)
    from ypl.payments p
   where p.reservationguestid = p_reservationguestid
     and not p.paymentarchive;
$$;

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
  v_rg record;
  v_net numeric;
  v_type text;
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

  if p_deposit_handling = 'none' then
    return;
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
  end loop;
end;
$$;

comment on function ypl.cancel_reservation is
  'Cancels a reservation and optionally refunds or keeps any deposit still held, writing the offsetting payment rows so daily cash stays balanced and traceable.';

create or replace function ypl.rebook_reservation(
  p_reservationid integer,
  p_arrival date,
  p_departure date,
  p_bookedby text,
  p_transfer_deposits boolean default true,
  p_cancel_original boolean default true
) returns table (reservationid integer, resnumber integer)
language plpgsql
volatile
as $$
declare
  v_old ypl.reservations;
  v_new ypl.reservations;
  v_rg record;
  v_new_rgid integer;
  v_net numeric;
  v_type text;
begin
  select * into v_old from ypl.reservations r where r.reservationid = p_reservationid;
  if not found then
    raise exception 'Reservation % not found', p_reservationid;
  end if;

  insert into ypl.reservations (
    resbookedby, resgroupname, resarrivaldate, resdeparturedate,
    numrooms, numadults, numchildren,
    resconfirmed, rescancelled, resnotes, resarchive, resarrivaltime, bedtype
  ) values (
    upper(trim(p_bookedby)), v_old.resgroupname, p_arrival, p_departure,
    v_old.numrooms, v_old.numadults, v_old.numchildren,
    false, false, 'Re-booked from #' || v_old.resnumber, false, null, v_old.bedtype
  )
  returning * into v_new;

  for v_rg in
    select rg.*
      from ypl.reservation_guests rg
     where rg.reservationid = p_reservationid
       and not rg.rgarchive
     order by rg.primaryguest desc, rg.reservationguestid
  loop
    insert into ypl.reservation_guests (
      reservationid, guestid, primaryguest, checkindate, checkoutdate,
      guestinhouse, percentageofbill, vehicledescription, vehiclelicenseplate,
      rgnotes, rgarchive
    ) values (
      v_new.reservationid, v_rg.guestid, v_rg.primaryguest, p_arrival, p_departure,
      false, v_rg.percentageofbill, v_rg.vehicledescription, v_rg.vehiclelicenseplate,
      v_rg.rgnotes, false
    )
    returning ypl.reservation_guests.reservationguestid into v_new_rgid;

    if p_transfer_deposits then
      v_net := ypl.reservationguest_deposit_held(v_rg.reservationguestid);
      if v_net > 0 then
        select p.paymenttype into v_type
          from ypl.payments p
         where p.reservationguestid = v_rg.reservationguestid
           and p.paymentcategory = 'Deposit (Received)'
           and not p.paymentarchive
         order by p.paymentdate desc, p.paymentid desc
         limit 1;

        insert into ypl.payments (
          reservationguestid, paymentcategory, paymenttype, paymentdate,
          paymentamount, paymentcurrency, paymentnotes, paymentarchive
        ) values (
          v_rg.reservationguestid, 'Deposit (Refund)', coalesce(v_type, 'Cheque'),
          current_date, -v_net, 'Canadian',
          'Deposit transferred to #' || v_new.resnumber, false
        );
        insert into ypl.payments (
          reservationguestid, paymentcategory, paymenttype, paymentdate,
          paymentamount, paymentcurrency, paymentnotes, paymentarchive
        ) values (
          v_new_rgid, 'Deposit (Received)', coalesce(v_type, 'Cheque'),
          current_date, v_net, 'Canadian',
          'Deposit transferred from #' || v_old.resnumber, false
        );
      end if;
    end if;
  end loop;

  if p_cancel_original then
    update ypl.reservations r
       set rescancelled = true,
           resdatecancelled = current_date,
           resnotes = case
             when r.resnotes is null then 'Re-booked as #' || v_new.resnumber
             else r.resnotes || E'\nRe-booked as #' || v_new.resnumber
           end
     where r.reservationid = p_reservationid;
  end if;

  return query select v_new.reservationid, v_new.resnumber;
end;
$$;

comment on function ypl.rebook_reservation is
  'Creates a new reservation for the same guests with new dates, transferring held deposits with an offsetting refund/received pair, and (by default) cancelling the original.';

-- -----------------------------------------------------------------------------
-- Reservation guests
-- -----------------------------------------------------------------------------

create or replace function ypl.add_reservation_guest(
  p_reservationid integer,
  p_guestid integer,
  p_primaryguest boolean default false,
  p_percentageofbill integer default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_rgid integer;
begin
  insert into ypl.reservation_guests (
    reservationid, guestid, primaryguest, guestinhouse, percentageofbill, rgarchive
  ) values (
    p_reservationid, p_guestid, coalesce(p_primaryguest, false), false,
    coalesce(p_percentageofbill, case when coalesce(p_primaryguest, false) then 100 else 0 end),
    false
  )
  returning ypl.reservation_guests.reservationguestid into v_rgid;
  return v_rgid;
end;
$$;

create or replace function ypl.update_reservation_guest(
  p_reservationguestid integer,
  p_checkindate date default null,
  p_checkoutdate date default null,
  p_checkintime text default null,
  p_checkouttime text default null,
  p_guestinhouse boolean default null,
  p_percentageofbill integer default null,
  p_vehicledescription text default null,
  p_vehiclelicenseplate text default null,
  p_rgnotes text default null
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.reservation_guests rg
     set checkindate = coalesce(p_checkindate, rg.checkindate),
         checkoutdate = coalesce(p_checkoutdate, rg.checkoutdate),
         checkintime = case when p_checkintime is null then rg.checkintime
                            else coalesce(p_checkindate, rg.checkindate::date) + p_checkintime::time end,
         checkouttime = case when p_checkouttime is null then rg.checkouttime
                             else coalesce(p_checkoutdate, rg.checkoutdate::date) + p_checkouttime::time end,
         guestinhouse = coalesce(p_guestinhouse, rg.guestinhouse),
         percentageofbill = coalesce(p_percentageofbill, rg.percentageofbill),
         vehicledescription = coalesce(p_vehicledescription, rg.vehicledescription),
         vehiclelicenseplate = coalesce(p_vehiclelicenseplate, rg.vehiclelicenseplate),
         rgnotes = coalesce(p_rgnotes, rg.rgnotes)
   where rg.reservationguestid = p_reservationguestid;
  if not found then
    raise exception 'Reservation guest % not found', p_reservationguestid;
  end if;
end;
$$;

create or replace function ypl.set_guest_in_house(
  p_reservationguestid integer,
  p_inhouse boolean default true
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.reservation_guests rg
     set guestinhouse = p_inhouse
   where rg.reservationguestid = p_reservationguestid;
  if not found then
    raise exception 'Reservation guest % not found', p_reservationguestid;
  end if;
end;
$$;

create or replace function ypl.archive_reservation_guest(p_reservationguestid integer)
returns void
language sql
volatile
as $$
  update ypl.reservation_guests rg
     set rgarchive = true
   where rg.reservationguestid = p_reservationguestid;
$$;

-- -----------------------------------------------------------------------------
-- Rooms and room moves
-- -----------------------------------------------------------------------------

create or replace function ypl.assign_room(
  p_reservationguestid integer,
  p_roomid integer,
  p_occupancyin date,
  p_occupancyout date,
  p_numguests integer default null,
  p_notes text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_occupancyid integer;
begin
  insert into ypl.room_assignments (
    reservationguestid, roomid, occupancyin, occupancyout,
    occupancynumguests, occupancynotes, occupancyarchive
  ) values (
    p_reservationguestid, p_roomid, p_occupancyin, p_occupancyout,
    p_numguests, p_notes, false
  )
  returning occupancyid into v_occupancyid;
  return v_occupancyid;
end;
$$;

create or replace function ypl.record_room_move(
  p_occupancyid integer,
  p_new_roomid integer,
  p_move_date date,
  p_notes text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_old ypl.room_assignments;
  v_new_id integer;
begin
  select * into v_old from ypl.room_assignments o where o.occupancyid = p_occupancyid;
  if not found then
    raise exception 'Room assignment % not found', p_occupancyid;
  end if;
  if p_move_date <= v_old.occupancyin::date or p_move_date >= v_old.occupancyout::date then
    raise exception 'Move date % must fall inside the current occupancy (% to %)',
      p_move_date, v_old.occupancyin::date, v_old.occupancyout::date;
  end if;
  if p_new_roomid = v_old.roomid then
    raise exception 'The new room must differ from the current room';
  end if;

  -- Close the room being left on the move date and open the room being entered,
  -- so both rooms stay visible in the stay history with their move dates.
  update ypl.room_assignments o
     set occupancyout = p_move_date
   where o.occupancyid = p_occupancyid;

  insert into ypl.room_assignments (
    reservationguestid, roomid, occupancyin, occupancyout,
    occupancynumguests, occupancynotes, occupancyarchive
  ) values (
    v_old.reservationguestid, p_new_roomid, p_move_date, v_old.occupancyout,
    v_old.occupancynumguests, p_notes, false
  )
  returning occupancyid into v_new_id;
  return v_new_id;
end;
$$;

comment on function ypl.record_room_move is
  'Records a mid-stay room move: shortens the current occupancy at the move date and opens the new room for the remainder, preserving both rooms in the occupancy history.';

create or replace function ypl.update_room_assignment(
  p_occupancyid integer,
  p_roomid integer default null,
  p_occupancyin date default null,
  p_occupancyout date default null,
  p_numguests integer default null,
  p_notes text default null
) returns void
language plpgsql
volatile
as $$
begin
  update ypl.room_assignments o
     set roomid = coalesce(p_roomid, o.roomid),
         occupancyin = coalesce(p_occupancyin, o.occupancyin),
         occupancyout = coalesce(p_occupancyout, o.occupancyout),
         occupancynumguests = coalesce(p_numguests, o.occupancynumguests),
         occupancynotes = coalesce(p_notes, o.occupancynotes)
   where o.occupancyid = p_occupancyid;
  if not found then
    raise exception 'Room assignment % not found', p_occupancyid;
  end if;
end;
$$;

create or replace function ypl.archive_room_assignment(p_occupancyid integer)
returns void
language sql
volatile
as $$
  update ypl.room_assignments o
     set occupancyarchive = true
   where o.occupancyid = p_occupancyid;
$$;

-- Room-selection help: the full room list (with the brief bed-layout notes kept
-- on ypl.rooms) plus availability for a stay window when one is given.
create or replace function ypl.room_directory(
  p_in date default null,
  p_out date default null
) returns table (
  roomid integer,
  roomnumber varchar,
  roomname varchar,
  roomtype varchar,
  roomcode varchar,
  roomshorthand varchar,
  roomorder real,
  roomnotes text,
  room text,
  room_compact text,
  is_available boolean
)
language sql
stable
as $$
  select r.roomid,
         r.roomnumber,
         r.roomname,
         r.roomtype,
         r.roomcode,
         r.roomshorthand,
         r.roomorder,
         r.roomnotes,
         ypl.room_display(r.roomname, r.roomnumber),
         ypl.room_display_compact(r.roomname, r.roomnumber),
         case
           when p_in is null or p_out is null then true
           else not exists (
             select 1
               from ypl.room_assignments o
               join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
               join ypl.reservations res on res.reservationid = rg.reservationid
              where o.roomid = r.roomid
                and not o.occupancyarchive
                and not rg.rgarchive
                and not res.rescancelled
                and not res.resarchive
                and o.occupancyin::date < p_out
                and o.occupancyout::date > p_in)
         end as is_available
    from ypl.rooms r
   where not r.roomarchive
   order by r.roomorder nulls last, r.roomname, r.roomnumber;
$$;

comment on function ypl.room_directory is
  'Room list in lodge order with display labels and bed-layout notes; flags availability for a stay window when dates are provided.';

-- -----------------------------------------------------------------------------
-- Charges
-- -----------------------------------------------------------------------------

create or replace function ypl.post_room_nights(
  p_reservationguestid integer,
  p_roomid integer,
  p_occupancyin date,
  p_occupancyout date,
  p_rate numeric default null,
  p_transdate date default current_date,
  p_notes text default null
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
  v_rate := coalesce(p_rate, ypl.effective_room_rate(p_roomid, p_transdate));
  if v_rate is null then
    raise exception 'No current room rate found for room % — supply a rate', p_roomid;
  end if;

  insert into ypl.transactions (
    reservationguestid, transdate, transtype, roomid, transquantity,
    transamount, transnotes, transarchive, occupancyin, occupancyout
  ) values (
    p_reservationguestid, coalesce(p_transdate, current_date), 'Room', p_roomid, v_nights,
    round(v_rate * v_nights, 2), p_notes, false, p_occupancyin, p_occupancyout
  )
  returning transactionid into v_transactionid;
  return v_transactionid;
end;
$$;

comment on function ypl.post_room_nights is
  'Posts a room-night charge line (nights × rate) with the occupancy window; taxes fill in from the room''s tax flags automatically.';

create or replace function ypl.post_charge(
  p_reservationguestid integer,
  p_inventoryid integer,
  p_quantity integer default 1,
  p_transdate date default current_date,
  p_amount numeric default null,
  p_transtype text default null,
  p_notes text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_type text;
  v_transactionid integer;
begin
  select coalesce(p_transtype, i.invtype)
    into v_type
    from ypl.inventory_items i
   where i.inventoryid = p_inventoryid;
  if v_type is null then
    raise exception 'Inventory item % not found', p_inventoryid;
  end if;

  insert into ypl.transactions (
    reservationguestid, transdate, transtype, inventoryid, transquantity,
    transamount, transnotes, transarchive
  ) values (
    p_reservationguestid, coalesce(p_transdate, current_date), v_type, p_inventoryid,
    coalesce(p_quantity, 1), p_amount, p_notes, false
  )
  returning transactionid into v_transactionid;
  return v_transactionid;
end;
$$;

comment on function ypl.post_charge is
  'Posts an extra charge from the inventory price list. Leave p_amount null to use the list price; pass it to override the price manually.';

create or replace function ypl.archive_transaction(p_transactionid integer)
returns void
language sql
volatile
as $$
  update ypl.transactions t
     set transarchive = true
   where t.transactionid = p_transactionid;
$$;

-- -----------------------------------------------------------------------------
-- Payments and deposits
-- -----------------------------------------------------------------------------

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
  'Records any payment-ledger row (deposits, prepayments, payments, refunds, gratuities, A/R). The payment code and CDN conversion fill automatically; refund-style categories are stored negative.';

create or replace function ypl.archive_payment(p_paymentid integer)
returns void
language sql
volatile
as $$
  update ypl.payments p
     set paymentarchive = true
   where p.paymentid = p_paymentid;
$$;

create or replace function ypl.sell_gift_certificate(
  p_reservationguestid integer,
  p_amount numeric,
  p_paymenttype text,
  p_date date default current_date,
  p_notes text default null
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
    transamount, transnotes, transarchive
  ) values (
    p_reservationguestid, coalesce(p_date, current_date), 'Gift Certificate', v_inventoryid, 1,
    round(p_amount, 2), coalesce(p_notes, 'Gift certificate purchase'), false
  )
  returning transactionid into v_transactionid;

  -- Receipt side: the money taken for it lands in the day's cash by type.
  perform ypl.record_payment(
    p_reservationguestid, 'Payment (Regular)', p_paymenttype, p_amount,
    'Canadian', coalesce(p_date, current_date), 'Gift certificate');

  return v_transactionid;
end;
$$;

comment on function ypl.sell_gift_certificate is
  'Sells a gift certificate at the desk: one charge line plus the matching receipt, so the sale flows into daily cash reporting as charge-side activity.';

-- -----------------------------------------------------------------------------
-- Operations notes
-- -----------------------------------------------------------------------------

create or replace function ypl.add_housekeeping_note(
  p_reservationguestid integer,
  p_notes text,
  p_date date default current_date
) returns integer
language plpgsql
volatile
as $$
declare
  v_id integer;
begin
  if nullif(trim(coalesce(p_notes, '')), '') is null then
    raise exception 'Housekeeping note text is required';
  end if;
  insert into ypl.housekeeping_notes (
    reservationguestid, hknotesdate, housekeepingnotes, hkarchive
  ) values (
    p_reservationguestid, coalesce(p_date, current_date), trim(p_notes), false
  )
  returning housekeepingnotesid into v_id;
  return v_id;
end;
$$;

create or replace function ypl.archive_housekeeping_note(p_housekeepingnotesid integer)
returns void
language sql
volatile
as $$
  update ypl.housekeeping_notes h
     set hkarchive = true
   where h.housekeepingnotesid = p_housekeepingnotesid;
$$;

create or replace function ypl.save_kitchen_meal(
  p_guestid integer,
  p_guestdiet text,
  p_notes text default null,
  p_kitchenmealid integer default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_id integer;
begin
  if p_kitchenmealid is not null then
    update ypl.kitchen_meals k
       set guestdiet = p_guestdiet,
           kitchenmealnotes = p_notes
     where k.kitchenmealid = p_kitchenmealid;
    if not found then
      raise exception 'Kitchen meal record % not found', p_kitchenmealid;
    end if;
    return p_kitchenmealid;
  end if;

  insert into ypl.kitchen_meals (guestid, guestdiet, kitchenmealnotes, kmarchive)
  values (p_guestid, p_guestdiet, p_notes, false)
  returning kitchenmealid into v_id;
  return v_id;
end;
$$;

create or replace function ypl.archive_kitchen_meal(p_kitchenmealid integer)
returns void
language sql
volatile
as $$
  update ypl.kitchen_meals k
     set kmarchive = true
   where k.kitchenmealid = p_kitchenmealid;
$$;

-- =============================================================================
-- Report RPC revisions — columns the original printed designs require
-- =============================================================================

-- Deposits Received / Deposits Applied print Last Name and First Name as
-- separate columns and group by payment type.

drop function if exists ypl.report_deposits_received(date);
create function ypl.report_deposits_received(p_date date)
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
  select p.paymenttype::text,
         r.resnumber,
         g.guestlastname,
         g.guestfirstname,
         ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany),
         p.paymentamount,
         p.paymentcurrency,
         p.paymentamountcdn
    from ypl.payments p
    join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
    join ypl.reservations r on r.reservationid = rg.reservationid
    join ypl.guests g on g.guestid = rg.guestid
   where p.paymentcategory = 'Deposit (Received)'
     and p.paymentdate::date = p_date
     and not p.paymentarchive
   order by p.paymenttype, g.guestlastname, g.guestfirstname, r.resnumber;
$$;

drop function if exists ypl.report_deposits_applied(date);
create function ypl.report_deposits_applied(p_date date)
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
  select p.paymenttype::text,
         r.resnumber,
         g.guestlastname,
         g.guestfirstname,
         ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany),
         p.paymentamount,
         p.paymentcurrency,
         p.paymentamountcdn
    from ypl.payments p
    join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
    join ypl.reservations r on r.reservationid = rg.reservationid
    join ypl.guests g on g.guestid = rg.guestid
   where p.paymentcategory = 'Deposit (Applied)'
     and p.paymentdate::date = p_date
     and not p.paymentarchive
   order by p.paymenttype, g.guestlastname, g.guestfirstname, r.resnumber;
$$;

-- Items Cashed Out prints Res #, Last Name, and First Name for every line.

drop function if exists ypl.report_items_cashed_out(date);
create function ypl.report_items_cashed_out(p_date date)
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
    from ypl.v_transaction_lines t
    join ypl.reservation_guests rg on rg.reservationguestid = t.reservationguestid
    join ypl.guests g on g.guestid = rg.guestid
    left join ypl.inventory_items inv on inv.inventoryid = t.inventoryid
   where t.transdate::date = p_date
     and not t.transarchive
   order by coalesce(inv.invcode, t.invcode), t.resnumber, t.transactionid;
$$;

-- The filtered Kitchen Report prints one row per special-diet guest with
-- Last Name, First Name, Guest Diet, and Kitchen/Meal Notes as separate
-- columns, selected by arrival date between the chosen dates.

drop function if exists ypl.report_kitchen_meal_filtered(date, date);
create function ypl.report_kitchen_meal_filtered(p_from date, p_to date)
returns table (
  resnumber integer,
  guestlastname varchar,
  guestfirstname varchar,
  guestdiet varchar,
  kitchenmealnotes text,
  arrival_date date,
  departure_date date
)
language sql
stable
as $$
  select r.resnumber,
         g.guestlastname,
         g.guestfirstname,
         k.guestdiet,
         k.kitchenmealnotes,
         r.resarrivaldate::date,
         r.resdeparturedate::date
    from ypl.reservations r
    join ypl.reservation_guests rg on rg.reservationid = r.reservationid and not rg.rgarchive
    join ypl.guests g on g.guestid = rg.guestid
    join ypl.kitchen_meals k on k.guestid = g.guestid and not k.kmarchive
   where not r.rescancelled
     and not r.resarchive
     and r.resarrivaldate::date between p_from and p_to
   order by g.guestlastname, g.guestfirstname, r.resnumber;
$$;

-- The full Kitchen/Meal Report prints a Total Guests line for the day.

create or replace function ypl.report_kitchen_meal_total_guests(p_date date)
returns integer
language sql
stable
as $$
  select coalesce(sum(o.occupancynumguests), 0)::integer
    from ypl.room_assignments o
    join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
    join ypl.reservations r on r.reservationid = rg.reservationid
   where not o.occupancyarchive
     and not rg.rgarchive
     and not r.rescancelled
     and not r.resarchive
     and p_date between o.occupancyin::date and o.occupancyout::date;
$$;

comment on function ypl.report_kitchen_meal_total_guests is
  'Total guests in house on a date (sum of occupancy guest counts) for the Kitchen/Meal Report total line.';

-- =============================================================================
-- Grants
-- =============================================================================

grant usage, select on all sequences in schema ypl to authenticated, service_role;
grant execute on all functions in schema ypl to authenticated, service_role;
