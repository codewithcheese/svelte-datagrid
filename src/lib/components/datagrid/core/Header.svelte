<script lang="ts">
	import { getContext } from 'svelte';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import HeaderCell from './HeaderCell.svelte';
	import FilterRow from './FilterRow.svelte';

	interface Props {
		headerHeight: number;
	}

	let { headerHeight }: Props = $props();

	const gridState = getContext<GridStateInstance<Record<string, unknown>>>('datagrid');
	const options = getContext<{ sortable: boolean; resizable: boolean; filterable: boolean }>('datagrid-options');

	// Calculate total header height including filter row
	const totalHeight = $derived(options.filterable ? headerHeight * 1.8 : headerHeight);
</script>

<div
	class="datagrid-header"
	style="height: {totalHeight}px; min-height: {totalHeight}px;"
	role="rowgroup"
	data-testid="datagrid-header"
>
	<div class="datagrid-header-row" role="row" style="height: {headerHeight}px;">
		<!-- Pinned left columns (no scroll) -->
		{#if gridState.pinnedLeftColumns.length > 0}
			<div
				class="datagrid-header-pinned-left"
				style="width: {gridState.pinnedLeftWidth}px;"
			>
				{#each gridState.pinnedLeftColumns as column (column.key)}
					<HeaderCell
						{column}
						width={gridState.columnWidths.get(column.key) ?? column.width ?? 150}
						sortable={options.sortable && column.sortable !== false}
						resizable={options.resizable}
						sortDirection={gridState.sortState.find((s) => s.columnKey === column.key)?.direction ?? null}
					/>
				{/each}
			</div>
		{/if}

		<!-- Scrollable columns -->
		<div
			class="datagrid-header-scrollable"
			style="transform: translateX({-gridState.scrollLeft}px);"
		>
			{#each gridState.scrollableColumns as column (column.key)}
				<HeaderCell
					{column}
					width={gridState.columnWidths.get(column.key) ?? column.width ?? 150}
					sortable={options.sortable && column.sortable !== false}
					resizable={options.resizable}
					sortDirection={gridState.sortState.find((s) => s.columnKey === column.key)?.direction ?? null}
				/>
			{/each}
		</div>
	</div>

	{#if options.filterable}
		<FilterRow {headerHeight} />
	{/if}
</div>

<style>
	.datagrid-header {
		flex-shrink: 0;
		overflow: hidden;
		background: var(--datagrid-header-bg, #f5f5f5);
		border-bottom: 1px solid var(--datagrid-border-color, #e0e0e0);
	}

	.datagrid-header-row {
		display: flex;
		height: 100%;
	}

	.datagrid-header-pinned-left {
		display: flex;
		flex-shrink: 0;
		position: sticky;
		left: 0;
		z-index: 2;
		background: var(--datagrid-header-bg, #f5f5f5);
		box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.1);
	}

	.datagrid-header-scrollable {
		display: flex;
		will-change: transform;
	}
</style>
