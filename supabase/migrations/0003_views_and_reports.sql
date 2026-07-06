-- =============================================================================
-- 0003_views_and_reports.sql
-- App views and RPCs for search, screens, and reports.
-- =============================================================================
-- Tables, views, and RPCs all live in the production YPL schema.
-- Tables preserve Access field names for lossless import; views and RPCs provide
-- readable entry points for search, screens, and report rendering.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Formatting, sign, and balance helpers
-- -----------------------------------------------------------------------------

create or replace function ypl.guest_display_name(
  p_last_name text,
  p_first_name text,
  p_company text default null
) returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(concat_ws(', ', nullif(p_last_name, ''), nullif(p_first_name, ''))), ''),
    nullif(trim(p_company), ''),
    '[guest name missing]'
  );
$$;

create or replace function ypl.room_display(
  p_room_name text,
  p_room_number text
) returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(p_room_name), ''), '[room]') ||
         case when nullif(trim(coalesce(p_room_number, '')), '') is null
              then ':'
              else ': ' || trim(p_room_number)
          end;
$$;

create or replace function ypl.room_display_compact(
  p_room_name text,
  p_room_number text
) returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(p_room_name), ''), '[room]') ||
         case when nullif(trim(coalesce(p_room_number, '')), '') is null
              then ''
              else ' ' || trim(p_room_number)
          end;
$$;

create or replace function ypl.occupancy_status(
  p_arrival timestamp without time zone,
  p_departure timestamp without time zone,
  p_room_in timestamp without time zone,
  p_room_out timestamp without time zone,
  p_ref_date date
) returns text
language sql
immutable
as $$
  select case
    when p_room_in::date = p_ref_date and p_room_in::date > p_arrival::date then 'Move In'
    when p_arrival::date = p_ref_date then 'Arrive Today'
    when p_departure::date = p_ref_date then 'Depart Today'
    when p_ref_date > p_arrival::date and p_ref_date < p_departure::date then 'In House'
    else 'In House'
  end;
$$;

create or replace function ypl.money_amount(
  p_amount_cdn numeric,
  p_amount numeric
) returns numeric
language sql
immutable
as $$
  select coalesce(p_amount_cdn, p_amount, 0)::numeric;
$$;

create or replace function ypl.payment_balance_effect(
  p_payment_category text,
  p_amount_cdn numeric,
  p_amount numeric
) returns numeric
language sql
immutable
as $$
  -- Access stores most receipts/applications as positive payment amounts
  -- and refunds as negative amounts. For a guest balance, payments/receipts reduce
  -- the balance, while negative refund amounts increase it.
  select -1 * ypl.money_amount(p_amount_cdn, p_amount);
$$;

create or replace function ypl.payment_cash_effect(
  p_payment_category text,
  p_amount_cdn numeric,
  p_amount numeric
) returns numeric
language sql
immutable
as $$
  -- DCAR lower section follows Access cash-signs: receipts positive, refunds
  -- negative, and US payments use PaymentAmountCDN when populated.
  select ypl.money_amount(p_amount_cdn, p_amount);
$$;

create or replace function ypl.payment_reporting_effect(
  p_payment_category text,
  p_amount_cdn numeric,
  p_amount numeric
) returns numeric
language sql
immutable
as $$
  -- DCAR upper section uses the printed payment categories. Refund-like categories
  -- reduce the upper total even if historical rows were entered with inconsistent
  -- signs; all other categories use the stored CDN value.
  select case
    when p_payment_category in (
      'Deposit (Refund)', 'Prepayment (Refund)', 'A/R (Sent To Accounts)', 'Paid Out'
    ) then -abs(ypl.money_amount(p_amount_cdn, p_amount))
    else ypl.money_amount(p_amount_cdn, p_amount)
  end;
$$;

create or replace function ypl.transaction_tax_total(
  p_gst numeric,
  p_pst numeric,
  p_hst numeric,
  p_liquor numeric,
  p_room numeric,
  p_hotel numeric,
  p_dmt numeric
) returns numeric
language sql
immutable
as $$
  select coalesce(p_gst,0) + coalesce(p_pst,0) + coalesce(p_hst,0) +
         coalesce(p_liquor,0) + coalesce(p_room,0) + coalesce(p_hotel,0) +
         coalesce(p_dmt,0);
$$;

create or replace function ypl.transaction_total(
  p_amount numeric,
  p_gst numeric,
  p_pst numeric,
  p_hst numeric,
  p_liquor numeric,
  p_room numeric,
  p_hotel numeric,
  p_dmt numeric
) returns numeric
language sql
immutable
as $$
  select coalesce(p_amount,0) +
         ypl.transaction_tax_total(p_gst, p_pst, p_hst, p_liquor, p_room, p_hotel, p_dmt);
$$;

