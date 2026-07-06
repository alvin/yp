// Client-rendered app backed by the `ypl` schema in Supabase. Staff sign in
// once; reference data (rooms, inventory, lookups, rates) loads with the shell.
export const ssr = false;
export const prerender = false;

import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/data/client';
import { loadReference } from '$lib/data/reference';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session && url.pathname !== '/login') {
		throw redirect(307, '/login');
	}
	if (session && url.pathname === '/login') {
		throw redirect(307, '/');
	}
	if (session) {
		await loadReference();
	}
	return { session };
};
