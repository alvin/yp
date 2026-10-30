-- =============================================================================
-- 0033_admin_area.sql
-- The admin area: the admin login, the tax rates and price list it keeps, and
-- the reports it holds.
--
-- The lodge asked for a separate area, for the admin login alone, for what
-- otherwise needs Supabase itself: what was sold over any stretch of days, the
-- year-end deposits over a chosen range, and the tax rates and prices the
-- charges are worked out from.
--
-- * is_admin() is the admin login. Only it may write the tax rates, the items
--   and item types, the rooms, their rates, the rate codes and the room types
--   (RLS), and the RPCs that change them refuse anyone else in so many words.
--   Supabase's table editor and SQL editor are unaffected: they don't sign in
--   as staff.
-- * Tax rates and room rates are dated, as Access kept them: each row runs
--   From a day To a day, and a charge is taxed and priced at the rates of its
--   own date. A change ahead of time is a row that starts later. Two rows of
--   one tax, or of one room's rate type, can't cover the same day: the trigger
--   says which row is in the way, however the row is written. Adding a rate
--   that starts while another is running, and runs at least as long, ends that
--   one the day before, which is how a rate changes from a date. A rate is
--   removed until the day it starts, and the rate it ended runs on again.
-- * Rooms are kept as Access's Room form kept them: name, number, type, code,
--   shorthand, sort order, notes, taxes and archive, each with its own rate
--   rows. A rate can be added to several rooms at once, as Access's Append Room
--   Rates did. Rate codes and room types are lookups, as in Access's Maintain
--   Lookup Tables: added, and a code's description changed.
-- * An item's price isn't dated (Access kept one price per item), so it is
--   changed where it stands, from the next charge on.
-- * An item type decides the daily cash line an item's charges post to. The
--   lodge's types keep the lines charge_category gave them; a type added here,
--   or one changed here, carries its own.
-- * Items sold over a range read the Items Cashed Out appendix's rule
--   (cashed_out_on) on every day of the range.
-- * Next Year's Deposits takes a range: deposits received in it, for stays
--   arriving after it. January 1 to December 31 is the year end it was.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- The admin login
-- -----------------------------------------------------------------------------

-- PostgREST puts the signed-in login's claims on every request. A session
-- without them isn't an API request at all (the SQL editor, psql, the import),
-- and those already hold the database's own credentials.
create or replace function ypl.is_admin()
returns boolean
language sql
stable
as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is null then true
    else coalesce(
      lower(current_setting('request.jwt.claims', true)::jsonb ->> 'email') = 'admin@yellowpointlodge.com'
        or current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role',
      false)
  end;
$$;

comment on function ypl.is_admin is
  'True for the admin login (admin@yellowpointlodge.com), the service role, and a direct database session; false for every other signed-in login.';

create or replace function ypl.require_admin()
returns void
language plpgsql
stable
as $$
begin
  if not ypl.is_admin() then
    raise exception 'Only the admin login can change the tax rates and the price list.'
      using errcode = '42501';
  end if;
end;
$$;

-- Staff read these tables as before; only the admin login writes them.
do $$
declare
  t text;
begin
  foreach t in array array[
    'tax_rates', 'inventory_items', 'lookup_inventory_types', 'rooms', 'room_rates',
    'lookup_room_rate_codes', 'lookup_room_types'
  ] loop
    execute format('drop policy if exists %I on ypl.%I', t || '_staff_all', t);
    execute format('drop policy if exists %I on ypl.%I', t || '_staff_read', t);
    execute format('drop policy if exists %I on ypl.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on ypl.%I for select to authenticated using (true)',
      t || '_staff_read', t);
    execute format(
      'create policy %I on ypl.%I for all to authenticated using (ypl.is_admin()) with check (ypl.is_admin())',
      t || '_admin_write', t);
  end loop;
end$$;

-- How a rate and a day read in a message: 7%, 4.8%; 01-Jul-10.
create or replace function ypl.percent_text(p_rate numeric)
returns text
language sql
immutable
as $$
  select rtrim(rtrim(to_char(p_rate * 100, 'FM990.999'), '0'), '.') || '%';
$$;

create or replace function ypl.day_text(p_date date)
returns text
language sql
immutable
as $$
  select to_char(p_date, 'DD-Mon-YY');
$$;

