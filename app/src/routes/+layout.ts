// Client-rendered app backed by the `ypl` schema in Supabase. Staff sign in
// once; reference data (rooms, inventory, lookups) loads with the shell.
export const ssr = false;
export const prerender = false;

import { redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/admin.js';
import { supabase } from '$lib/data/client.js';
import { loadReference } from '$lib/data/reference.js';
import type { LayoutLoad } from './$types.js';

export const load: LayoutLoad = async ({ url }) => {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	const admin = isAdmin(session?.user.email);

	if (!session && url.pathname !== '/login') {
		throw redirect(307, '/login');
	}
	if (session && url.pathname === '/login') {
		throw redirect(307, admin ? '/admin' : '/');
	}
	if (session) {
		await loadReference();
	}
	return { admin };
};
