<script lang="ts">
	import { getContext } from 'svelte';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import FilterInput from './FilterInput.svelte';

	interface Props {
		headerHeight: number;
	}

	let { headerHeight }: Props = $props();

	const gridState = getContext<GridStateInstance<Record<string, unknown>>>('datagrid');
</script>

<div
	class="datagrid-filter-row"
	style="height: {headerHeight * 0.8}px;"
	role="row"
	data-testid="datagrid-filter-row"
>
	<div
		class="datagrid-filter-row-inner"
		style="transform: translateX({-gridState.scrollLeft}px);"
	>
		{#each gridState.visibleColumns as column (column.key)}
			{@const width = gridState.columnWidths.get(column.key) ?? 150}
			{@const currentFilter = gridState.filterState.find(f => f.columnKey === column.key)}
			<div
				class="datagrid-filter-cell"
				style="width: {width}px; min-width: {width}px;"
				data-column-key={column.key}
			>
				{#if column.filterable !== false}
					<FilterInput
						{column}
						value={currentFilter?.value ?? ''}
						operator={currentFilter?.operator ?? 'contains'}
						onchange={(value, operator) => {
							if (value === '' || value === null || value === undefined) {
								gridState.setFilter(column.key, null, operator);
							} else {
								gridState.setFilter(column.key, value, operator);
							}
						}}
					/>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.datagrid-filter-row {
		flex-shrink: 0;
		overflow: hidden;
		background: var(--datagrid-filter-bg, #fafafa);
		border-bottom: 1px solid var(--datagrid-border-color, #e0e0e0);
	}

	.datagrid-filter-row-inner {
		display: flex;
		height: 100%;
		will-change: transform;
	}

	.datagrid-filter-cell {
		display: flex;
		align-items: center;
		padding: 4px 8px;
		box-sizing: border-box;
		flex-shrink: 0;
	}
</style>