create or replace function ypl.reservationguest_balance(p_reservationguestid integer)
returns numeric
language sql
stable
as $$
  with charges as (
    select coalesce(sum(ypl.transaction_total(
             transamount, transgstamount, transpstamount, transhstamount,
             transltamount, transrtamount, transhtamount, transdmtamount
           )), 0) as amount
      from ypl.transactions
     where reservationguestid = p_reservationguestid
       and not transarchive
  ), payments as (
    select coalesce(sum(ypl.payment_balance_effect(paymentcategory, paymentamountcdn, paymentamount)), 0) as amount
      from ypl.payments
     where reservationguestid = p_reservationguestid
       and not paymentarchive
  )
  select round(charges.amount + payments.amount, 2)
    from charges, payments;
$$;

create or replace function ypl.reservation_balance(p_reservationid integer)
returns numeric
language sql
stable
as $$
  select coalesce(round(sum(ypl.reservationguest_balance(rg.reservationguestid)), 2), 0)
    from ypl.reservation_guests rg
   where rg.reservationid = p_reservationid
     and not rg.rgarchive;
$$;

comment on function ypl.reservation_balance is
  'Access-compatible reservation balance: transaction charges+taxes less payment rows across all reservation guests.';

-- -----------------------------------------------------------------------------
-- App views for screens and reports
-- -----------------------------------------------------------------------------

create or replace view ypl.v_guest_summary as
select
  g.guestid,
  g.guestsalutation,
  g.guestfirstname,
  g.guestlastname,
  ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany) as guest_name,
  g.guestaddress,
  g.guestcity,
  g.guestregion,
  g.guestcountry,
  g.guestpczip,
  g.guestprimaryphone,
  g.guestprimaryphonetype,
  g.guestsecondaryphone,
  g.guestsecondaryphonetype,
  g.guestemailaddress,
  g.guestcompany,
  g.guestvoid,
  g.guestarchive,
  g.guestnotes
from ypl.guests g;

comment on view ypl.v_guest_summary is
  'Readable guest projection over ypl.guests. GuestNotes remain office-only and are not used by report RPCs.';

create or replace view ypl.v_reservation_summary as
select
  r.reservationid,
  r.resnumber,
  r.resbookingdate,
  r.resbookedby,
  r.resgroupname,
  r.resarrivaldate,
  r.resdeparturedate,
  r.numnights,
  r.numrooms,
  r.numadults,
  r.numchildren,
  r.resconfirmed,
  r.resdateconfirmed,
  r.rescancelled,
  r.resdatecancelled,
  r.resnotes,
  r.resarchive,
  r.resarrivaltime,
  r.bedtype,
  rg.reservationguestid as primary_reservationguestid,
  g.guestid as primary_guestid,
  ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany) as guest_name,
  g.guestlastname,
  g.guestfirstname,
  g.guestaddress,
  g.guestcity,
  g.guestregion,
  g.guestcountry,
  g.guestpczip,
  g.guestprimaryphone,
  g.guestemailaddress,
  occ.rooms,
  occ.first_room_in,
  occ.last_room_out,
  occ.occupancy_guest_count,
  ypl.reservation_balance(r.reservationid) as balance_owing
from ypl.reservations r
left join lateral (
  select *
    from ypl.reservation_guests rg0
   where rg0.reservationid = r.reservationid
     and not rg0.rgarchive
   order by rg0.primaryguest desc, rg0.reservationguestid
   limit 1
) rg on true
left join ypl.guests g on g.guestid = rg.guestid
left join lateral (
  select
    string_agg(ypl.room_display(room.roomname, room.roomnumber), '; ' order by o.occupancyin, room.roomorder, room.roomid) as rooms,
    min(o.occupancyin) as first_room_in,
    max(o.occupancyout) as last_room_out,
    sum(coalesce(o.occupancynumguests, 0))::integer as occupancy_guest_count
  from ypl.reservation_guests rg2
  join ypl.room_assignments o on o.reservationguestid = rg2.reservationguestid and not o.occupancyarchive
  join ypl.rooms room on room.roomid = o.roomid
  where rg2.reservationid = r.reservationid
    and not rg2.rgarchive
) occ on true;

comment on view ypl.v_reservation_summary is
  'One row per reservation with primary guest, room summary, and computed balance.';

create or replace view ypl.v_reservation_guest_summary as
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
  rg.percentageofbill,
  rg.vehicledescription,
  rg.vehiclelicenseplate,
  rg.rgnotes,
  rg.rgarchive,
  ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany) as guest_name,
  g.guestlastname,
  g.guestfirstname,
  ypl.reservationguest_balance(rg.reservationguestid) as balance_owing
from ypl.reservation_guests rg
join ypl.reservations r on r.reservationid = rg.reservationid
join ypl.guests g on g.guestid = rg.guestid;

