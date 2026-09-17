-- =============================================================================
-- 0009_rebooking.sql
-- Re-booking is next year's stay, not a change to this one.
--
-- The lodge's trade is an annual cadence: a party leaves and books the same
-- week next season before they are out of the driveway. 'Re-book' names that
-- act. It was built as a reservation-level operation that moved the stay --
-- creating the new booking, carrying the deposit across and cancelling the
-- original. Cancelling a stay the guests actually took is wrong, and the
-- deposit belongs to the stay it was taken for. Re-booking now starts an
-- ordinary new reservation and leaves the old one alone, so:
--
--   * ypl.rebook_reservation is dropped -- the new stay is written by
--     ypl.create_reservation like any other, and everything the old function
--     copied (name, contact, diet) already lives on the guest record,
--   * the booking horizon is a single rule on the arrival date, measured from
--     today, with a week of grace -- a party re-booking mid-stay for the same
--     week next season lands a few days past a bare year, and was refused.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Re-booking is no longer a database operation
-- -----------------------------------------------------------------------------

drop function if exists ypl.rebook_reservation(integer, date, date, text, boolean, boolean);

-- -----------------------------------------------------------------------------
-- Booking horizon: arrival date, from today, one year and a week
-- -----------------------------------------------------------------------------
-- Two changes to the horizon check, both narrowing it to one rule:
--
--   * measured from current_date alone. It was measured from the later of the
--     booking date and today, which is the same number for every row the app
--     writes and a second rule to reason about for every row it does not.
--   * seven days of grace. The lodge re-books by weekday, not by calendar
--     date: of 16,313 return visits in the Access data, the commonest gap
--     between one arrival and the next is 364 days -- 52 weeks exactly -- and
--     1,986 stays were booked 366-369 days ahead, which a bare year refuses.
--
-- Departure is unconstrained; a stay that starts inside the window may run
-- past it. Everything else about the trigger is unchanged from 0007.

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
       (current_date + interval '1 year' + interval '7 days')::date then
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