-- The lodge's names for its taxes.
create or replace function ypl.tax_name(p_taxratetype text)
returns text
language sql
immutable
as $$
  select case p_taxratetype
    when 'Liquor' then 'Liquor Tax'
    when 'Room' then 'Room Tax'
    when 'Hotel' then 'Hotel Tax'
    else p_taxratetype
  end;
$$;

-- The desk's names for a room's three rates.
create or replace function ypl.rate_type_label(p_ratetype text)
returns text
language sql
immutable
as $$
  select case p_ratetype when 'Regular' then 'Double' when 'Special' then 'Single' else p_ratetype end;
$$;

-- -----------------------------------------------------------------------------
-- The rate in force: one definition each for taxes and room nights
-- -----------------------------------------------------------------------------

create or replace function ypl.tax_rate_in_force(p_taxratetype text, p_date date)
returns setof ypl.tax_rates
language sql
stable
rows 1
as $$
  select t.*
    from ypl.tax_rates t
   where t.taxratetype = p_taxratetype
     and not t.taxratearchive
     and p_date between t.taxratestartdate::date and t.taxrateenddate::date
   order by t.taxratestartdate desc, t.taxrateid desc
   limit 1;
$$;

comment on function ypl.tax_rate_in_force is
  'The tax_rates row of a type in force on a date: the latest-starting row that covers it. Nothing when no row does.';

create or replace function ypl.effective_tax_rate(p_taxratetype text, p_date date)
returns numeric
language sql
stable
as $$
  select coalesce((select r.taxrate::numeric from ypl.tax_rate_in_force(p_taxratetype, p_date) r), 0);
$$;

comment on function ypl.effective_tax_rate is
  'Tax rate (fraction) of the given type effective on a date, from ypl.tax_rates. 0 when no rate row covers the date.';

create or replace function ypl.room_rate_in_force(
  p_roomid integer,
  p_date date,
  p_ratetype text default 'Regular'
) returns setof ypl.room_rates
language sql
stable
rows 1
as $$
  select r.*
    from ypl.room_rates r
   where r.roomid = p_roomid
     and r.roomratetype = coalesce(p_ratetype, 'Regular')
     and not r.roomratearchive
     and p_date between r.roomratestartdate::date and r.roomrateenddate::date
   order by r.roomratestartdate desc, r.roomrateid desc
   limit 1;
$$;

comment on function ypl.room_rate_in_force is
  'The room_rates row of a room and rate type (Regular, Special or Split; Regular when not given) in force on a date. Nothing when no row covers it.';

create or replace function ypl.effective_room_rate(
  p_roomid integer,
  p_date date,
  p_ratetype text default 'Regular'
) returns numeric
language sql
stable
as $$
  select r.roomrate::numeric from ypl.room_rate_in_force(p_roomid, p_date, p_ratetype) r;
$$;

comment on function ypl.effective_room_rate is
  'Nightly rate of a room on a date for a rate type (Regular, Special or Split; Regular when not given), from ypl.room_rates. Null when no rate row covers the date.';

-- -----------------------------------------------------------------------------
-- Tax rates: dated rows that never overlap
-- -----------------------------------------------------------------------------

create or replace function ypl.tax_rates_check()
returns trigger
language plpgsql
as $$
declare
  v_other ypl.tax_rates;
begin
  if new.taxratearchive then
    return new;
  end if;
  if new.taxrate is null or new.taxrate < 0 or new.taxrate >= 1 then
    raise exception 'A tax rate is from 0%% to under 100%%.';
  end if;
  if new.taxrateenddate::date < new.taxratestartdate::date then
    raise exception 'A rate ends on or after the day it starts.';
  end if;
  select * into v_other
    from ypl.tax_rates t
   where t.taxratetype = new.taxratetype
     and not t.taxratearchive
     and t.taxrateid is distinct from new.taxrateid
     and t.taxratestartdate::date <= new.taxrateenddate::date
     and new.taxratestartdate::date <= t.taxrateenddate::date
   order by t.taxratestartdate
   limit 1;
  if found then
    raise exception '% is already % from % to %.',
      ypl.tax_name(new.taxratetype), ypl.percent_text(v_other.taxrate::numeric),
      ypl.day_text(v_other.taxratestartdate::date), ypl.day_text(v_other.taxrateenddate::date);
  end if;
  return new;
end;
$$;

