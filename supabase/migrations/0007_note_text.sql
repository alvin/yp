-- =============================================================================
-- 0007_note_text.sql
-- Notes are plain text.
-- =============================================================================
-- Access stored its memo fields as rich text, so nearly every note in the
-- lodge's data arrives wrapped in markup: one <div> per line, decorative
-- <strong>/<em>/<u>/<font>, and &nbsp; padding. Left alone it prints literally
-- on the housekeeping and kitchen reports and shows as tag soup in the notes
-- boxes.
--
-- The notes themselves are line-based — a dated history staff append to — so
-- the faithful representation is plain text with newlines. This migration
-- converts what is stored, and keeps anything written later clean regardless
-- of how it is written.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- HTML → plain text
-- -----------------------------------------------------------------------------

create or replace function ypl.plain_text(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      -- 4. collapse runs of blank lines and strip padding around line breaks
      regexp_replace(
        regexp_replace(
          -- 3. decode the entities Access emits (after tags are gone, so text
          --    that legitimately contains &lt; is not re-read as markup)
          replace(replace(replace(replace(replace(replace(replace(
            -- 2. drop the remaining formatting tags, keeping their text. Only
            --    real HTML tag names are stripped, so a note that says
            --    "<see file>" survives intact.
            regexp_replace(
              -- 1. line-ending tags become newlines
              regexp_replace(
                coalesce(p_value, ''),
                '<\s*(/\s*(div|p|li|tr|h[1-6])|br\s*/?)\s*>', E'\n', 'gi'),
              '</?\s*(div|p|br|ol|ul|li|table|tbody|thead|tr|td|th|span|font|strong|em|u|b|i|small|sub|sup|a|blockquote|pre|h[1-6])(\s[^>]*)?\s*/?\s*>',
              '', 'gi'),
            '&nbsp;', ' '), '&amp;', '&'), '&quot;', '"'), '&lt;', '<'), '&gt;', '>'),
            '&#39;', ''''), '&apos;', ''''),
          '[ \t]*\n[ \t]*', E'\n', 'g'),
        E'\n{3,}', E'\n\n', 'g'),
      E' \t\n\r'),
    '');
$$;

comment on function ypl.plain_text is
  'Converts Access rich-text memo markup to plain text: line-ending tags become newlines, other tags are dropped, HTML entities are decoded, and blank-line runs collapse. Returns null for an empty result.';

-- -----------------------------------------------------------------------------
-- Keep notes plain on write
-- -----------------------------------------------------------------------------
-- Named note columns are passed as trigger arguments. The record is only
-- rebuilt when a value actually carries markup and the conversion changes it,
-- so ordinary plain-text writes do no extra work.

create or replace function ypl.normalize_notes()
returns trigger
language plpgsql
as $$
declare
  v_col text;
  v_before text;
  v_after text;
  v_record jsonb;
  v_changed boolean := false;
begin
  v_record := to_jsonb(new);
  foreach v_col in array tg_argv loop
    v_before := v_record ->> v_col;
    if v_before is not null and v_before ~ '[<&]' then
      v_after := ypl.plain_text(v_before);
      if v_after is distinct from v_before then
        v_record := jsonb_set(v_record, array[v_col], coalesce(to_jsonb(v_after), 'null'::jsonb));
        v_changed := true;
      end if;
    end if;
  end loop;
  if v_changed then
    new := jsonb_populate_record(new, v_record);
  end if;
  return new;
end;
$$;

comment on function ypl.normalize_notes is
  'BEFORE trigger: converts the note columns named in the trigger arguments to plain text. No-op unless a value contains markup.';

drop trigger if exists guests_normalize_notes on ypl.guests;
create trigger guests_normalize_notes
  before insert or update on ypl.guests
  for each row execute function ypl.normalize_notes('guestnotes');

drop trigger if exists reservations_normalize_notes on ypl.reservations;
create trigger reservations_normalize_notes
  before insert or update on ypl.reservations
  for each row execute function ypl.normalize_notes('resnotes');

drop trigger if exists reservation_guests_normalize_notes on ypl.reservation_guests;
create trigger reservation_guests_normalize_notes
  before insert or update on ypl.reservation_guests
  for each row execute function ypl.normalize_notes('rgnotes');

drop trigger if exists room_assignments_normalize_notes on ypl.room_assignments;
create trigger room_assignments_normalize_notes
  before insert or update on ypl.room_assignments
  for each row execute function ypl.normalize_notes('occupancynotes');

drop trigger if exists housekeeping_notes_normalize_notes on ypl.housekeeping_notes;
create trigger housekeeping_notes_normalize_notes
  before insert or update on ypl.housekeeping_notes
  for each row execute function ypl.normalize_notes('housekeepingnotes');

drop trigger if exists kitchen_meals_normalize_notes on ypl.kitchen_meals;
create trigger kitchen_meals_normalize_notes
  before insert or update on ypl.kitchen_meals
  for each row execute function ypl.normalize_notes('guestdiet', 'kitchenmealnotes');

drop trigger if exists transactions_normalize_notes on ypl.transactions;
create trigger transactions_normalize_notes
  before insert or update on ypl.transactions
  for each row execute function ypl.normalize_notes('transnotes');

drop trigger if exists payments_normalize_notes on ypl.payments;
create trigger payments_normalize_notes
  before insert or update on ypl.payments
  for each row execute function ypl.normalize_notes('paymentnotes', 'ccnotes');

-- -----------------------------------------------------------------------------
-- Correction: only validate/stamp reservation dates when they actually change
-- -----------------------------------------------------------------------------
-- Saving a note on an existing reservation re-ran every date rule, which the
-- lodge's own history trips over: 477 reservations are confirmed with no
-- confirmation date on file (they would silently acquire today's), and 9 have
-- a departure on or before their arrival (they could not be saved at all).
-- Stay policy belongs on the dates being set, not on unrelated edits.

create or replace function ypl.reservations_autofill()
returns trigger
language plpgsql
as $$
declare
  v_dates_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.resbookingdate is null then
      new.resbookingdate := current_date;
    end if;
    if new.resnumber is null or new.resnumber = 0 then
      new.resnumber := ypl.next_resnumber();
    end if;
  end if;

  v_dates_changed := tg_op = 'INSERT'
    or new.resarrivaldate is distinct from old.resarrivaldate
    or new.resdeparturedate is distinct from old.resdeparturedate;

  if v_dates_changed then
    if new.resdeparturedate::date <= new.resarrivaldate::date then
      raise exception 'Departure date must be after arrival date';
    end if;
    -- Reservation policy: stays are stored only one year in advance.
    if new.resarrivaldate::date >
       (greatest(coalesce(new.resbookingdate::date, current_date), current_date) + interval '1 year')::date then
      raise exception 'Reservations are stored only one year in advance (arrival % is past the policy horizon)',
        new.resarrivaldate::date;
    end if;
  end if;

  -- Access: "Automatic entry. Number of nights party is staying."
  new.numnights := new.resdeparturedate::date - new.resarrivaldate::date;

  -- Date-stamp only as the flag is switched on, never on an unrelated edit.
  if new.resconfirmed and new.resdateconfirmed is null
     and (tg_op = 'INSERT' or not old.resconfirmed) then
    new.resdateconfirmed := current_date;
  end if;

  if new.rescancelled then
    if new.resdatecancelled is null and (tg_op = 'INSERT' or not old.rescancelled) then
      new.resdatecancelled := current_date;
    end if;
  else
    new.resdatecancelled := null;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Convert what is already stored
-- -----------------------------------------------------------------------------
-- Idempotent: only rows still carrying markup are touched, so this is safe to
-- re-run after a legacy import (which loads with triggers disabled).

create or replace function ypl.normalize_stored_notes()
returns integer
language plpgsql
volatile
as $$
declare
  v_target record;
  v_set text;
  v_where text;
  v_rows integer;
  v_pass integer := 0;
  v_pass_rows integer;
  v_total integer := 0;
begin
  -- A handful of legacy notes are double-encoded (&amp;nbsp;), so one decode
  -- leaves markup behind. Repeat until nothing changes; bounded so a pathological
  -- value can never spin.
  loop
  v_pass := v_pass + 1;
  v_pass_rows := 0;
  for v_target in
    select *
      from (values
        ('guests',             array['guestnotes']),
        ('reservations',       array['resnotes']),
        ('reservation_guests', array['rgnotes']),
        ('room_assignments',   array['occupancynotes']),
        ('housekeeping_notes', array['housekeepingnotes']),
        ('kitchen_meals',      array['guestdiet', 'kitchenmealnotes']),
        ('transactions',       array['transnotes']),
        ('payments',           array['paymentnotes', 'ccnotes']),
        ('rooms',              array['roomnotes']),
        ('inventory_items',    array['invnotes']),
        ('tax_rates',          array['taxratenotes'])
      ) as t(tbl, cols)
  loop
    -- Only rows the conversion actually changes: a note that merely contains
    -- an ampersand ("rebooked & confirmed") is left untouched.
    select string_agg(format('%I = ypl.plain_text(%I)', c, c), ', '),
           string_agg(format('ypl.plain_text(%I) is distinct from %I', c, c), ' or ')
      into v_set, v_where
      from unnest(v_target.cols) c;

    -- Notes carry no meaning for the autofill triggers, and re-running those
    -- rules across decades of history would rewrite unrelated fields. Trigger
    -- state is transactional, so a failed migration restores it.
    execute format('alter table ypl.%I disable trigger user', v_target.tbl);
    execute format('update ypl.%I set %s where %s', v_target.tbl, v_set, v_where);
    get diagnostics v_rows = row_count;
    execute format('alter table ypl.%I enable trigger user', v_target.tbl);

    v_pass_rows := v_pass_rows + v_rows;
  end loop;
  v_total := v_total + v_pass_rows;
  exit when v_pass_rows = 0 or v_pass >= 5;
  end loop;
  return v_total;
end;
$$;

comment on function ypl.normalize_stored_notes is
  'Converts every stored note still carrying Access rich-text markup to plain text and returns the row count. Idempotent — run again after any legacy import.';

select ypl.normalize_stored_notes();

grant execute on all functions in schema ypl to authenticated, service_role;
