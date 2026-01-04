<script lang="ts">
	import { getContext } from 'svelte';
	import type { ColumnDef, GridCellClickEvent, GridRowClickEvent } from '../../../types/index.js';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import Cell from './Cell.svelte';

	interface Props {
		row: unknown;
		rowIndex: number;
		rowId: string | number;
		columns: ColumnDef<unknown>[];
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

	const gridState = getContext<GridStateInstance<unknown>>('datagrid');
	const options = getContext<{
		oncellclick?: (event: GridCellClickEvent<unknown>) => void;
		onrowclick?: (event: GridRowClickEvent<unknown>) => void;
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

	function handleCellClick(column: ColumnDef<unknown>, value: unknown, event: MouseEvent) {
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
</script>

<div
	class="datagrid-row {rowClass}"
	class:even={isEven}
	class:odd={!isEven}
	class:selected={isSelected}
	class:selectable
	style="height: {rowHeight}px; transform: translateX({-scrollLeft}px);"
	role="row"
	aria-rowindex={rowIndex + 1}
	aria-selected={isSelected}
	tabindex={selectable ? 0 : -1}
	onclick={handleRowClick}
	onkeydown={handleKeyDown}
	data-testid="datagrid-row"
	data-row-index={rowIndex}
>
	{#each columns as column (column.key)}
		<Cell
			{row}
			{column}
			width={columnWidths.get(column.key) ?? 150}
			{rowIndex}
			{rowId}
			{editable}
			onCellClick={(value, event) => handleCellClick(column, value, event)}
		/>
	{/each}
</div>

<style>
	.datagrid-row {
		display: flex;
		border-bottom: 1px solid var(--datagrid-row-border-color, #f0f0f0);
		background: var(--datagrid-row-bg, #fff);
		transition: background-color 0.1s;
		will-change: transform;
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
</style>
