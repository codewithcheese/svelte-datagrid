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
	<!-- Pinned left filter cells (no scroll) -->
	{#if gridState.pinnedLeftColumns.length > 0}
		<div
			class="datagrid-filter-pinned-left"
			style="width: {gridState.pinnedLeftWidth}px;"
		>
			{#each gridState.pinnedLeftColumns as column (column.key)}
				{@const width = gridState.columnWidths.get(column.key) ?? column.width ?? 150}
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
	{/if}

	<!-- Scrollable filter cells -->
	<div
		class="datagrid-filter-scrollable"
		style="transform: translateX({-gridState.scrollLeft}px);"
	>
		{#each gridState.scrollableColumns as column (column.key)}
			{@const width = gridState.columnWidths.get(column.key) ?? column.width ?? 150}
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
		display: flex;
		flex-shrink: 0;
		overflow: hidden;
		background: var(--datagrid-filter-bg, #fafafa);
		border-bottom: 1px solid var(--datagrid-border-color, #e0e0e0);
	}

	.datagrid-filter-pinned-left {
		display: flex;
		flex-shrink: 0;
		position: sticky;
		left: 0;
		z-index: 2;
		background: var(--datagrid-filter-bg, #fafafa);
		box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.1);
	}

	.datagrid-filter-scrollable {
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
