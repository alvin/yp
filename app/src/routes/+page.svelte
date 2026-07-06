<script lang="ts">
	import { goto } from '$app/navigation';
	import SearchIcon from '@lucide/svelte/icons/search';
	import UserIcon from '@lucide/svelte/icons/user';
	import HashIcon from '@lucide/svelte/icons/hash';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import FilterIcon from '@lucide/svelte/icons/sliders-horizontal';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import CalculatorIcon from '@lucide/svelte/icons/calculator';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import BedIcon from '@lucide/svelte/icons/bed-double';

	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { toast } from 'svelte-sonner';

	import { onMount } from 'svelte';
	import { findReservation, searchByDate, searchGuestsByName, TODAY } from '$lib/data/queries.js';
	import type { DateMode, GuestSearchRow } from '$lib/data/types.js';
	import { dateMed } from '$lib/format.js';

	// --- Name search (live narrowing) ---
	let nameQuery = $state('');
	let nameMatches = $state<GuestSearchRow[]>([]);
	$effect(() => {
		const q = nameQuery.trim();
		if (!q) {
			nameMatches = [];
			return;
		}
		let alive = true;
		const timer = setTimeout(async () => {
			const rows = await searchGuestsByName(q);
			if (alive) nameMatches = rows.slice(0, 8);
		}, 150);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	});
	function openGuest(guestid: number) {
		goto(`/guests/${guestid}`);
	}
	function onNameEnter() {
		if (nameMatches.length) openGuest(nameMatches[0].guestid);
	}

	// --- Reservation number ---
	let resNumber = $state('');
	async function openReservation() {
		const n = Number(resNumber);
		if (!n) return;
		if (await findReservation(n)) goto(`/reservations/${n}`);
		else toast.error(`No reservation found for #${resNumber}`);
	}

	// --- Date search ---
	let searchDate = $state(TODAY);
	let endDate = $state('');
	let useRange = $state(false);
	const MODES: { value: DateMode; label: string }[] = [
		{ value: 'arrivals', label: 'Arrivals' },
		{ value: 'departures', label: 'Departures' },
		{ value: 'both', label: 'Arrivals & departures' },
		{ value: 'in_house', label: 'In house' }
	];
	let dateMode = $state<DateMode>('arrivals');
	const dateModeLabel = $derived(MODES.find((m) => m.value === dateMode)?.label ?? 'Arrivals');
	function runDateSearch() {
		if (!searchDate) return;
		const params = new URLSearchParams({ mode: dateMode });
		if (useRange && endDate) {
			params.set('from', searchDate);
			params.set('to', endDate);
		} else {
			params.set('date', searchDate);
		}
		goto(`/date?${params.toString()}`);
	}

	// --- All fields ---
	let allQuery = $state('');
	function runAllSearch() {
		if (allQuery.trim()) goto(`/query?q=${encodeURIComponent(allQuery.trim())}`);
	}

	// --- Today at a glance ---
	let arrivals = $state(0);
	let departures = $state(0);
	let inHouse = $state(0);
	onMount(async () => {
		const [a, d, i] = await Promise.all([
			searchByDate(TODAY, 'arrivals'),
			searchByDate(TODAY, 'departures'),
			searchByDate(TODAY, 'in_house')
		]);
		arrivals = a.length;
		departures = d.length;
		inHouse = i.length;
	});
</script>

