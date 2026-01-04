<script lang="ts">
	import { getContext } from 'svelte';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';

	interface Props {
		placeholder?: string;
	}

	let { placeholder = 'Search...' }: Props = $props();

	const gridState = getContext<GridStateInstance<unknown>>('datagrid');

	let inputValue = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Sync from grid state
	$effect(() => {
		inputValue = gridState.globalSearchTerm;
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;

		// Debounce the search
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			gridState.setGlobalSearch(inputValue);
		}, 300);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			// Immediate search on Enter
			if (debounceTimer) clearTimeout(debounceTimer);
			gridState.setGlobalSearch(inputValue);
		} else if (event.key === 'Escape') {
			// Clear search on Escape
			inputValue = '';
			gridState.clearGlobalSearch();
		}
	}

	function handleClear() {
		inputValue = '';
		gridState.clearGlobalSearch();
	}

	const hasValue = $derived(inputValue.trim() !== '');
	const resultCount = $derived(gridState.processedData.length);
</script>

<div class="datagrid-search" data-testid="datagrid-search">
	<div class="search-input-wrapper">
		<span class="search-icon" aria-hidden="true">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"/>
				<path d="m21 21-4.35-4.35"/>
			</svg>
		</span>
		<input
			type="text"
			class="search-input"
			{placeholder}
			value={inputValue}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			aria-label="Search grid"
		/>
		{#if hasValue}
			<span class="search-result-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
			<button
				class="search-clear"
				onclick={handleClear}
				aria-label="Clear search"
				type="button"
			>
				×
			</button>
		{/if}
	</div>
</div>

<style>
	.datagrid-search {
		padding: 8px 12px;
		background: var(--datagrid-header-bg, #f5f5f5);
		border-bottom: 1px solid var(--datagrid-border-color, #e0e0e0);
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		background: var(--datagrid-input-bg, #fff);
		border: 1px solid var(--datagrid-border-color, #e0e0e0);
		border-radius: 4px;
		padding: 0 8px;
		transition: border-color 0.15s;
	}

	.search-input-wrapper:focus-within {
		border-color: var(--datagrid-primary-color, #1976d2);
	}

	.search-icon {
		color: var(--datagrid-muted-color, #999);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		border: none;
		outline: none;
		padding: 8px;
		font-size: 13px;
		background: transparent;
		color: var(--datagrid-color, #333);
		min-width: 0;
	}

	.search-input::placeholder {
		color: var(--datagrid-muted-color, #999);
	}

	.search-result-count {
		font-size: 12px;
		color: var(--datagrid-muted-color, #666);
		white-space: nowrap;
		padding-right: 8px;
	}

	.search-clear {
		background: none;
		border: none;
		color: var(--datagrid-muted-color, #999);
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		padding: 4px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.search-clear:hover {
		color: var(--datagrid-color, #333);
		background: var(--datagrid-hover-bg, #f0f0f0);
	}
</style>
