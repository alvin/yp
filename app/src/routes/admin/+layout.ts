import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types.js';

// The admin area is the admin login's alone. Anyone else signed in is taken
// to the lookup screen; the database refuses their changes in any case.
export const load: LayoutLoad = async ({ parent }) => {
	const { admin } = await parent();
	if (!admin) throw redirect(307, '/');
};