<svelte:head><title>Front Desk · Yellow Point Lodge</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<div class="mb-6 text-center">
		<h1 class="text-2xl font-semibold tracking-tight">Find a guest or reservation</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Search by name, reservation number, or date — or start a new reservation.
		</p>
	</div>

	<div class="bg-card rounded-xl border p-1.5 shadow-sm">
		<Tabs.Root value="name">
			<Tabs.List class="grid w-full grid-cols-4">
				<Tabs.Trigger value="name"><UserIcon class="mr-1.5" /> Name</Tabs.Trigger>
				<Tabs.Trigger value="res"><HashIcon class="mr-1.5" /> Res #</Tabs.Trigger>
				<Tabs.Trigger value="date"><CalendarIcon class="mr-1.5" /> Date</Tabs.Trigger>
				<Tabs.Trigger value="all"><FilterIcon class="mr-1.5" /> All fields</Tabs.Trigger>
			</Tabs.List>

			<!-- Name -->
			<Tabs.Content value="name" class="p-3">
				<Label for="name-q" class="sr-only">Guest name</Label>
				<div class="relative">
					<SearchIcon
						class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
					/>
					<Input
						id="name-q"
						bind:value={nameQuery}
						onkeydown={(e) => e.key === 'Enter' && onNameEnter()}
						placeholder="Start typing a last name… (e.g. “adam”)"
						class="h-11 pl-9"
						autocomplete="off"
					/>
				</div>
				{#if nameQuery.trim()}
					<div class="mt-2 overflow-hidden rounded-lg border">
						{#if nameMatches.length}
							{#each nameMatches as g (g.guestid)}
								<button
									type="button"
									onclick={() => openGuest(g.guestid)}
									class="hover:bg-accent flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-0"
								>
									<span class="min-w-0">
										<span class="block truncate text-sm font-medium">{g.guest_name}</span>
										<span class="text-muted-foreground block truncate text-xs">
											{[g.guestcity, g.guestregion].filter(Boolean).join(', ')}
											{#if g.guestprimaryphone}· {g.guestprimaryphone}{/if}
										</span>
									</span>
									<ArrowRightIcon class="text-muted-foreground size-4 shrink-0" />
								</button>
							{/each}
						{:else}
							<p class="text-muted-foreground px-3 py-6 text-center text-sm">
								No matching guests. Try fewer letters, or
								<a class="text-primary underline-offset-2 hover:underline" href="/reservations/new"
									>start a new reservation</a
								>.
							</p>
						{/if}
					</div>
				{:else}
					<p class="text-muted-foreground mt-2 px-1 text-xs">
						Matches any part of a name — first, last, or company. The list narrows as you type.
					</p>
				{/if}
			</Tabs.Content>

			<!-- Reservation # -->
			<Tabs.Content value="res" class="p-3">
				<Label for="res-q" class="sr-only">Reservation number</Label>
				<div class="flex gap-2">
					<div class="relative flex-1">
						<HashIcon
							class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
						/>
						<Input
							id="res-q"
							bind:value={resNumber}
							onkeydown={(e) => e.key === 'Enter' && openReservation()}
							inputmode="numeric"
							placeholder="Reservation number (e.g. 108231)"
							class="h-11 pl-9"
						/>
					</div>
					<Button class="h-11" onclick={openReservation}>Open <ArrowRightIcon /></Button>
				</div>
				<p class="text-muted-foreground mt-2 px-1 text-xs">Opens the reservation directly.</p>
			</Tabs.Content>

			<!-- Date -->
			<Tabs.Content value="date" class="space-y-3 p-3">
				<div class="grid gap-3 sm:grid-cols-[1fr_1fr]">
					<div class="space-y-1.5">
						<Label for="date-q">{useRange ? 'From date' : 'Date'}</Label>
						<Input id="date-q" type="date" bind:value={searchDate} class="h-11" />
					</div>
					<div class="space-y-1.5">
						<Label>Show</Label>
						<Select.Root type="single" bind:value={dateMode}>
							<Select.Trigger class="h-11 w-full">{dateModeLabel}</Select.Trigger>
							<Select.Content>
								{#each MODES as m (m.value)}
									<Select.Item value={m.value} label={m.label}>{m.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
				{#if useRange}
					<div class="space-y-1.5">
						<Label for="date-end">To date</Label>
						<Input id="date-end" type="date" bind:value={endDate} min={searchDate} class="h-11" />
					</div>
				{/if}
				<div class="flex items-center justify-between">
					<label class="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
						<input type="checkbox" bind:checked={useRange} class="accent-primary size-3.5" />
						Search a date range
					</label>
					<Button class="h-11" onclick={runDateSearch}>
						<SearchIcon /> Search dates
					</Button>
				</div>
			</Tabs.Content>

			<!-- All fields -->
			<Tabs.Content value="all" class="p-3">
				<Label for="all-q" class="sr-only">Search all fields</Label>
				<div class="flex gap-2">
					<div class="relative flex-1">
						<FilterIcon
							class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
						/>
						<Input
							id="all-q"
							bind:value={allQuery}
							onkeydown={(e) => e.key === 'Enter' && runAllSearch()}
							placeholder="Phone, address, email, or reservation #"
							class="h-11 pl-9"
						/>
					</div>
					<Button class="h-11" onclick={runAllSearch}>Search <ArrowRightIcon /></Button>
				</div>
				<p class="text-muted-foreground mt-2 px-1 text-xs">
					Use when you only have a phone number, an address fragment, or an email.
				</p>
			</Tabs.Content>
		</Tabs.Root>
	</div>

	<!-- Primary actions -->
	<div class="mt-5 grid gap-3 sm:grid-cols-3">
		<a
			href="/reservations/new"
			class="group bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-4 shadow-sm transition-colors"
		>
			<span class="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
				<PlusIcon class="size-5" />
			</span>
			<span>
				<span class="block text-sm font-semibold">New reservation</span>
				<span class="text-muted-foreground block text-xs">Blank transaction screen</span>
			</span>
		</a>
		<a
			href="/print"
			class="group bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-4 shadow-sm transition-colors"
		>
			<span class="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
				<PrinterIcon class="size-5" />
			</span>
			<span>
				<span class="block text-sm font-semibold">Print Center</span>
				<span class="text-muted-foreground block text-xs">Folios & daily reports</span>
			</span>
		</a>
		<a
			href="/reports/dcar"
			class="group bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-4 shadow-sm transition-colors"
		>
			<span class="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
				<CalculatorIcon class="size-5" />
			</span>
			<span>
				<span class="block text-sm font-semibold">Daily Cash Report</span>
				<span class="text-muted-foreground block text-xs">Balance the day</span>
			</span>
		</a>
	</div>

	<!-- Today at a glance -->
	<div class="mt-6">
		<div class="mb-2 flex items-baseline justify-between">
			<h2 class="text-sm font-semibold">Today at a glance</h2>
			<span class="text-muted-foreground text-xs">{dateMed(TODAY)}</span>
		</div>
		<div class="grid grid-cols-3 gap-3">
			<a
				href="/date?date={TODAY}&mode=arrivals"
				class="bg-card hover:border-primary/40 rounded-xl border p-4 text-center shadow-sm transition-colors"
			>
				<LogInIcon class="text-primary mx-auto size-5" />
				<div class="mt-1 text-2xl font-semibold tabular-nums">{arrivals}</div>
				<div class="text-muted-foreground text-xs">Arrivals</div>
			</a>
			<a
				href="/date?date={TODAY}&mode=departures"
				class="bg-card hover:border-primary/40 rounded-xl border p-4 text-center shadow-sm transition-colors"
			>
				<LogOutIcon class="text-primary mx-auto size-5" />
				<div class="mt-1 text-2xl font-semibold tabular-nums">{departures}</div>
				<div class="text-muted-foreground text-xs">Departures</div>
			</a>
			<a
				href="/date?date={TODAY}&mode=in_house"
				class="bg-card hover:border-primary/40 rounded-xl border p-4 text-center shadow-sm transition-colors"
			>
				<BedIcon class="text-primary mx-auto size-5" />
				<div class="mt-1 text-2xl font-semibold tabular-nums">{inHouse}</div>
				<div class="text-muted-foreground text-xs">In house</div>
			</a>
		</div>
	</div>
</div>
