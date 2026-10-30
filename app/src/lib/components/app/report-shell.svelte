<script lang="ts">
	import type { Snippet } from 'svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import { Button } from '$lib/components/ui/button/index.js';
	import ReportDateInput from '$lib/components/app/report-date-input.svelte';
	import type { ReportTab } from '$lib/report-nav.js';
	import { pageSize, type PaperStock } from '$lib/print-stock.js';
	import '$lib/report.css';

	let {
		title,
		orientation = 'portrait',
		stock = 'letter',
		backHref,
		backLabel,
		tabs,
		date,
		children,
		toolbar,
		bar
	}: {
		title: string;
		orientation?: 'portrait' | 'landscape';
		/** The paper this document prints on. */
		stock?: PaperStock;
		/** Where the back button goes; none under a navigation bar of its own. */
		backHref?: string;
		backLabel?: string;
		/** Sibling reports in the same workflow, shown as tabs. */
		tabs?: ReportTab[];
		/** Working date; shows a date picker that reloads this report. */
		date?: string;
		children: Snippet;
		toolbar?: Snippet;
		/** Controls under the tabs that shape what the report lists; not printed. */
		bar?: Snippet;
	} = $props();
</script>

<svelte:head>
	{@html `<style>@page { size: ${pageSize(stock, orientation)}; margin: 0.5in; }</style>`}
</svelte:head>

<div class="report-root min-h-screen pb-16">
	<div class="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
		<div class="mx-auto flex max-w-[1220px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
			{#if backHref}
				<Button variant="ghost" size="sm" href={backHref}>
					<ArrowLeftIcon /> {backLabel}
				</Button>
			{/if}
			<span class="text-muted-foreground truncate text-sm font-medium">{title}</span>
			<div class="ml-auto flex flex-wrap items-center gap-2">
				{#if date !== undefined}
					<ReportDateInput id="report-date" value={date} />
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
		{#if bar}
			<div class="mx-auto flex max-w-[1220px] flex-wrap items-center gap-x-3 gap-y-2 border-t px-4 py-2">
				{@render bar()}
			</div>
		{/if}
	</div>

	<div
		class="report-page"
		class:landscape={orientation === 'landscape'}
		class:a5={stock === 'a5'}
	>
		{@render children()}
	</div>
</div>
