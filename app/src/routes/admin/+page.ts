import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ parent }) => {
	await parent();
	throw redirect(307, '/admin/sales');
};
