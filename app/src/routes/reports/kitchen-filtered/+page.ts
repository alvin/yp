import { reportKitchenMealFiltered, TODAY } from "$lib/data/queries.js";
import { addDays } from "$lib/format.js";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ url }) => {
  const from = url.searchParams.get("from") ?? TODAY;
  const to = url.searchParams.get("to") ?? addDays(from, 6);
  return { from, to, rows: await reportKitchenMealFiltered(from, to) };
};
