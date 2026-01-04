<script lang="ts">
	import { getContext } from 'svelte';
	import type { ColumnDef, GridCellClickEvent, GridRowClickEvent } from '../../../types/index.js';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import Cell from './Cell.svelte';

	interface Props {
		row: Record<string, unknown>;
		rowIndex: number;
		rowId: string | number;
		columns: ColumnDef<Record<string, unknown>>[];
		columnWidths: Map<string, number>;
		rowHeight: number;
		isSelected: boolean;
		rowClass?: string;
		selectable: boolean;
		editable: boolean;
		scrollLeft: number;
	}

	let {
		row,
		rowIndex,
		rowId,
		columns,
		columnWidths,
		rowHeight,
		isSelected,
		rowClass = '',
		selectable,
		editable,
		scrollLeft
	}: Props = $props();

	const gridState = getContext<GridStateInstance<Record<string, unknown>>>('datagrid');
	const options = getContext<{
		oncellclick?: (event: GridCellClickEvent<Record<string, unknown>>) => void;
		onrowclick?: (event: GridRowClickEvent<Record<string, unknown>>) => void;
	}>('datagrid-options');

	function handleRowClick(event: MouseEvent) {
		// Handle selection
		if (selectable) {
			if (event.ctrlKey || event.metaKey) {
				gridState.selectRow(rowId, 'toggle');
			} else if (event.shiftKey) {
				// Range selection from anchor row to this row
				gridState.selectRange(rowId);
			} else {
				gridState.selectRow(rowId, 'set');
			}
		}

		options.onrowclick?.({
			row,
			rowIndex,
			originalEvent: event
		});
	}

	function handleCellClick(column: ColumnDef<Record<string, unknown>>, value: unknown, event: MouseEvent) {
		options.oncellclick?.({
			row,
			rowIndex,
			column,
			columnKey: column.key,
			value,
			originalEvent: event
		});
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			if (selectable) {
				event.preventDefault();
				gridState.selectRow(rowId, 'toggle');
			}
		}
	}

	const isEven = $derived(rowIndex % 2 === 0);

	// Split columns into pinned and scrollable
	const pinnedLeftColumns = $derived(columns.filter((col) => col.pinned === 'left'));
	const scrollableColumns = $derived(columns.filter((col) => col.pinned !== 'left' && col.pinned !== 'right'));
	const pinnedLeftWidth = $derived(
		pinnedLeftColumns.reduce((sum, col) => sum + (columnWidths.get(col.key) ?? col.width ?? 150), 0)
	);
	const hasScroll = $derived(scrollLeft > 0);
</script>

<div
	class="datagrid-row {rowClass}"
	class:even={isEven}
	class:odd={!isEven}
	class:selected={isSelected}
	class:selectable
	class:has-scroll={hasScroll}
	style="height: {rowHeight}px;"
	role="row"
	aria-rowindex={rowIndex + 1}
	aria-selected={isSelected}
	tabindex={selectable ? 0 : -1}
	onclick={handleRowClick}
	onkeydown={handleKeyDown}
	data-testid="datagrid-row"
	data-row-index={rowIndex}
>
	<!-- Pinned left cells (no scroll) -->
	{#if pinnedLeftColumns.length > 0}
		<div class="datagrid-row-pinned-left" style="width: {pinnedLeftWidth}px;">
			{#each pinnedLeftColumns as column (column.key)}
				<Cell
					{row}
					{column}
					width={columnWidths.get(column.key) ?? column.width ?? 150}
					{rowIndex}
					{rowId}
					{editable}
					onCellClick={(value, event) => handleCellClick(column, value, event)}
				/>
			{/each}
		</div>
	{/if}

	<!-- Scrollable cells -->
	<div class="datagrid-row-scrollable" style="transform: translateX({-scrollLeft}px);">
		{#each scrollableColumns as column (column.key)}
			<Cell
				{row}
				{column}
				width={columnWidths.get(column.key) ?? column.width ?? 150}
				{rowIndex}
				{rowId}
				{editable}
				onCellClick={(value, event) => handleCellClick(column, value, event)}
			/>
		{/each}
	</div>
</div>

<style>
	.datagrid-row {
		display: flex;
		border-bottom: 1px solid var(--datagrid-row-border-color, #f0f0f0);
		background: var(--datagrid-row-bg, #fff);
		transition: background-color 0.1s;
	}

	.datagrid-row.odd {
		background: var(--datagrid-row-alt-bg, #fafafa);
	}

	.datagrid-row:hover {
		background: var(--datagrid-row-hover-bg, #f5f5f5);
	}

	.datagrid-row.selected {
		background: var(--datagrid-row-selected-bg, #e3f2fd);
	}

	.datagrid-row.selected:hover {
		background: var(--datagrid-row-selected-hover-bg, #bbdefb);
	}

	.datagrid-row.selectable {
		cursor: pointer;
	}

	.datagrid-row.selectable:focus {
		outline: 2px solid var(--datagrid-focus-color, #1976d2);
		outline-offset: -2px;
	}

	.datagrid-row-pinned-left {
		display: flex;
		flex-shrink: 0;
		position: sticky;
		left: 0;
		z-index: 1;
		background: inherit;
	}

	/* Shadow to indicate more content when scrolled */
	.datagrid-row.has-scroll .datagrid-row-pinned-left::after {
		content: '';
		position: absolute;
		right: -6px;
		top: 0;
		bottom: 0;
		width: 6px;
		background: linear-gradient(to right, rgba(0, 0, 0, 0.08), transparent);
		pointer-events: none;
	}

	.datagrid-row-scrollable {
		display: flex;
		will-change: transform;
	}
</style>
