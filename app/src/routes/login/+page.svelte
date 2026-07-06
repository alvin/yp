<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Brand from '$lib/components/app/brand.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { supabase } from '$lib/data/client';

	let email = $state('');
	let password = $state('');
	let busy = $state(false);

	async function signIn(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const { error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) {
				toast.error(error.message);
				return;
			}
			await invalidateAll();
			await goto('/');
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header class="items-center text-center">
			<Brand />
			<Card.Description>Front desk sign in</Card.Description>
		</Card.Header>
		<Card.Content>
			<form class="grid gap-4" onsubmit={signIn}>
				<div class="grid gap-1.5">
					<Label for="email">Email</Label>
					<Input id="email" type="email" bind:value={email} autocomplete="username" required />
				</div>
				<div class="grid gap-1.5">
					<Label for="password">Password</Label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						autocomplete="current-password"
						required
					/>
				</div>
				<Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
