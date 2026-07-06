import { TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	return { date };
};
