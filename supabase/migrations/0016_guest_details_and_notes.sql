-- =============================================================================
-- 0016_guest_details_and_notes.sql
-- A guest's details can be corrected, every note on a stay saves the same way
-- (what is in the box is what prints, an empty box means none), and a stay's
-- room can be changed outright without leaving its charges behind.
--
--   * update_guest could change a field but never empty one — a second phone
--     number, once entered, stayed for good. A field passed as text now sets
--     it, an empty string empties it, and a field left out (null) is kept, so
--     a screen showing only some of a guest's details can't erase the rest.
--   * Housekeeping notes are a dated history, and add_housekeeping_note
--     refuses empty text, so the note in force could be changed but never
--     cleared. set_housekeeping_note writes the note in force: new text adds
--     it to the history, the same text changes nothing, and an empty box
--     removes the notes in force so none prints (archived, not deleted).
--   * Changing the room on a stay's room row is how Access did it — overtype
--     the room, nothing else checked. Access left posted room charges naming
--     the old room at the old rate: 387 of its room-charge lines bill a room
--     the stay isn't in, 128 of them swapped rooms each charged for the other.
--     A room row's room now can't change while a room charge for the old room
--     is posted over those nights (remove it, change the room, post the new
--     one), nor to the room the stay is already in on the nights either side
--     (that is undoing a move, which keeps the stay in one row).
-- =============================================================================

set search_path = ypl, public;

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
  if p_lastname is not null and nullif(trim(p_lastname), '') is null then
    raise exception 'Guest last name is required';
  end if;
  update ypl.guests g
     set guestlastname = coalesce(trim(p_lastname), g.guestlastname),
         guestfirstname = case when p_firstname is null then g.guestfirstname else nullif(trim(p_firstname), '') end,
         guestsalutation = case when p_salutation is null then g.guestsalutation else nullif(trim(p_salutation), '') end,
         guestaddress = case when p_address is null then g.guestaddress else nullif(trim(p_address), '') end,
         guestcity = case when p_city is null then g.guestcity else nullif(trim(p_city), '') end,
         guestregion = case when p_region is null then g.guestregion else nullif(trim(p_region), '') end,
         guestcountry = case when p_country is null then g.guestcountry else nullif(trim(p_country), '') end,
         guestpczip = case when p_pczip is null then g.guestpczip else nullif(trim(p_pczip), '') end,
         guestprimaryphone = case when p_primaryphone is null then g.guestprimaryphone else nullif(trim(p_primaryphone), '') end,
         guestprimaryphonetype = case when p_primaryphonetype is null then g.guestprimaryphonetype else nullif(trim(p_primaryphonetype), '') end,
         guestsecondaryphone = case when p_secondaryphone is null then g.guestsecondaryphone else nullif(trim(p_secondaryphone), '') end,
         guestsecondaryphonetype = case when p_secondaryphonetype is null then g.guestsecondaryphonetype else nullif(trim(p_secondaryphonetype), '') end,
         guestemailaddress = case when p_email is null then g.guestemailaddress else nullif(trim(p_email), '') end,
         guestcompany = case when p_company is null then g.guestcompany else nullif(trim(p_company), '') end
   where g.guestid = p_guestid;
  if not found then
    raise exception 'Guest % not found', p_guestid;
  end if;
end;
$$;

comment on function ypl.update_guest is
  'Corrects a guest''s details. A field given as text sets it and an empty string empties it; a field left null is kept. The last name can be changed but not emptied.';

create or replace function ypl.set_housekeeping_note(
  p_reservationguestid integer,
  p_notes text,
  p_date date default current_date
) returns void
language plpgsql
volatile
as $$
declare
  v_text text := nullif(trim(coalesce(p_notes, '')), '');
  v_current text;
begin
  select hk.housekeepingnotes into v_current
    from ypl.v_current_housekeeping_notes hk
   where hk.reservationguestid = p_reservationguestid;

  if v_text is null then
    update ypl.housekeeping_notes h
       set hkarchive = true
     where h.reservationguestid = p_reservationguestid
       and not h.hkarchive;
  elsif v_text is distinct from trim(coalesce(v_current, '')) then
    perform ypl.add_housekeeping_note(p_reservationguestid, v_text, p_date);
  end if;
end;
$$;

comment on function ypl.set_housekeeping_note is
  'Sets the housekeeping note in force for a guest on a stay: new text is added to the dated history, the same text changes nothing, and an empty note removes the notes in force (archived) so none prints.';

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

  if tg_op = 'UPDATE' and new.roomid is distinct from old.roomid and not new.occupancyarchive then
    if exists (
      select 1
        from ypl.transactions t
        join ypl.reservation_guests trg on trg.reservationguestid = t.reservationguestid
        join ypl.reservation_guests org on org.reservationguestid = old.reservationguestid
       where trg.reservationid = org.reservationid
         and t.transtype = 'Room'
         and not t.transarchive
         and t.roomid = old.roomid
         and (t.occupancyin is null
              or (t.occupancyin::date < old.occupancyout::date
                  and t.occupancyout::date > old.occupancyin::date))
    ) then
      raise exception 'A room charge for % is posted for these nights. Remove it before changing the room.',
        (select ypl.room_display_compact(r.roomname, r.roomnumber) from ypl.rooms r where r.roomid = old.roomid);
    end if;
    if exists (
      select 1
        from ypl.room_assignments o
       where o.reservationguestid = new.reservationguestid
         and o.occupancyid <> new.occupancyid
         and not o.occupancyarchive
         and o.roomid = new.roomid
         and (o.occupancyout::date = new.occupancyin::date or o.occupancyin::date = new.occupancyout::date)
    ) then
      raise exception 'The stay is already in that room on the nights either side. Undo the move instead.';
    end if;
  end if;
  return new;
end;
$$;

grant execute on all functions in schema ypl to authenticated, service_role;
