import { searchAllFields } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	return { q, rows: await searchAllFields(q) };
};
