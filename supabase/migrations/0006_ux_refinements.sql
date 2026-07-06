-- =============================================================================
-- 0006_ux_refinements.sql
-- Search/report refinements from the spec wireframe audit:
--   * date search returns party size, nights, deposit held, and cancellation
--     state so the results screen reads as the morning arrivals sheet
--     (spec/wireframes/date-search-results.svg)
--   * the Manual Sales List can include cancelled reservations, marked with
--     a checked box, instead of always hiding them
--     (spec/wireframes/manual-sales-list-liquor-charge-list-output.svg)
-- =============================================================================

set search_path = ypl, public;

drop function if exists ypl.search_by_date(date, text);
create function ypl.search_by_date(
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
  match_type text,
  numnights integer,
  pax integer,
  deposit_cdn numeric,
  rescancelled boolean
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
         end,
         s.numnights,
         (s.numadults + coalesce(s.numchildren, 0)),
         coalesce((
           select round(sum(case p.paymentcategory
                    when 'Deposit (Received)' then ypl.money_amount(p.paymentamountcdn, p.paymentamount)
                    when 'Deposit (Refund)'   then ypl.money_amount(p.paymentamountcdn, p.paymentamount)
                    else 0 end), 2)
             from ypl.payments p
             join ypl.reservation_guests rg on rg.reservationguestid = p.reservationguestid
            where rg.reservationid = s.reservationid
              and not rg.rgarchive
              and not p.paymentarchive
         ), 0),
         s.rescancelled
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

comment on function ypl.search_by_date is
  'Date search for the lookup workflow: arrivals/departures/both/in-house with party size, nights, net deposit held, and cancellation state.';

drop function if exists ypl.report_manual_sales(date);
create function ypl.report_manual_sales(
  p_date date,
  p_include_cancelled boolean default false
)
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
   where (p_include_cancelled or not o.rescancelled)
     and not o.occupancyarchive
     and p_date between o.occupancyin::date and o.occupancyout::date
   order by o.roomorder nulls last, o.room_compact, o.resnumber;
$$;

comment on function ypl.report_manual_sales is
  'Manual Sales List rows in lodge room order. Cancelled reservations are excluded by default; pass p_include_cancelled to show them (marked by the checkbox on the printed list).';

-- -----------------------------------------------------------------------------
-- Multi-name reservations
-- -----------------------------------------------------------------------------

-- All active guest names on a reservation, primary first, one per line —
-- printed guest documents show every recorded name where names appear.
create or replace function ypl.reservation_guest_names(p_reservationid integer)
returns text
language sql
stable
as $$
  select string_agg(
           ypl.guest_display_name(g.guestlastname, g.guestfirstname, g.guestcompany),
           E'\n' order by rg.primaryguest desc, rg.reservationguestid)
    from ypl.reservation_guests rg
    join ypl.guests g on g.guestid = rg.guestid
   where rg.reservationid = p_reservationid
     and not rg.rgarchive;
$$;

-- Guest history carries shared-booking context: how many names are attached
-- and who else shares the stay (spec: represent multi-name participation).
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
  balance_owing numeric,
  party_size integer,
  co_guests text
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
         s.balance_owing,
         (select count(*)::integer from ypl.reservation_guests rg2
           where rg2.reservationid = s.reservationid and not rg2.rgarchive),
         (select string_agg(
                   ypl.guest_display_name(g2.guestlastname, g2.guestfirstname, g2.guestcompany),
                   '; ' order by rg2.primaryguest desc, rg2.reservationguestid)
            from ypl.reservation_guests rg2
            join ypl.guests g2 on g2.guestid = rg2.guestid
           where rg2.reservationid = s.reservationid
             and rg2.guestid <> p_guestid
             and not rg2.rgarchive)
    from ypl.reservation_guests rg
    join ypl.v_reservation_summary s on s.reservationid = rg.reservationid
   where rg.guestid = p_guestid
     and not rg.rgarchive
   order by s.resarrivaldate desc, s.resnumber desc;
$$;

-- Guest documents print every recorded name. Return shapes gain guest_names;
-- existing columns are unchanged.
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
  deposit_date date
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

drop function if exists ypl.report_checkout_bill_header(integer);
create function ypl.report_checkout_bill_header(p_reservationid integer)
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

grant execute on all functions in schema ypl to authenticated, service_role;