create or replace view ypl.v_occupancy_summary as
select
  o.occupancyid,
  o.reservationguestid,
  rg.reservationid,
  r.resnumber,
  rg.guestid,
  ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany) as guest_name,
  g.guestlastname,
  g.guestfirstname,
  o.roomid,
  ypl.room_display(room.roomname, room.roomnumber) as room,
  ypl.room_display_compact(room.roomname, room.roomnumber) as room_compact,
  room.roomname,
  room.roomnumber,
  room.roomtype,
  room.roomcode,
  room.roomshorthand,
  room.roomorder,
  o.occupancyin,
  o.occupancyout,
  o.occupancynumguests,
  o.occupancynotes,
  o.occupancyarchive,
  r.resarrivaldate,
  r.resdeparturedate,
  r.rescancelled,
  ypl.occupancy_status(r.resarrivaldate, r.resdeparturedate, o.occupancyin, o.occupancyout, current_date) as status_today
from ypl.room_assignments o
join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
join ypl.reservations r on r.reservationid = rg.reservationid
join ypl.guests g on g.guestid = rg.guestid
join ypl.rooms room on room.roomid = o.roomid;

create or replace view ypl.v_transaction_lines as
select
  t.transactionid,
  t.reservationguestid,
  rg.reservationid,
  r.resnumber,
  t.transdate,
  t.transtype,
  t.inventoryid,
  inv.invcode,
  coalesce(inv.invitemdescription, t.transnotes, t.transtype) as description,
  t.roomid,
  ypl.room_display(room.roomname, room.roomnumber) as room,
  t.transquantity,
  t.transamount,
  t.transgstamount,
  t.transpstamount,
  t.transhstamount,
  t.transltamount,
  t.transrtamount,
  t.transhtamount,
  t.transdmtamount,
  ypl.transaction_tax_total(
    t.transgstamount, t.transpstamount, t.transhstamount,
    t.transltamount, t.transrtamount, t.transhtamount, t.transdmtamount
  ) as tax_total,
  ypl.transaction_total(
    t.transamount, t.transgstamount, t.transpstamount, t.transhstamount,
    t.transltamount, t.transrtamount, t.transhtamount, t.transdmtamount
  ) as line_total,
  t.transnotes,
  t.transarchive,
  t.occupancyin,
  t.occupancyout
from ypl.transactions t
join ypl.reservation_guests rg on rg.reservationguestid = t.reservationguestid
join ypl.reservations r on r.reservationid = rg.reservationid
left join ypl.inventory_items inv on inv.inventoryid = t.inventoryid
left join ypl.rooms room on room.roomid = t.roomid;

create or replace view ypl.v_payment_lines as
select
  p.paymentid,
  p.reservationguestid,
  rg.reservationid,
  r.resnumber,
  p.paymentcode,
  p.paymentcategory,
  p.paymenttype,
  p.paymentdate,
  p.paymentamount,
  p.paymentcurrency,
  p.paymentamountcdn,
  ypl.payment_balance_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) as balance_effect,
  ypl.payment_cash_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) as cash_effect,
  -- Intentionally do not expose ccnumber/ccexpdate through app-facing payment views.
  p.ccname,
  p.ccnotes,
  p.paymentnotes,
  p.paymentarchive
from ypl.payments p
join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
join ypl.reservations r on r.reservationid = rg.reservationid;

comment on view ypl.v_payment_lines is
  'Payment/payment-category projection for screens and reports. PCI fields ccnumber/ccexpdate remain only in ypl.payments.';

-- -----------------------------------------------------------------------------
-- Lookup screen and transaction workspace RPCs
-- -----------------------------------------------------------------------------

create or replace function ypl.search_guests_by_name(p_query text)
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
  select g.guestid, g.guest_name, g.guestlastname, g.guestfirstname,
         g.guestcity, g.guestregion, g.guestprimaryphone, g.guestemailaddress
    from ypl.v_guest_summary g
   where length(trim(coalesce(p_query, ''))) > 0
     and not g.guestvoid
     and not g.guestarchive
     and (
       g.guestlastname ilike '%' || p_query || '%'
       or coalesce(g.guestfirstname, '') ilike '%' || p_query || '%'
       or g.guest_name ilike '%' || p_query || '%'
       or coalesce(g.guestcompany, '') ilike '%' || p_query || '%'
     )
   order by similarity(coalesce(g.guestlastname, ''), p_query) desc,
            g.guestlastname, g.guestfirstname, g.guestid;
$$;

