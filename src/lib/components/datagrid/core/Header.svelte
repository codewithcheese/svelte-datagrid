<script lang="ts">
	import { getContext } from 'svelte';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import HeaderCell from './HeaderCell.svelte';

	interface Props {
		headerHeight: number;
	}

	let { headerHeight }: Props = $props();

	const gridState = getContext<GridStateInstance<unknown>>('datagrid');
	const options = getContext<{ sortable: boolean; resizable: boolean }>('datagrid-options');
</script>

<div
	class="datagrid-header"
	style="height: {headerHeight}px; min-height: {headerHeight}px;"
	role="rowgroup"
	data-testid="datagrid-header"
>
	<div
		class="datagrid-header-row"
		role="row"
		style="transform: translateX({-gridState.scrollLeft}px);"
	>
		{#each gridState.visibleColumns as column (column.key)}
			<HeaderCell
				{column}
				width={gridState.columnWidths.get(column.key) ?? 150}
				sortable={options.sortable && column.sortable !== false}
				resizable={options.resizable}
				sortDirection={gridState.sortState.find((s) => s.columnKey === column.key)?.direction ?? null}
			/>
		{/each}
	</div>
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
		will-change: transform;
	}
</style>
