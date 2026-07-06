// Supabase client for the Yellow Point Lodge production schema. All application
// data lives in the `ypl` schema; business rules are enforced by database
// triggers and RPCs, so this client is a thin transport layer.

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	db: { schema: 'ypl' }
});

/** Unwraps a PostgREST response, throwing a readable error on failure. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	return result.data as T;
}