create or replace function ypl.search_all_fields(p_query text)
returns table (
  guestid integer,
  reservationid integer,
  resnumber integer,
  guest_name text,
  matched_on text,
  detail text
)
language sql
stable
as $$
  with q as (select '%' || trim(coalesce(p_query, '')) || '%' as like_q)
  select g.guestid, null::integer, null::integer, g.guest_name, 'primary phone', g.guestprimaryphone::text
    from ypl.v_guest_summary g, q
   where length(trim(coalesce(p_query, ''))) > 0 and coalesce(g.guestprimaryphone, '') ilike q.like_q
  union all
  select g.guestid, null::integer, null::integer, g.guest_name, 'secondary phone', g.guestsecondaryphone::text
    from ypl.v_guest_summary g, q
   where length(trim(coalesce(p_query, ''))) > 0 and coalesce(g.guestsecondaryphone, '') ilike q.like_q
  union all
  select g.guestid, null::integer, null::integer, g.guest_name, 'address',
         concat_ws(', ', g.guestaddress, g.guestcity, g.guestregion, g.guestcountry, g.guestpczip)
    from ypl.v_guest_summary g, q
   where length(trim(coalesce(p_query, ''))) > 0
     and concat_ws(' ', g.guestaddress, g.guestcity, g.guestregion, g.guestcountry, g.guestpczip, g.guestemailaddress) ilike q.like_q
  union all
  select g.guestid, null::integer, null::integer, g.guest_name, 'name', g.guest_name
    from ypl.v_guest_summary g, q
   where length(trim(coalesce(p_query, ''))) > 0 and g.guest_name ilike q.like_q
  union all
  select s.primary_guestid, s.reservationid, s.resnumber, s.guest_name, 'reservation number', s.resnumber::text
    from ypl.v_reservation_summary s, q
   where length(trim(coalesce(p_query, ''))) > 0 and s.resnumber::text ilike q.like_q;
$$;

create or replace function ypl.find_reservation(p_resnumber integer)
returns setof ypl.v_reservation_summary
language sql
stable
as $$
  select * from ypl.v_reservation_summary where resnumber = p_resnumber;
$$;

create or replace function ypl.search_by_date(
  p_date date,
  p_mode text default 'arrivals'
)
returns table (
  reservationid integer,
  reservationguestid integer,
  resnumber integer,
  guest_name text,
  guestlastname varchar,
  guestfirstname varchar,
  room text,
  arrival_date date,
  departure_date date,
  match_type text
)
language sql
stable
as $$
  select s.reservationid,
         s.primary_reservationguestid,
         s.resnumber,
         s.guest_name,
         s.guestlastname,
         s.guestfirstname,
         s.rooms,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         case
           when s.resarrivaldate::date = p_date then 'arrival'
           when s.resdeparturedate::date = p_date then 'departure'
           when exists (
             select 1 from ypl.v_occupancy_summary o
              where o.reservationid = s.reservationid
                and p_date between o.occupancyin::date and o.occupancyout::date
           ) then 'in_house'
           else 'date_match'
         end
    from ypl.v_reservation_summary s
   where not s.resarchive
     and (
       (coalesce(p_mode, 'arrivals') in ('arrivals', 'both') and s.resarrivaldate::date = p_date)
       or (coalesce(p_mode, 'arrivals') in ('departures', 'both') and s.resdeparturedate::date = p_date)
       or (coalesce(p_mode, 'arrivals') in ('in_house', 'occupancy') and exists (
            select 1 from ypl.v_occupancy_summary o
             where o.reservationid = s.reservationid
               and p_date between o.occupancyin::date and o.occupancyout::date
          ))
     )
   order by s.guestlastname, s.guestfirstname, s.resnumber;
$$;

create or replace function ypl.search_by_date_range(
  p_from date,
  p_to date,
  p_mode text default 'overlap'
)
returns table (
  reservationid integer,
  resnumber integer,
  guest_name text,
  arrival_date date,
  departure_date date,
  rooms text,
  match_type text
)
language sql
stable
as $$
  select s.reservationid,
         s.resnumber,
         s.guest_name,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         s.rooms,
         case
           when coalesce(p_mode, 'overlap') = 'arrivals' then 'arrival'
           when coalesce(p_mode, 'overlap') = 'departures' then 'departure'
           when coalesce(p_mode, 'overlap') = 'occupancy' then 'occupancy'
           else 'overlap'
         end
    from ypl.v_reservation_summary s
   where not s.resarchive
     and (
       (coalesce(p_mode, 'overlap') = 'arrivals' and s.resarrivaldate::date between p_from and p_to)
       or (coalesce(p_mode, 'overlap') = 'departures' and s.resdeparturedate::date between p_from and p_to)
       or (coalesce(p_mode, 'overlap') = 'occupancy' and exists (
            select 1 from ypl.v_occupancy_summary o
             where o.reservationid = s.reservationid
               and o.occupancyin::date <= p_to
               and o.occupancyout::date >= p_from
          ))
       or (coalesce(p_mode, 'overlap') not in ('arrivals','departures','occupancy')
           and s.resarrivaldate::date <= p_to
           and s.resdeparturedate::date >= p_from)
     )
   order by s.resarrivaldate, s.guest_name, s.resnumber;
