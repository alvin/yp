-- =============================================================================
-- 0028_cancellation_notes_and_list.sql
-- The note typed when cancelling joins the reservation's notes; the
-- Cancellation List covers a range of days and prints those notes.
--
-- Since 0026 that note joined the first room's occupancy notes, so the notice
-- could print it once reservation notes went office-only. But occupancy notes
-- are the lodge's messages to the guest: they print on the confirmation and the
-- In House report, so a reason for cancelling ("Mom crashed her plane, has sore
-- foot.") printed on both once the stay was un-cancelled. The office keeps the
-- reason where Access did, in the reservation's notes (ResNotes), which print
-- only on the Cancellation List. Un-cancelling leaves the note there for the
-- desk to edit.
-- =============================================================================

set search_path = ypl, public;

-- -----------------------------------------------------------------------------
-- Cancelling
-- -----------------------------------------------------------------------------

-- As 0027, with the note added to the reservation's notes instead of the first
-- room's occupancy notes.
create or replace function ypl.cancel_reservation(
  p_reservationid integer,
  p_date date default current_date,
  p_deposit_handling text default 'none',
  p_notes text default null,
  p_paymenttype text default null
) returns void
language plpgsql
volatile
as $$
begin
  if p_deposit_handling not in ('none', 'refund', 'keep') then
    raise exception 'Deposit handling must be none, refund, or keep (got "%")', p_deposit_handling;
  end if;

  update ypl.reservations r
     set rescancelled = true,
         resdatecancelled = coalesce(p_date, current_date),
         resnotes = concat_ws(E'\n',
           nullif(trim(coalesce(r.resnotes, '')), ''),
           nullif(trim(coalesce(p_notes, '')), ''))
   where r.reservationid = p_reservationid;
  if not found then
    raise exception 'Reservation % not found', p_reservationid;
  end if;

  if p_deposit_handling <> 'none' and ypl.reservation_deposit_held(p_reservationid) > 0 then
    perform ypl.settle_deposit(p_reservationid, p_date, p_deposit_handling, p_paymenttype);
  end if;
end;
$$;

comment on function ypl.cancel_reservation is
  'Cancels a reservation, adds the note typed to the reservation''s notes (office-only; they print on the Cancellation List), and refunds (on p_paymenttype, or the deposit''s own tender) or keeps any deposit still held (settle_deposit). With none, the deposit stays held until it is settled.';

-- -----------------------------------------------------------------------------
-- The Cancellation List, for a range of days
-- -----------------------------------------------------------------------------

-- The lodge reads it over a stretch of days, not one: every stay cancelled
-- from p_from to p_to, by the day cancelled, with the reservation's notes.
drop function if exists ypl.report_cancellation_list(date);
create function ypl.report_cancellation_list(p_from date, p_to date)
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
     and s.resdatecancelled::date between p_from and p_to
   order by s.resdatecancelled::date, s.guest_name, s.resnumber;
$$;

comment on function ypl.report_cancellation_list is
  'Cancellation List: stays cancelled from p_from to p_to, by day cancelled then guest, with the reservation''s notes (where the note typed when cancelling goes).';

grant execute on all functions in schema ypl to authenticated, service_role;
