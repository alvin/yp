// Test environment. Defaults target the local Supabase stack (`supabase start`
// from the repo root) and the dev server; override via environment variables
// for other environments.

export const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? 'http://127.0.0.1:54321';

// Standard local-development keys issued by the Supabase CLI (demo JWT secret).
export const ANON_KEY =
	process.env.TEST_SUPABASE_ANON_KEY ??
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
export const SERVICE_ROLE_KEY =
	process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ??
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const APP_URL = process.env.TEST_APP_URL ?? 'http://localhost:5199';

export const STAFF_EMAIL = process.env.TEST_STAFF_EMAIL ?? 'frontdesk@yellowpointlodge.com';
export const STAFF_PASSWORD = process.env.TEST_STAFF_PASSWORD ?? 'lodge-front-desk';