$$;

create or replace function ypl.guest_history(
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

create or replace function ypl.reservation_ledger(p_reservationid integer)
returns table (
  line_source text,
  line_id integer,
  reservationguestid integer,
  line_date date,
  line_type text,
  code text,
  description text,
  quantity numeric,
  amount numeric,
  tax_total numeric,
  balance_effect numeric,
  running_balance numeric
)
language sql
stable
as $$
  with raw_lines as (
    select 'transaction'::text as line_source,
           t.transactionid as line_id,
           t.reservationguestid,
           t.transdate::date as line_date,
           t.transtype::text as line_type,
           t.invcode::text as code,
           t.description::text,
           t.transquantity::numeric as quantity,
           coalesce(t.transamount, 0)::numeric as amount,
           t.tax_total::numeric,
           t.line_total::numeric as balance_effect
      from ypl.v_transaction_lines t
     where t.reservationid = p_reservationid
       and not t.transarchive
    union all
    select 'payment'::text,
           p.paymentid,
           p.reservationguestid,
           p.paymentdate::date,
           p.paymentcategory::text,
           p.paymentcode::text,
           coalesce(p.paymentnotes, p.paymentcategory)::text,
           1::numeric,
           ypl.money_amount(p.paymentamountcdn, p.paymentamount)::numeric,
           0::numeric,
           p.balance_effect::numeric
      from ypl.v_payment_lines p
     where p.reservationid = p_reservationid
       and not p.paymentarchive
  )
  select line_source,
         line_id,
         reservationguestid,
         line_date,
         line_type,
         code,
         description,
         quantity,
         round(amount, 2),
         round(tax_total, 2),
         round(balance_effect, 2),
         round(sum(balance_effect) over (order by line_date, line_source, line_id rows between unbounded preceding and current row), 2)
    from raw_lines
   order by line_date, line_source, line_id;
$$;

-- -----------------------------------------------------------------------------
-- Guest-facing document RPCs
-- -----------------------------------------------------------------------------

create or replace function ypl.report_reservation_confirmation(p_reservationid integer)
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
  deposit_date date
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
         first_occ.occupancyin::date,
         first_occ.occupancyout::date,
         coalesce(first_occ.occupancynumguests, s.numadults + coalesce(s.numchildren, 0)),
         s.resnotes,
         dep.deposit_amount,
         dep.deposit_date
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

create or replace function ypl.report_check_in_folio(p_reservationid integer)
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
  deposit_amount numeric,
  deposit_type varchar,
  vehicle_description varchar,
  vehicle_license_plate varchar
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
         first_occ.occupancyin::date,
         first_occ.occupancyout::date,
         coalesce(first_occ.occupancynumguests, s.numadults + coalesce(s.numchildren, 0)),
         dep.deposit_amount,
         dep.paymenttype,
         rg.vehicledescription,
         rg.vehiclelicenseplate
    from ypl.v_reservation_summary s
    left join ypl.reservation_guests rg on rg.reservationguestid = s.primary_reservationguestid
    left join lateral (
      select o.room, o.occupancyin, o.occupancyout, o.occupancynumguests
        from ypl.v_occupancy_summary o
       where o.reservationid = s.reservationid
       order by o.occupancyin, o.roomorder, o.occupancyid
       limit 1
    ) first_occ on true
    left join lateral (
      select ypl.money_amount(p.paymentamountcdn, p.paymentamount) as deposit_amount,
             p.paymenttype
        from ypl.payments p
        join ypl.reservation_guests rg2 on rg2.reservationguestid = p.reservationguestid
       where rg2.reservationid = s.reservationid
         and p.paymentcategory = 'Deposit (Received)'
         and not p.paymentarchive
       order by p.paymentdate desc nulls last, p.paymentid desc
       limit 1
    ) dep on true
   where s.reservationid = p_reservationid;
$$;

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
         coalesce(first_occ.occupancynumguests, s.numadults + coalesce(s.numchildren, 0)),
         dep.deposit_received_amount,
         dep.deposit_received_date,
         outcome.deposit_outcome_category,
         outcome.deposit_outcome_amount,
         outcome.deposit_outcome_date,
         s.resnotes
    from ypl.v_reservation_summary s
    left join lateral (
      select o.room, o.occupancynumguests
        from ypl.v_occupancy_summary o
       where o.reservationid = s.reservationid
       order by o.occupancyin, o.roomorder, o.occupancyid
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
   where s.reservationid = p_reservationid;
$$;

create or replace function ypl.report_checkout_bill_header(p_reservationid integer)
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

create or replace function ypl.report_checkout_bill_lines(p_reservationid integer)
returns table (
  sort_group text,
  sort_order integer,
  line_date date,
  description text,
  quantity numeric,
  unit_price numeric,
  amount numeric,
  kind_label text,
  display_sign text
)
language sql
stable
as $$
  with charge_lines as (
    select 'charges'::text as sort_group,
           row_number() over (order by t.transdate, t.transactionid)::integer as sort_order,
           t.transdate::date as line_date,
           t.description,
           t.transquantity::numeric as quantity,
           case when nullif(t.transquantity,0) is null then null::numeric
                else round(t.transamount / t.transquantity, 2)
            end as unit_price,
           abs(t.transamount)::numeric as amount,
           t.transtype::text as kind_label,
           ''::text as display_sign
      from ypl.v_transaction_lines t
     where t.reservationid = p_reservationid
       and not t.transarchive
  ), payment_lines as (
    select 'settlements'::text,
           (1000 + row_number() over (order by p.paymentdate, p.paymentid))::integer,
           p.paymentdate::date,
           p.paymentcategory::text,
           1::numeric,
           null::numeric,
           abs(ypl.money_amount(p.paymentamountcdn, p.paymentamount))::numeric,
           p.paymentcategory::text,
           case when ypl.payment_balance_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount) < 0 then '−' else '' end
      from ypl.payments p
      join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
     where rg.reservationid = p_reservationid
       and p.paymentcategory in (
         'Payment (Regular)', 'Deposit (Applied)', 'Deposit (Received)',
         'Prepayment (Applied)', 'Prepayment (Received)', 'Gift Certificate Received',
         'A/R (Payment Received)', 'A/R (Sent To Accounts)', 'Deposit (Refund)',
         'Prepayment (Refund)', 'Deposit (Kept)'
       )
       and not p.paymentarchive
  )
  select * from charge_lines
  union all
  select * from payment_lines
  order by sort_order;
$$;

create or replace function ypl.report_guest_document_queue(
  p_document text,
  p_date date default current_date
)
returns table (
  document_type text,
  reservationid integer,
  resnumber integer,
  guest text,
  target_date date,
  reason text
)
language sql
stable
as $$
  select p_document,
         s.reservationid,
         s.resnumber,
         s.guest_name,
         case
           when p_document = 'confirmation' then coalesce(s.resdateconfirmed::date, s.resbookingdate::date)
           when p_document = 'check_in_folio' then s.resarrivaldate::date
           when p_document = 'checkout_bill' then s.resdeparturedate::date
           when p_document = 'cancellation_notice' then s.resdatecancelled::date
         end as target_date,
         case
           when p_document = 'confirmation' then 'reservation booked or confirmed on selected day'
           when p_document = 'check_in_folio' then 'arrival on selected day'
           when p_document = 'checkout_bill' then 'departure on selected day'
           when p_document = 'cancellation_notice' then 'cancelled on selected day'
         end as reason
    from ypl.v_reservation_summary s
   where p_document in ('confirmation','check_in_folio','checkout_bill','cancellation_notice')
     and (
       (p_document = 'confirmation' and not s.rescancelled and (s.resdateconfirmed::date = p_date or s.resbookingdate::date = p_date))
       or (p_document = 'check_in_folio' and not s.rescancelled and s.resarrivaldate::date = p_date)
       or (p_document = 'checkout_bill' and not s.rescancelled and s.resdeparturedate::date = p_date)
       or (p_document = 'cancellation_notice' and s.rescancelled and s.resdatecancelled::date = p_date)
     )
   order by s.guest_name, s.resnumber;
$$;

-- -----------------------------------------------------------------------------
-- Operational report RPCs
-- -----------------------------------------------------------------------------

create or replace function ypl.report_housekeeping(p_date date)
returns table (
  status text,
  resnumber integer,
  guest text,
  guest_count integer,
  room text,
  in_date date,
  out_date date,
  note_date date,
  notes text
)
language sql
stable
as $$
  select ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date) as status,
         o.resnumber,
         o.guest_name,
         o.occupancynumguests,
         o.room,
         o.occupancyin::date,
         o.occupancyout::date,
         hk.hknotesdate::date,
         hk.housekeepingnotes
    from ypl.v_occupancy_summary o
    left join lateral (
      select h.hknotesdate, h.housekeepingnotes
        from ypl.housekeeping_notes h
       where h.reservationguestid = o.reservationguestid
         and not h.hkarchive
       order by h.hknotesdate desc nulls last, h.housekeepingnotesid desc
       limit 1
    ) hk on true
   where not o.rescancelled
     and not o.occupancyarchive
     and p_date between o.occupancyin::date and o.occupancyout::date
   order by o.roomorder nulls last, o.room, o.resnumber;
