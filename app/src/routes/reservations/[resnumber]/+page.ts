import { error } from "@sveltejs/kit";
import {
  findReservation,
  getGuest,
  occupancySummaries,
  reservationLedger,
  reservationNotes,
  sharedRoomOccupancies,
  TODAY,
} from "$lib/data/queries.js";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ params }) => {
  const resnumber = Number(params.resnumber);
  const summary = await findReservation(resnumber);
  if (!summary) error(404, `Reservation #${params.resnumber} not found`);

  const [notes, occupancy, ledger, guest, shared] = await Promise.all([
    reservationNotes(summary.reservationid),
    occupancySummaries(summary.reservationid),
    reservationLedger(summary.reservationid),
    getGuest(summary.primary_guestid),
    sharedRoomOccupancies(summary.reservationid),
  ]);
  return {
    summary,
    reservationGuests: notes.reservationGuests,
    housekeeping: notes.housekeeping,
    kitchen: notes.kitchen,
    occupancy,
    shared,
    ledger,
    guestNotes: guest?.guestnotes ?? null,
    today: TODAY,
  };
};
