<script lang="ts">
	// A page's instructions, behind an info button: a drawer from the right
	// listing its tasks, each step by step. **Name** in a line is the name of a
	// control on the screen, shown in bold.
	import InfoIcon from '@lucide/svelte/icons/info';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { cn } from '$lib/utils.js';
	import type { HelpPage } from '$lib/admin-help.js';

	let { help, class: className }: { help: HelpPage; class?: string } = $props();

	let open = $state(false);
	let body: HTMLElement | undefined = $state();

	function parts(line: string): { text: string; strong: boolean }[] {
		return line
			.split(/(\*\*[^*]+\*\*)/)
			.filter(Boolean)
			.map((p) =>
				p.startsWith('**') ? { text: p.slice(2, -2), strong: true } : { text: p, strong: false }
			);
	}

	function jump(i: number) {
		body?.querySelector(`[data-help-section="${i}"]`)?.scrollIntoView({ block: 'start' });
	}
</script>

{#snippet line(text: string)}
	{#each parts(text) as part, i (i)}{#if part.strong}<strong class="font-semibold">{part.text}</strong
			>{:else}{part.text}{/if}{/each}
{/snippet}

<Button
	variant="outline"
	size="icon"
	class={cn(className)}
	title="Help"
	aria-label="Help"
	onclick={() => (open = true)}
>
	<InfoIcon />
</Button>

<Sheet.Root bind:open>
	<Sheet.Content class="sm:max-w-lg">
		<Sheet.Header class="pr-8">
			<Sheet.Title>{help.title}</Sheet.Title>
		</Sheet.Header>
		<div bind:this={body} class="-mx-6 flex-1 space-y-6 overflow-y-auto px-6 pb-6" data-testid="help">
			{#if help.sections.length > 3}
				<nav aria-label="Topics" class="border-b pb-4">
					<ul class="space-y-1 text-sm">
						{#each help.sections as section, i (section.title)}
							<li>
								<button
									type="button"
									class="text-primary text-left hover:underline"
									onclick={() => jump(i)}>{section.title}</button
								>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}
			{#each help.sections as section, i (section.title)}
				<section data-help-section={i} class="scroll-mt-2 space-y-2">
					<h3 class="text-sm font-semibold">{section.title}</h3>
					{#each section.text ?? [] as text, j (j)}
						<p class="text-sm leading-relaxed">{@render line(text)}</p>
					{/each}
					{#if section.steps?.length}
						<ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
							{#each section.steps as step, j (j)}
								<li>{@render line(step)}</li>
							{/each}
						</ol>
					{/if}
					{#each section.after ?? [] as text, j (j)}
						<p class="text-muted-foreground text-sm leading-relaxed">{@render line(text)}</p>
					{/each}
				</section>
			{/each}
		</div>
	</Sheet.Content>
</Sheet.Root>