$$;

create or replace function ypl.report_in_house(p_date date)
returns table (
  section text,
  resnumber integer,
  guest text,
  arrival text,
  guest_count integer,
  room text,
  in_date date,
  out_date date,
  occupancy_notes text
)
language sql
stable
as $$
  select ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date) as section,
         o.resnumber,
         o.guest_name,
         nullif(trim(coalesce(r.resarrivaltime, '')), '') as arrival,
         o.occupancynumguests,
         o.room,
         o.occupancyin::date,
         o.occupancyout::date,
         nullif(trim(concat_ws(' ', nullif(o.occupancynotes, ''), nullif(rg.rgnotes, ''))), '') as occupancy_notes
    from ypl.v_occupancy_summary o
    join ypl.reservations r on r.reservationid = o.reservationid
    join ypl.reservation_guests rg on rg.reservationguestid = o.reservationguestid
   where not o.rescancelled
     and not o.occupancyarchive
     and p_date between o.occupancyin::date and o.occupancyout::date
   order by case ypl.occupancy_status(o.resarrivaldate, o.resdeparturedate, o.occupancyin, o.occupancyout, p_date)
              when 'Arrive Today' then 1
              when 'Depart Today' then 2
              when 'Move In' then 3
              else 4
            end,
            o.guestlastname,
            o.guestfirstname,
            o.roomorder nulls last;
