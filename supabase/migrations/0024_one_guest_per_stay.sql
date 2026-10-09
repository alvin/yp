-- =============================================================================
-- 0024_one_guest_per_stay.sql
-- A reservation is booked under one guest.
--
-- The lodge books a shared room as a second reservation, so each party keeps
-- its own charges and payments, and the Shared mark on the two stays is all
-- the link they need. Whether the room's rate is split between them, and how,
-- is the desk's call, made in what each stay is charged. Access never put a
-- second name on a booking: every one of its 30,296 reservation guests is the
-- only name on its stay, primary, at 100% of the bill.
--
-- So a reservation holds one live guest, and the extra-name machinery goes:
-- the call that added a name, the other names a search match and a guest's
-- history showed beside it, and the list of names the guest documents
-- printed, which is now always the guest's own name. The Access columns stay
-- (percentageofbill, primaryguest) so the import loads every value as it is;
-- a booking's one guest is its primary guest at 100%, as Access left it.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- The rule
-- -----------------------------------------------------------------------------

create unique index reservation_guests_one_per_reservation
  on ypl.reservation_guests (reservationid)
  where not rgarchive;

comment on index ypl.reservation_guests_one_per_reservation is
  'A reservation is booked under one guest. A room two parties share is two reservations, each flagged Shared.';

-- The defaults were set for a second name added beside the first. A guest put
-- on a booking straight in the table is now its only guest, so it is the
-- primary guest at 100%, as create_reservation writes it.
alter table ypl.reservation_guests
  alter column primaryguest set default true,
  alter column percentageofbill set default 100;

drop function if exists ypl.add_reservation_guest(integer, integer, boolean, integer);

-- The percentage of the bill is Access's, and stays as imported.
drop function if exists ypl.update_reservation_guest(integer, date, date, text, text, boolean, integer, text, text, text);
create function ypl.update_reservation_guest(
  p_reservationguestid integer,
  p_checkindate date default null,
  p_checkoutdate date default null,
  p_checkintime text default null,
  p_checkouttime text default null,
  p_guestinhouse boolean default null,
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
         vehicledescription = coalesce(p_vehicledescription, rg.vehicledescription),
         vehiclelicenseplate = coalesce(p_vehiclelicenseplate, rg.vehiclelicenseplate),
         rgnotes = coalesce(p_rgnotes, rg.rgnotes)
   where rg.reservationguestid = p_reservationguestid;
  if not found then
    raise exception 'Reservation guest % not found', p_reservationguestid;
  end if;
end;
$$;

-- The guest on a stay, without a share of the bill or a balance of their own:
-- the stay's balance is the reservation's.
drop view if exists ypl.v_reservation_guest_summary;
create view ypl.v_reservation_guest_summary as
select
  rg.reservationguestid,
  rg.reservationid,
  r.resnumber,
  rg.guestid,
  rg.primaryguest,
  rg.checkindate,
  rg.checkintime,
  rg.checkoutdate,
  rg.checkouttime,
  rg.guestinhouse,
  rg.vehicledescription,
  rg.vehiclelicenseplate,
  rg.rgnotes,
  rg.rgarchive,
  ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany) as guest_name,
  g.guestlastname,
  g.guestfirstname
from ypl.reservation_guests rg
join ypl.reservations r on r.reservationid = rg.reservationid
join ypl.guests g on g.guestid = rg.guestid;

-- -----------------------------------------------------------------------------
-- Name search and guest history: no other names beside a guest
-- -----------------------------------------------------------------------------

