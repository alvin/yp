import { error } from "@sveltejs/kit";
import {
  depositTender,
  findReservation,
  getGuest,
  occupancySummaries,
  reservationLedger,
  reservationNotes,
  roomMoves,
  sharedRoomOccupancies,
  TODAY,
} from "$lib/data/queries.js";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ params }) => {
  const resnumber = Number(params.resnumber);
  const summary = await findReservation(resnumber);
  if (!summary) error(404, `Reservation #${params.resnumber} not found`);

  const [notes, occupancy, ledger, guest, shared, moves, tender] = await Promise.all([
    reservationNotes(summary.reservationid),
    occupancySummaries(summary.reservationid),
    reservationLedger(summary.reservationid),
    getGuest(summary.primary_guestid),
    sharedRoomOccupancies(summary.reservationid),
    roomMoves(summary.reservationid),
    depositTender(summary.reservationid),
  ]);
  return {
    summary,
    ...notes,
    occupancy,
    shared,
    moves,
    ledger,
    depositTender: tender,
    guestNotes: guest?.guestnotes ?? null,
    today: TODAY,
  };
};