$$;

create or replace function ypl.report_kitchen_meal(p_date date)
returns table (
  resnumber integer,
  guest text,
  arrival_date date,
  departure_date date,
  diet_notes text
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         notes.diet_notes
    from ypl.v_reservation_summary s
    join lateral (
      select string_agg(
               trim(concat_ws(' ', nullif(k.guestdiet, ''), nullif(k.kitchenmealnotes, ''))),
               E'\n' order by rg.primaryguest desc, g.guestlastname, g.guestfirstname, k.kitchenmealid
             ) as diet_notes
        from ypl.reservation_guests rg
        join ypl.guests g on g.guestid = rg.guestid
        join ypl.kitchen_meals k on k.guestid = g.guestid and not k.kmarchive
       where rg.reservationid = s.reservationid
         and not rg.rgarchive
         and nullif(trim(concat_ws(' ', k.guestdiet, k.kitchenmealnotes)), '') is not null
    ) notes on notes.diet_notes is not null
   where not s.rescancelled
     and p_date between s.resarrivaldate::date and s.resdeparturedate::date
   order by s.guestlastname, s.guestfirstname, s.resnumber;
$$;

create or replace function ypl.report_kitchen_meal_filtered(p_from date, p_to date)
returns table (
  resnumber integer,
  guest text,
  diet_notes text,
  arrival_date date,
  departure_date date
)
language sql
stable
as $$
  select km.resnumber, km.guest, km.diet_notes, km.arrival_date, km.departure_date
    from ypl.v_reservation_summary s
    join lateral ypl.report_kitchen_meal(greatest(p_from, s.resarrivaldate::date)) km on km.resnumber = s.resnumber
   where s.resarrivaldate::date <= p_to
     and s.resdeparturedate::date >= p_from
   order by km.guest, km.arrival_date;
$$;

create or replace function ypl.report_manual_sales(p_date date)
returns table (
  room text,
  resnumber integer,
  guest_last_name varchar,
  room_order real,
  is_cancelled boolean
)
language sql
stable
as $$
  select o.room_compact,
         o.resnumber,
         o.guestlastname,
         o.roomorder,
         o.rescancelled
    from ypl.v_occupancy_summary o
   where not o.rescancelled
     and not o.occupancyarchive
     and p_date between o.occupancyin::date and o.occupancyout::date
   order by o.roomorder nulls last, o.room_compact, o.resnumber;
$$;

create or replace function ypl.report_cancellation_list(p_date date)
returns table (
  resnumber integer,
  guest text,
  date_cancelled date,
  arrival_date date,
  departure_date date,
  rooms text,
  notes text
)
language sql
stable
as $$
  select s.resnumber,
         s.guest_name,
         s.resdatecancelled::date,
         s.resarrivaldate::date,
         s.resdeparturedate::date,
         s.rooms,
         s.resnotes
    from ypl.v_reservation_summary s
   where s.rescancelled
     and s.resdatecancelled::date = p_date
   order by s.guest_name, s.resnumber;
$$;

-- -----------------------------------------------------------------------------
-- Daily Cash Activity Report and appendices
-- -----------------------------------------------------------------------------

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
  with revenue as (
    select tt.transactiontype as item,
           coalesce(sum(t.transamount), 0) as amount,
           tt.transactiontypeorder as sort_order
      from ypl.lookup_transaction_types tt
      left join ypl.transactions t
        on t.transtype = tt.transactiontype
       and t.transdate::date = p_date
       and not t.transarchive
     group by tt.transactiontype, tt.transactiontypeorder
  ), taxes as (
    select 'GST'::text as item, coalesce(sum(transgstamount),0) as amount, 100 as sort_order from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'PST', coalesce(sum(transpstamount),0), 101 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'HST', coalesce(sum(transhstamount),0), 102 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Liquor Tax', coalesce(sum(transltamount),0), 103 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Room Tax', coalesce(sum(transrtamount),0), 104 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Hotel Tax', coalesce(sum(transhtamount),0), 105 from ypl.transactions where transdate::date = p_date and not transarchive
    union all select 'Dest Mktg Tax', coalesce(sum(transdmtamount),0), 106 from ypl.transactions where transdate::date = p_date and not transarchive
  ), adjustments as (
    select pc.paymentcategory as item,
           coalesce(sum(ypl.payment_reporting_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount)), 0) as amount,
           200 + coalesce(pc.paymentcategoryorder, 999) as sort_order
      from ypl.lookup_payment_categories pc
      left join ypl.payments p
        on p.paymentcategory = pc.paymentcategory
       and p.paymentdate::date = p_date
       and not p.paymentarchive
     where pc.paymentcategory <> 'Payment (Regular)'
     group by pc.paymentcategory, pc.paymentcategoryorder
  )
  select 'Revenue', item, round(amount,2), sort_order from revenue
  union all
  select 'Revenue', 'Total Sales and Charges', round(coalesce(sum(amount),0),2), 99 from revenue
  union all
  select 'Taxes', item, round(amount,2), sort_order from taxes
  union all
  select 'Taxes', 'Total Taxes', round(coalesce(sum(amount),0),2), 199 from taxes
  union all
  select 'Adjustments', item, round(amount,2), sort_order from adjustments
  order by sort_order, item;