drop function if exists ypl.search_guests_by_name(text, integer);
create function ypl.search_guests_by_name(p_query text, p_limit integer default 200)
returns table (
  guestid integer,
  guest_name text,
  guestlastname varchar,
  guestfirstname varchar,
  guestcity varchar,
  guestregion varchar,
  guestprimaryphone varchar,
  guestemailaddress text
)
language sql
stable
as $$
  with pats as (select ypl.search_patterns(p_query) as ps)
  -- Every keyword has to appear somewhere in the name, so extra characters
  -- narrow the list instead of widening it.
  select g.guestid,
         g.guest_name,
         g.guestlastname,
         g.guestfirstname,
         g.guestcity,
         g.guestregion,
         g.guestprimaryphone,
         g.guestemailaddress
    from ypl.v_guest_summary g, pats
   where cardinality(pats.ps) > 0
     and not g.guestvoid
     and not g.guestarchive
     and (
       select bool_and(
                concat_ws(' ', g.guestlastname, g.guestfirstname, g.guest_name)
                ilike pat escape '\')
         from unnest(pats.ps) as pat
     )
   order by similarity(coalesce(g.guestlastname, ''), coalesce(p_query, '')) desc,
            g.guestlastname,
            g.guestfirstname,
            g.guestid
   limit greatest(coalesce(p_limit, 200), 1);
$$;

comment on function ypl.search_guests_by_name is
  'Partial-string guest name search over last, first and display name. Every keyword must match; placeholder punctuation and ''*'' wildcards are honoured.';

drop function if exists ypl.guest_co_names(integer);

drop function if exists ypl.guest_history(integer, date);
create function ypl.guest_history(
  p_guestid integer,
  p_ref_date date default current_date
)
returns table (
  reservationid integer,
  reservationguestid integer,
  resnumber integer,
  bucket text,
  arrival_date date,
  departure_date date,
  rooms text,
  rescancelled boolean,
  balance_owing numeric
)
language sql
stable
as $$
  select s.reservationid,
         rg.reservationguestid,
         s.resnumber,
         case
           when p_ref_date between s.resarrivaldate::date and s.resdeparturedate::date then 'present'
           when s.resarrivaldate::date > p_ref_date then 'future'
           else 'past'
         end,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         s.rooms,
         s.rescancelled,
         s.balance_owing
    from ypl.reservation_guests rg
    join ypl.v_reservation_summary s on s.reservationid = rg.reservationid
   where rg.guestid = p_guestid
     and not rg.rgarchive
   order by s.resarrivaldate desc, s.resnumber desc;
$$;

comment on function ypl.guest_history is
  'A guest''s stays, newest first, each as present (in house on the reference date), future or past, with its rooms and balance.';

-- -----------------------------------------------------------------------------
-- Guest documents: the guest's name, as every other line prints it
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
         s.resnotes,
         dep.deposit_amount,
         dep.deposit_date,
         ypl.stay_diet_notes(s.reservationid),
         ypl.stay_housekeeping_notes(s.reservationid)
    from ypl.v_reservation_summary s
    left join lateral (
      select r.room, r.in_date, r.out_date, r.guest_count
        from ypl.report_stay_rooms(s.reservationid) r
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

drop function if exists ypl.report_check_in_folio(integer);
create function ypl.report_check_in_folio(p_reservationid integer)
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

drop function if exists ypl.report_checkout_bill_header(integer);
create function ypl.report_checkout_bill_header(p_reservationid integer)
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
  arrival_date date,
  departure_date date,
  tax_gst numeric,
  tax_pst numeric,
  tax_hst numeric,
  tax_liquor numeric,
  tax_room numeric,
  tax_hotel numeric,
  tax_dmt numeric,
  subtotal numeric,
  balance_owing numeric,
  future_deposit numeric,
  gratuity_amount numeric,
  grand_total numeric,
  gst_registration_number text
)
language sql
stable
as $$
  with lines as (
    select t.*
      from ypl.v_transaction_lines t
     where t.reservationid = p_reservationid
       and not t.transarchive
  ), totals as (
    select coalesce(sum(transamount),0) as charge_total,
           coalesce(sum(transgstamount),0) as gst,
           coalesce(sum(transpstamount),0) as pst,
           coalesce(sum(transhstamount),0) as hst,
           coalesce(sum(transltamount),0) as liquor,
           coalesce(sum(transrtamount),0) as room_tax,
           coalesce(sum(transhtamount),0) as hotel_tax,
           coalesce(sum(transdmtamount),0) as dmt
      from lines
  ), gratuity as (
    select coalesce(sum(ypl.money_amount(p.paymentamountcdn, p.paymentamount)),0) as amount
      from ypl.payments p
      join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
     where rg.reservationid = p_reservationid
       and p.paymentcategory = 'Gratuity'
       and not p.paymentarchive
  )
  select s.resnumber,
         s.guest_name,
         s.guestaddress,
         s.guestcity,
         s.guestregion,
         s.guestcountry,
         s.guestpczip,
         s.guestprimaryphone,
         current_date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         round(t.gst,2),
         round(t.pst,2),
         round(t.hst,2),
         round(t.liquor,2),
         round(t.room_tax,2),
         round(t.hotel_tax,2),
         round(t.dmt,2),
         round(t.charge_total + t.gst + t.pst + t.hst + t.liquor + t.room_tax + t.hotel_tax + t.dmt,2),
         round(s.balance_owing,2),
         0::numeric,
         round(g.amount,2),
         round(t.charge_total + t.gst + t.pst + t.hst + t.liquor + t.room_tax + t.hotel_tax + t.dmt + g.amount,2),
         'R1105763445'
    from ypl.v_reservation_summary s
    cross join totals t
    cross join gratuity g
   where s.reservationid = p_reservationid;
$$;

drop function if exists ypl.reservation_guest_names(integer);

grant all on ypl.v_reservation_guest_summary to authenticated, service_role;
grant execute on all functions in schema ypl to authenticated, service_role;
