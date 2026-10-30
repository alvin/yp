import { TAXES } from '$lib/admin.js';
import { taxRates } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async () => ({ rates: await taxRates(TAXES.map((t) => t.type)) });