drop trigger if exists tax_rates_check on ypl.tax_rates;
create trigger tax_rates_check
  before insert or update on ypl.tax_rates
  for each row execute function ypl.tax_rates_check();

create or replace function ypl.save_tax_rate(
  p_taxrateid integer,
  p_taxratetype text,
  p_rate numeric,
  p_from date,
  p_to date,
  p_notes text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_id integer;
begin
  perform ypl.require_admin();
  if p_from is null or p_to is null then
    raise exception 'A rate needs a From and a To date.';
  end if;

  if p_taxrateid is not null then
    update ypl.tax_rates
       set taxrate = round(p_rate, 6),
           taxratestartdate = p_from,
           taxrateenddate = p_to,
           taxratenotes = case when p_notes is null then taxratenotes else nullif(btrim(p_notes), '') end
     where taxrateid = p_taxrateid and not taxratearchive
     returning taxrateid into v_id;
    if v_id is null then
      raise exception 'There is no such rate.';
    end if;
    return v_id;
  end if;

  if not exists (select 1 from ypl.lookup_tax_rate_types where taxratetype = p_taxratetype) then
    raise exception 'There is no % tax.', p_taxratetype;
  end if;
  -- A rate running when the new one starts, and ending no later than it does,
  -- ends the day before: the tax changes from that day.
  update ypl.tax_rates t
     set taxrateenddate = p_from - 1
   where t.taxratetype = p_taxratetype
     and not t.taxratearchive
     and t.taxratestartdate::date < p_from
     and t.taxrateenddate::date >= p_from
     and t.taxrateenddate::date <= p_to;
  insert into ypl.tax_rates (taxratetype, taxrate, taxratestartdate, taxrateenddate, taxratenotes, taxratearchive)
  values (p_taxratetype, round(p_rate, 6), p_from, p_to, nullif(btrim(p_notes), ''), false)
  returning taxrateid into v_id;
  return v_id;
end;
$$;

comment on function ypl.save_tax_rate is
  'Admin login only. Adds a dated tax rate (no id) or changes one: the rate (a fraction), its From and To dates and its notes (text sets them, an empty string clears them, null keeps them). A new rate that starts while another runs, and runs at least as long, ends that one the day before; any other overlap is refused.';

create or replace function ypl.remove_tax_rate(p_taxrateid integer)
returns void
language plpgsql
volatile
as $$
declare
  v_rate ypl.tax_rates;
begin
  perform ypl.require_admin();
  select * into v_rate from ypl.tax_rates where taxrateid = p_taxrateid and not taxratearchive;
  if not found then
    raise exception 'There is no such rate.';
  end if;
  if v_rate.taxratestartdate::date < current_date then
    raise exception 'A rate that started before today can''t be removed.';
  end if;
  update ypl.tax_rates set taxratearchive = true where taxrateid = p_taxrateid;
  -- The rate it took over from, if any, runs on over its days again.
  update ypl.tax_rates t
     set taxrateenddate = v_rate.taxrateenddate
   where t.taxratetype = v_rate.taxratetype
     and not t.taxratearchive
     and t.taxrateenddate::date = v_rate.taxratestartdate::date - 1;
end;
$$;

comment on function ypl.remove_tax_rate is
  'Admin login only. Removes (archives) a tax rate starting today or later; the rate ending the day before it runs on to its end.';

-- -----------------------------------------------------------------------------
-- Rooms, their rates, rate codes and room types
-- -----------------------------------------------------------------------------

create or replace function ypl.room_rates_check()
returns trigger
language plpgsql
as $$
declare
  v_other ypl.room_rates;
  v_room text;
begin
  if new.roomratearchive then
    return new;
  end if;
  if new.roomrate is null or new.roomrate < 0 then
    raise exception 'A room night''s price is $0.00 or more.';
  end if;
  if new.roomrateenddate::date < new.roomratestartdate::date then
    raise exception 'A rate ends on or after the day it starts.';
  end if;
  select * into v_other
    from ypl.room_rates r
   where r.roomid = new.roomid
     and r.roomratetype is not distinct from new.roomratetype
     and not r.roomratearchive
     and r.roomrateid is distinct from new.roomrateid
     and r.roomratestartdate::date <= new.roomrateenddate::date
     and new.roomratestartdate::date <= r.roomrateenddate::date
   order by r.roomratestartdate
   limit 1;
  if found then
    select roomname || coalesce(' ' || roomnumber, '') into v_room from ypl.rooms where roomid = new.roomid;
    raise exception '% already has a % rate of $% from % to %.',
      v_room, ypl.rate_type_label(new.roomratetype), to_char(v_other.roomrate, 'FM999,990.00'),
      ypl.day_text(v_other.roomratestartdate::date), ypl.day_text(v_other.roomrateenddate::date);
  end if;
  return new;
end;
$$;

drop trigger if exists room_rates_check on ypl.room_rates;
create trigger room_rates_check
  before insert or update on ypl.room_rates
  for each row execute function ypl.room_rates_check();

-- A room, as Access's Room form kept it. The name and number say which room it
-- is everywhere it is shown, so no two rooms share them; the sort order is the
-- lodge's order on every list and report (a decimal places a room between two
-- others, as Access allowed), so no two rooms share that either.
create or replace function ypl.save_room(
  p_roomid integer,
  p_roomname text,
  p_roomnumber text,
  p_roomtype text,
  p_roomcode text,
  p_roomshorthand text,
  p_roomorder real,
  p_roomnotes text,
  p_gst boolean,
  p_pst boolean,
  p_room_tax boolean,
  p_dmt boolean,
  p_active boolean default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_name text := nullif(btrim(p_roomname), '');
  v_number text := nullif(btrim(p_roomnumber), '');
  v_type text := nullif(btrim(p_roomtype), '');
  v_code text := nullif(btrim(p_roomcode), '');
  v_shorthand text := nullif(btrim(p_roomshorthand), '');
  v_other text;
  v_id integer;
begin
  perform ypl.require_admin();
  if v_name is null then
    raise exception 'A room needs a name.';
  end if;
  if length(v_name) > 25 then
    raise exception 'A room''s name is at most 25 characters.';
  end if;
  if length(v_number) > 5 then
    raise exception 'A room''s number is at most 5 characters.';
  end if;
  if length(v_code) > 3 then
    raise exception 'A room code is at most 3 characters.';
  end if;
  if length(v_shorthand) > 10 then
    raise exception 'A room''s shorthand is at most 10 characters.';
  end if;
  if v_type is null
     or not exists (select 1 from ypl.lookup_room_types t where btrim(t.roomtype) = v_type) then
    raise exception 'Choose the room''s type.';
  end if;
  if p_roomorder is null then
    raise exception 'A room needs a sort order.';
  end if;
  if p_roomid is not null and not exists (select 1 from ypl.rooms where roomid = p_roomid) then
    raise exception 'There is no room %.', p_roomid;
  end if;

  select roomname || coalesce(' ' || roomnumber, '') into v_other
    from ypl.rooms r
   where r.roomid is distinct from p_roomid
     and lower(btrim(r.roomname)) = lower(v_name)
     and coalesce(lower(btrim(r.roomnumber)), '') = coalesce(lower(v_number), '');
  if found then
    raise exception 'There is already a room %.', v_other;
  end if;
  select roomname || coalesce(' ' || roomnumber, '') into v_other
    from ypl.rooms r
   where r.roomid is distinct from p_roomid
     and r.roomorder = p_roomorder;
  if found then
    raise exception '% already sorts at %.', v_other, p_roomorder;
  end if;

  if p_roomid is null then
    insert into ypl.rooms (
      roomname, roomnumber, roomtype, roomcode, roomshorthand, roomorder, roomnotes,
      roomgst, roompst, roomhst, roomrt, roomht, roomdmt, roomarchive
    ) values (
      v_name, v_number, v_type, v_code, v_shorthand, p_roomorder, nullif(btrim(p_roomnotes), ''),
      coalesce(p_gst, false), coalesce(p_pst, false), false, coalesce(p_room_tax, false), false,
      coalesce(p_dmt, false), not coalesce(p_active, true)
    )
    returning roomid into v_id;
    return v_id;
  end if;

  update ypl.rooms
     set roomname = v_name,
         roomnumber = v_number,
         roomtype = v_type,
         roomcode = v_code,
         roomshorthand = v_shorthand,
         roomorder = p_roomorder,
         roomnotes = nullif(btrim(p_roomnotes), ''),
         roomgst = coalesce(p_gst, roomgst),
         roompst = coalesce(p_pst, roompst),
         roomrt = coalesce(p_room_tax, roomrt),
         roomdmt = coalesce(p_dmt, roomdmt),
         roomarchive = coalesce(not p_active, roomarchive)
   where roomid = p_roomid;
  return p_roomid;
end;
$$;

comment on function ypl.save_room is
  'Admin login only. Adds a room (no id) or changes one: name, number, type, code, shorthand, sort order, notes, which of GST, PST, room tax and DMT apply (null leaves a flag), and whether it is active. Two rooms can''t share a name and number, or a sort order.';

-- A rate row, as on Access's Room form: one room, one rate type, a code, a
-- price and its dates. A new rate can go on several rooms at once, as Access's
-- Append Room Rates did; each room's rate of that type running when it starts,
-- and ending no later than it does, ends the day before.
create or replace function ypl.save_room_rate(
  p_roomrateid integer,
  p_roomids integer[],
  p_roomratetype text,
  p_roomratecode text,
  p_rate numeric,
  p_from date,
  p_to date,
  p_notes text default null
) returns void
language plpgsql
volatile
as $$
declare
  v_code text := nullif(btrim(p_roomratecode), '');
  v_roomid integer;
begin
  perform ypl.require_admin();
  if not exists (select 1 from ypl.lookup_room_rate_types where roomratetype = p_roomratetype) then
    raise exception 'Choose Double, Single or Split.';
  end if;
  if v_code is null
     or not exists (select 1 from ypl.lookup_room_rate_codes where roomratecode = v_code) then
    raise exception 'Choose the rate''s code.';
  end if;
  if p_rate is null then
    raise exception 'Enter the price of a night.';
  end if;
  if p_from is null or p_to is null then
    raise exception 'A rate needs a From and a To date.';
  end if;

  if p_roomrateid is not null then
    update ypl.room_rates
       set roomratetype = p_roomratetype,
           roomratecode = v_code,
           roomrate = round(p_rate, 2),
           roomratestartdate = p_from,
           roomrateenddate = p_to,
           roomratenotes = nullif(btrim(p_notes), '')
     where roomrateid = p_roomrateid and not roomratearchive;
    if not found then
      raise exception 'There is no such rate.';
    end if;
    return;
  end if;

  if coalesce(array_length(p_roomids, 1), 0) = 0 then
    raise exception 'Choose the rooms it is for.';
  end if;
  foreach v_roomid in array p_roomids loop
    if not exists (select 1 from ypl.rooms where roomid = v_roomid) then
      raise exception 'There is no room %.', v_roomid;
    end if;
    update ypl.room_rates rr
       set roomrateenddate = p_from - 1
     where rr.roomid = v_roomid
       and rr.roomratetype = p_roomratetype
       and not rr.roomratearchive
       and rr.roomratestartdate::date < p_from
       and rr.roomrateenddate::date >= p_from
       and rr.roomrateenddate::date <= p_to;
    insert into ypl.room_rates (
      roomid, roomratetype, roomratecode, roomrate, roomratestartdate, roomrateenddate,
      roomratenotes, roomratearchive
    ) values (
      v_roomid, p_roomratetype, v_code, round(p_rate, 2), p_from, p_to,
      nullif(btrim(p_notes), ''), false
    );
  end loop;
end;
$$;

comment on function ypl.save_room_rate is
  'Admin login only. Changes a room rate row (an id), or adds one to each room given: rate type, code, price, From and To, notes. A new rate that starts while the room''s rate of that type runs, and runs at least as long, ends that one the day before; any other overlap is refused, naming the rate in the way.';

create or replace function ypl.remove_room_rate(p_roomrateid integer)
returns void
language plpgsql
volatile
as $$
declare
  v_rate ypl.room_rates;
begin
  perform ypl.require_admin();
  select * into v_rate from ypl.room_rates where roomrateid = p_roomrateid and not roomratearchive;
  if not found then
    raise exception 'There is no such rate.';
  end if;
  if v_rate.roomratestartdate::date < current_date then
    raise exception 'A rate that started before today can''t be removed.';
  end if;
  update ypl.room_rates set roomratearchive = true where roomrateid = p_roomrateid;
  -- The rate it took over from, if any, runs on over its days again.
  update ypl.room_rates r
     set roomrateenddate = v_rate.roomrateenddate
   where r.roomid = v_rate.roomid
     and r.roomratetype is not distinct from v_rate.roomratetype
     and not r.roomratearchive
     and r.roomrateenddate::date = v_rate.roomratestartdate::date - 1;
end;
$$;

comment on function ypl.remove_room_rate is
  'Admin login only. Removes (archives) a room rate starting today or later; the room''s rate of that type ending the day before it runs on to its end.';

-- Rate codes: Access's lookup of a code and what it stands for ("R01, Night
-- for Two - Private Cottage"). A code is added, and its description changed;
-- the rates carry the code itself, so it isn't renamed.
create or replace function ypl.rate_codes()
returns table (roomratecode text, description text, rooms integer)
language sql
stable
as $$
  select c.roomratecode::text,
         c.roomratecodedescription::text,
         (select count(distinct rr.roomid)::integer
            from ypl.room_rates rr
            join ypl.rooms r on r.roomid = rr.roomid
           where rr.roomratecode = c.roomratecode
             and not rr.roomratearchive
             and not r.roomarchive
             and rr.roomrateenddate::date >= current_date)
    from ypl.lookup_room_rate_codes c
   order by c.roomratecode;
$$;

comment on function ypl.rate_codes is
  'Each room rate code, what it stands for, and how many active rooms have a rate at it today or later.';

create or replace function ypl.save_rate_code(
  p_roomratecode text,
  p_description text,
  p_new boolean default false
) returns void
language plpgsql
volatile
as $$
declare
  v_code text := nullif(btrim(p_roomratecode), '');
  v_description text := nullif(btrim(p_description), '');
begin
  perform ypl.require_admin();
  if v_code is null then
    raise exception 'A rate code needs a code.';
  end if;
  if length(v_code) > 5 then
    raise exception 'A rate code is at most 5 characters.';
  end if;
  if length(v_description) > 50 then
    raise exception 'A rate code''s description is at most 50 characters.';
  end if;
  if p_new then
    if exists (select 1 from ypl.lookup_room_rate_codes where lower(roomratecode) = lower(v_code)) then
      raise exception '% is already a rate code.', v_code;
    end if;
    insert into ypl.lookup_room_rate_codes (roomratecode, roomratecodedescription)
    values (v_code, v_description);
    return;
  end if;
  update ypl.lookup_room_rate_codes
     set roomratecodedescription = v_description
   where roomratecode = v_code;
  if not found then
    raise exception 'There is no rate code %.', v_code;
  end if;
end;
$$;

comment on function ypl.save_rate_code is
  'Admin login only. Adds a room rate code with its description (p_new), or changes an existing code''s description.';

-- Room types: Access's lookup of the kinds of room ("Private Cabin"). A type
-- is added; the rooms carry the name itself, so it isn't renamed.
create or replace function ypl.room_types()
returns table (roomtype text, rooms integer)
language sql
stable
as $$
  select btrim(t.roomtype)::text,
         (select count(*)::integer from ypl.rooms r
           where btrim(r.roomtype) = btrim(t.roomtype) and not r.roomarchive)
    from ypl.lookup_room_types t
   order by btrim(t.roomtype);
$$;

comment on function ypl.room_types is
  'Each room type and how many active rooms are of it.';

create or replace function ypl.add_room_type(p_roomtype text)
returns void
language plpgsql
volatile
as $$
declare
  v_name text := nullif(btrim(p_roomtype), '');
begin
  perform ypl.require_admin();
  if v_name is null then
    raise exception 'A room type needs a name.';
  end if;
  if length(v_name) > 25 then
    raise exception 'A room type''s name is at most 25 characters.';
  end if;
  if exists (select 1 from ypl.lookup_room_types where lower(btrim(roomtype)) = lower(v_name)) then
    raise exception '% is already a room type.', v_name;
  end if;
  insert into ypl.lookup_room_types (roomtype) values (v_name);
end;
$$;

comment on function ypl.add_room_type is
  'Admin login only. Adds a room type.';

-- -----------------------------------------------------------------------------
-- Item types and the daily cash line they post to
-- -----------------------------------------------------------------------------

alter table ypl.lookup_inventory_types
  add column if not exists transactiontype varchar(25)
  references ypl.lookup_transaction_types (transactiontype);

comment on column ypl.lookup_inventory_types.transactiontype is
  'The daily cash line charges of this type post to. Empty for the types from Access, which keep the line charge_category gives them.';

create or replace function ypl.charge_category(p_invtype text)
returns text
language sql
stable
as $$
  select coalesce(
    (select t.transactiontype::text from ypl.lookup_inventory_types t where t.inventorytype = p_invtype),
    case p_invtype
      when 'Red Wine' then 'Liquor'
      when 'White Wine' then 'Liquor'
      when 'Beer and Cider' then 'Liquor'
      when 'Liqueurs' then 'Liquor'
      when 'Beauty Services' then 'Beauty Services'
      when 'Shuttle' then 'Shuttle Service'
      when 'Shirts and Clothing' then 'Hats/Shirts'
      when 'Sundries' then 'Sundries'
      when 'Gift Certificate' then 'Gift Certificate'
      else 'Misc.'
    end);
$$;

comment on function ypl.charge_category is
  'The daily cash category an item''s charge posts to, from the item''s type: the line the type carries, or for the types from Access the one they always had (Red Wine → Liquor). Anything unlisted is Misc.';

create or replace function ypl.item_types()
returns table (inventorytype text, transactiontype text, items integer)
language sql
stable
as $$
  select t.inventorytype::text,
         ypl.charge_category(t.inventorytype),
         (select count(*)::integer from ypl.inventory_items i
           where i.invtype = t.inventorytype and not i.invarchive)
    from ypl.lookup_inventory_types t
   order by t.inventorytype;
$$;

comment on function ypl.item_types is
  'Each item type with the daily cash line its charges post to and how many active items it has.';

create or replace function ypl.save_item_type(p_inventorytype text, p_transactiontype text)
returns void
language plpgsql
volatile
as $$
declare
  v_name text := nullif(btrim(p_inventorytype), '');
begin
  perform ypl.require_admin();
  if v_name is null then
    raise exception 'An item type needs a name.';
  end if;
  if length(v_name) > 25 then
    raise exception 'An item type''s name is at most 25 characters.';
  end if;
  if p_transactiontype is null or p_transactiontype = 'Room'
     or not exists (select 1 from ypl.lookup_transaction_types where transactiontype = p_transactiontype) then
    raise exception 'Choose the daily cash line its charges post to.';
  end if;
  insert into ypl.lookup_inventory_types (inventorytype, transactiontype)
  values (v_name, p_transactiontype)
  on conflict (inventorytype) do update set transactiontype = excluded.transactiontype;
end;
$$;

comment on function ypl.save_item_type is
  'Admin login only. Adds an item type with the daily cash line its charges post to, or changes an existing type''s line.';

-- -----------------------------------------------------------------------------
-- Items on the price list
-- -----------------------------------------------------------------------------

create or replace function ypl.save_inventory_item(
  p_inventoryid integer,
  p_invcode text,
  p_description text,
  p_invtype text,
  p_price numeric,
  p_gst boolean default null,
  p_pst boolean default null,
  p_liquor boolean default null,
  p_room_tax boolean default null,
  p_dmt boolean default null,
  p_active boolean default null,
  p_notes text default null
) returns integer
language plpgsql
volatile
as $$
declare
  v_code text := nullif(btrim(p_invcode), '');
  v_type text := nullif(btrim(p_invtype), '');
  v_old ypl.inventory_items;
  v_id integer;
begin
  perform ypl.require_admin();
  if v_code is null then
    raise exception 'An item needs a code.';
  end if;
  if length(v_code) > 5 then
    raise exception 'An item code is at most 5 characters.';
  end if;
  if v_type is not null
     and not exists (select 1 from ypl.lookup_inventory_types where inventorytype = v_type) then
    raise exception 'There is no item type %.', v_type;
  end if;
  if p_inventoryid is not null then
    select * into v_old from ypl.inventory_items where inventoryid = p_inventoryid;
    if not found then
      raise exception 'There is no item %.', p_inventoryid;
    end if;
  end if;

  -- A code names one item on the price list at a time. The check is made when
  -- an item is added, recoded or enabled, so the few codes Access left on two
  -- items still save their other changes.
  if coalesce(p_active, p_inventoryid is null or not v_old.invarchive)
     and (p_inventoryid is null or v_old.invarchive or lower(btrim(v_old.invcode)) <> lower(v_code))
     and exists (
       select 1
         from ypl.inventory_items i
        where not i.invarchive
          and lower(btrim(i.invcode)) = lower(v_code)
          and i.inventoryid is distinct from p_inventoryid
     ) then
    raise exception '% is already on the price list.', v_code;
  end if;

  if p_inventoryid is null then
    insert into ypl.inventory_items (
      invtype, invcode, invitemdescription, invamount,
      invgst, invpst, invhst, invlt, invrt, invht, invdmt, invnotes, invarchive
    ) values (
      v_type, v_code, nullif(btrim(p_description), ''), round(p_price, 2),
      coalesce(p_gst, false), coalesce(p_pst, false), false, coalesce(p_liquor, false),
      coalesce(p_room_tax, false), false, coalesce(p_dmt, false), nullif(btrim(p_notes), ''),
      not coalesce(p_active, true)
    )
    returning inventoryid into v_id;
    return v_id;
  end if;

  update ypl.inventory_items
     set invcode = v_code,
         invitemdescription = nullif(btrim(p_description), ''),
         invtype = v_type,
         invamount = round(p_price, 2),
         invgst = coalesce(p_gst, invgst),
         invpst = coalesce(p_pst, invpst),
         invlt = coalesce(p_liquor, invlt),
         invrt = coalesce(p_room_tax, invrt),
         invdmt = coalesce(p_dmt, invdmt),
         invnotes = case when p_notes is null then invnotes else nullif(btrim(p_notes), '') end,
         invarchive = coalesce(not p_active, invarchive)
   where inventoryid = p_inventoryid;
  return p_inventoryid;
end;
$$;

comment on function ypl.save_inventory_item is
  'Admin login only. Adds an item to the price list (no id) or changes one: code, description, type, price, which of GST, PST, liquor tax, room tax and DMT apply (null leaves a flag as it is), whether it is active, and its notes (text sets them, an empty string clears them, null keeps them). A code an active item already has is refused.';

-- -----------------------------------------------------------------------------
-- Items sold over a range of days
-- -----------------------------------------------------------------------------

-- The day a charge reaches the cash sheet: its stay's check-out day, or the
-- day it was posted when that is later (a walk-in sale on a daily sales
-- account, a late charge).
create or replace function ypl.cashed_out_on(p_transdate timestamp, p_checkoutdate timestamp)
returns date
language sql
immutable
as $$
  select greatest(p_transdate::date, coalesce(p_checkoutdate::date, p_transdate::date));
$$;

comment on function ypl.cashed_out_on is
  'The day a charge line is cashed out: the later of its posting date and its stay''s check-out date.';

create or replace function ypl.charges_cashed_out(p_date date)
returns setof ypl.transactions
language sql
stable
as $$
  select t.*
    from ypl.transactions t
    join ypl.reservation_guests rg on rg.reservationguestid = t.reservationguestid
   where not t.transarchive
     and ypl.cashed_out_on(t.transdate, rg.checkoutdate) = p_date;
$$;

comment on function ypl.charges_cashed_out is
  'The charge lines a day''s cash sheet counts: a stay''s charges on its check-out day, and a charge posted after its stay''s check-out day on the day it was posted.';

create or replace function ypl.report_items_sold(p_from date, p_to date, p_codes text[] default null)
returns table (
  cashed_out date,
  inv_code varchar,
  inv_type text,
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
  select ypl.cashed_out_on(t.transdate, rg.checkoutdate),
         coalesce(inv.invcode, '')::varchar,
         inv.invtype::text,
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
   where not t.transarchive
     and t.transtype is distinct from 'Room'
     and ypl.cashed_out_on(t.transdate, rg.checkoutdate) between p_from and p_to
     and (p_codes is null or coalesce(inv.invcode, '') = any (p_codes))
   order by 2, 1, 4, t.transactionid;
$$;

comment on function ypl.report_items_sold is
  'Items Cashed Out over a range of days: every item line cashed out between two dates (room nights left out), with its item type, for the item codes given or all of them, by code and then day. A line with no item code (a handful from Access) has code ''''.';

-- -----------------------------------------------------------------------------
-- Next Year's Deposits over a range
-- -----------------------------------------------------------------------------

drop function if exists ypl.report_next_years_deposits(integer);

create or replace function ypl.report_next_years_deposits(p_from date, p_to date)
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
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date as month
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
       and p.paymentdate::date between p_from and p_to
       and r.resarrivaldate::date > p_to
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
  'Deposits received between two dates for stays arriving after the second, by month received: how many (not counting $0.00 placeholder lines), how much, how much of it was refunded or kept within the range, and what is still held. Refunds are stored negative and shown positive.';

grant execute on all functions in schema ypl to authenticated, service_role;
