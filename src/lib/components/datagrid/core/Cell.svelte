<script lang="ts">
	import { getContext } from 'svelte';
	import type { ColumnDef } from '../../../types/index.js';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import CellEditor from './CellEditor.svelte';

	interface Props {
		row: unknown;
		column: ColumnDef<unknown>;
		width: number;
		rowIndex: number;
		rowId: string | number;
		editable: boolean;
		onCellClick: (value: unknown, event: MouseEvent) => void;
	}

	let { row, column, width, rowIndex, rowId, editable, onCellClick }: Props = $props();

	const gridState = getContext<GridStateInstance<unknown>>('datagrid');

	// Get cell value using accessor
	const value = $derived.by(() => {
		if (typeof column.accessor === 'function') {
			return column.accessor(row);
		}
		if (column.accessor) {
			return (row as Record<string, unknown>)[column.accessor as string];
		}
		return (row as Record<string, unknown>)[column.key];
	});

	// Check if this cell is being edited
	const isEditingThis = $derived(gridState.isEditing(rowId, column.key));

	// Check if cell is editable
	const isCellEditable = $derived(editable && column.editable !== false);

	// Format value for display
	const displayValue = $derived.by(() => {
		if (column.formatter) {
			return column.formatter(value);
		}

		// Handle null/undefined
		if (value === null || value === undefined) {
			return '';
		}

		// Handle dates
		if (value instanceof Date) {
			return value.toLocaleDateString();
		}

		// Handle booleans
		if (typeof value === 'boolean') {
			return value ? 'Yes' : 'No';
		}

		// Handle numbers
		if (typeof value === 'number') {
			return value.toLocaleString();
		}

		return String(value);
	});

	// Get cell class
	const cellClass = $derived.by(() => {
		if (typeof column.cellClass === 'function') {
			return column.cellClass(row, value);
		}
		return column.cellClass ?? '';
	});

	const alignClass = $derived(column.align ? `align-${column.align}` : '');

	function handleClick(event: MouseEvent) {
		onCellClick(value, event);
	}

	function handleDoubleClick(event: MouseEvent) {
		if (isCellEditable && !isEditingThis) {
			event.preventDefault();
			event.stopPropagation();
			gridState.startEdit(rowId, column.key);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onCellClick(value, event as unknown as MouseEvent);
		} else if (event.key === 'F2' && isCellEditable && !isEditingThis) {
			// F2 to start editing (Excel-like behavior)
			event.preventDefault();
			event.stopPropagation();
			gridState.startEdit(rowId, column.key);
		}
	}
</script>

<div
	class="datagrid-cell {alignClass} {cellClass}"
	class:editable={isCellEditable}
	class:editing={isEditingThis}
	style="width: {width}px; min-width: {width}px;"
	role="gridcell"
	tabindex={-1}
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeyDown}
	data-testid="datagrid-cell"
	data-column-key={column.key}
>
	{#if isEditingThis}
		<CellEditor {column} {value} {rowId} {width} />
	{:else if column.cellRenderer}
		{@const CellRenderer = column.cellRenderer}
		<CellRenderer {value} {row} {column} />
	{:else}
		<span class="datagrid-cell-content" title={displayValue}>
			{displayValue}
		</span>
	{/if}
</div>

<style>
	.datagrid-cell {
		display: flex;
		align-items: center;
		padding: 0 12px;
		overflow: hidden;
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.datagrid-cell.editable {
		cursor: text;
	}

	.datagrid-cell.editing {
		padding: 0;
		overflow: visible;
	}

	.datagrid-cell.align-center {
		justify-content: center;
		text-align: center;
	}

	.datagrid-cell.align-right {
		justify-content: flex-end;
		text-align: right;
	}

	.datagrid-cell-content {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}
</style>
