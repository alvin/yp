import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Client-rendered SPA against Supabase: every route falls back to the
		// app shell, so the build deploys to any static host.
		adapter: adapter({ fallback: 'index.html' })
	}
};

export default config;
