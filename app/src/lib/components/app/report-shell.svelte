<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { ReportTab } from '$lib/report-nav.js';
	import '$lib/report.css';

	let {
		title,
		orientation = 'portrait',
		backHref,
		backLabel = 'Back',
		tabs,
		date,
		children,
		toolbar
	}: {
		title: string;
		orientation?: 'portrait' | 'landscape';
		backHref?: string;
		backLabel?: string;
		/** Sibling reports in the same workflow, shown as tabs. */
		tabs?: ReportTab[];
		/** Working date; shows a date picker that reloads this report. */
		date?: string;
		children: Snippet;
		toolbar?: Snippet;
	} = $props();

	function back() {
		if (backHref) goto(backHref);
		else history.back();
	}

	function changeDate(d: string) {
		if (!d) return;
		const params = new URLSearchParams(page.url.searchParams);
		params.set('date', d);
		goto(`${page.url.pathname}?${params.toString()}`);
	}
</script>

<svelte:head>
	{@html `<style>@page { size: letter ${orientation}; margin: 0.5in; }</style>`}
</svelte:head>

<div class="report-root min-h-screen pb-16">
	<div class="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
		<div class="mx-auto flex max-w-[1220px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
			<Button variant="ghost" size="sm" onclick={back}>
				<ArrowLeftIcon /> {backLabel}
			</Button>
			<span class="text-muted-foreground truncate text-sm font-medium">{title}</span>
			<div class="ml-auto flex flex-wrap items-center gap-2">
				{#if date !== undefined}
					<label class="text-muted-foreground text-xs" for="report-date">Date</label>
					<input
						id="report-date"
						type="date"
						value={date}
						onchange={(e) => changeDate(e.currentTarget.value)}
						class="h-8 rounded-md border bg-background px-2 text-sm shadow-xs"
					/>
				{/if}
				{#if toolbar}{@render toolbar()}{/if}
				<Button size="sm" onclick={() => window.print()}>
					<PrinterIcon /> Print
				</Button>
			</div>
		</div>
		{#if tabs?.length}
			<nav
				class="mx-auto flex max-w-[1220px] gap-1 overflow-x-auto px-4"
				aria-label="Reports in this workflow"
			>
				{#each tabs as t (t.href)}
					<a
						href={t.href}
						aria-current={t.current ? 'page' : undefined}
						class="whitespace-nowrap border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors {t.current
							? 'border-primary text-foreground'
							: 'border-transparent text-muted-foreground hover:text-foreground'}"
					>
						{t.label}
					</a>
				{/each}
			</nav>
		{/if}
	</div>

	<div class="report-page" class:landscape={orientation === 'landscape'}>
		{@render children()}
	</div>
</div>