$$;

create or replace function ypl.report_dcar_total(p_date date)
returns numeric
language sql
stable
as $$
  with sales as (
    select coalesce(sum(transamount),0) as amount
      from ypl.transactions
     where transdate::date = p_date and not transarchive
  ), taxes as (
    select coalesce(sum(ypl.transaction_tax_total(
      transgstamount, transpstamount, transhstamount,
      transltamount, transrtamount, transhtamount, transdmtamount
    )),0) as amount
      from ypl.transactions
     where transdate::date = p_date and not transarchive
  ), adjustments as (
    select coalesce(sum(ypl.payment_reporting_effect(paymentcategory, paymentamountcdn, paymentamount)),0) as amount
      from ypl.payments
     where paymentdate::date = p_date
       and paymentcategory <> 'Payment (Regular)'
       and not paymentarchive
  )
  select round(sales.amount + taxes.amount + adjustments.amount, 2)
    from sales, taxes, adjustments;
$$;

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
  select pt.paymenttype::text,
         round(coalesce(sum(ypl.payment_cash_effect(p.paymentcategory, p.paymentamountcdn, p.paymentamount)), 0), 2) as calc_amount,
         null::numeric as actual_amount,
         null::numeric as adjustment,
         pt.paymenttypeorder
    from ypl.lookup_payment_types pt
    left join ypl.payments p
      on p.paymenttype = pt.paymenttype
     and p.paymentdate::date = p_date
     and not p.paymentarchive
   group by pt.paymenttype, pt.paymenttypeorder
   order by pt.paymenttypeorder, pt.paymenttype;
$$;

create or replace function ypl.report_dcar_receipts_total(p_date date)
returns numeric
language sql
stable
as $$
  select round(coalesce(sum(ypl.payment_cash_effect(paymentcategory, paymentamountcdn, paymentamount)),0),2)
    from ypl.payments
   where paymentdate::date = p_date
     and not paymentarchive;
$$;

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
         ypl.report_dcar_total(p_date),
         ypl.report_dcar_receipts_total(p_date),
         round(ypl.report_dcar_total(p_date) - ypl.report_dcar_receipts_total(p_date), 2),
         false,
         'Access stores calculated DCAR data; actual amounts/adjustments are handwritten on the printed cash sheet unless a future in-app adjustment table is explicitly added.';
$$;

create or replace function ypl.report_deposits_received(p_date date)
returns table (
  payment_type text,
  resnumber integer,
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

create or replace function ypl.report_deposits_applied(p_date date)
returns table (
  payment_type text,
  resnumber integer,
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
   order by p.paymenttype, p.paymentdate, r.resnumber, p.paymentid;
$$;

create or replace function ypl.report_items_cashed_out(p_date date)
returns table (
  inv_code varchar,
  resnumber integer,
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
    left join ypl.inventory_items inv on inv.inventoryid = t.inventoryid
   where t.transdate::date = p_date
     and not t.transarchive
   order by coalesce(inv.invcode, t.invcode), t.resnumber, t.transactionid;
$$;
