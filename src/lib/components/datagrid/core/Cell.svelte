<script lang="ts">
	import type { ColumnDef } from '../../../types/index.js';

	interface Props {
		row: unknown;
		column: ColumnDef<unknown>;
		width: number;
		rowIndex: number;
		onCellClick: (value: unknown, event: MouseEvent) => void;
	}

	let { row, column, width, rowIndex, onCellClick }: Props = $props();

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

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onCellClick(value, event as unknown as MouseEvent);
		}
	}
</script>

<div
	class="datagrid-cell {alignClass} {cellClass}"
	style="width: {width}px; min-width: {width}px;"
	role="gridcell"
	tabindex={-1}
	onclick={handleClick}
	onkeydown={handleKeyDown}
	data-testid="datagrid-cell"
	data-column-key={column.key}
>
	{#if column.cellRenderer}
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
