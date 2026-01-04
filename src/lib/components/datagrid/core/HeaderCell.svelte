<script lang="ts">
	import { getContext } from 'svelte';
	import type { ColumnDef, SortDirection } from '../../../types/index.js';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';

	interface Props {
		column: ColumnDef<Record<string, unknown>>;
		width: number;
		sortable: boolean;
		resizable: boolean;
		sortDirection: SortDirection;
	}

	let { column, width, sortable, resizable, sortDirection }: Props = $props();

	const gridState = getContext<GridStateInstance<Record<string, unknown>>>('datagrid');

	// Resize state
	let isResizing = $state(false);
	let startX = $state(0);
	let startWidth = $state(0);

	function handleSort(event: MouseEvent) {
		if (!sortable || isResizing) return;
		const multiSort = event.shiftKey;
		gridState.toggleSort(column.key, multiSort);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!sortable) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			const multiSort = event.shiftKey;
			gridState.toggleSort(column.key, multiSort);
		}
	}

	function handleResizeStart(event: MouseEvent) {
		if (!resizable) return;
		event.preventDefault();
		event.stopPropagation();

		isResizing = true;
		startX = event.clientX;
		startWidth = width;

		window.addEventListener('mousemove', handleResizeMove);
		window.addEventListener('mouseup', handleResizeEnd);
	}

	function handleResizeMove(event: MouseEvent) {
		if (!isResizing) return;
		const delta = event.clientX - startX;
		const newWidth = Math.max(50, startWidth + delta);
		gridState.setColumnWidth(column.key, newWidth);
	}

	function handleResizeEnd() {
		isResizing = false;
		window.removeEventListener('mousemove', handleResizeMove);
		window.removeEventListener('mouseup', handleResizeEnd);
	}

	function handleResizeDoubleClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		gridState.autoSizeColumn(column.key);
	}

	const alignClass = $derived(column.align ? `align-${column.align}` : '');
	const sortableClass = $derived(sortable ? 'sortable' : '');
</script>

<div
	class="datagrid-header-cell {alignClass} {sortableClass} {column.headerClass ?? ''}"
	style="width: {width}px; min-width: {width}px;"
	role="columnheader"
	aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'}
	tabindex={sortable ? 0 : -1}
	onclick={handleSort}
	onkeydown={handleKeyDown}
	data-testid="datagrid-header-cell"
	data-column-key={column.key}
>
	<span class="datagrid-header-content">
		{column.header}
	</span>

	{#if sortDirection}
		<span class="datagrid-sort-indicator" aria-hidden="true">
			{sortDirection === 'asc' ? '↑' : '↓'}
		</span>
	{/if}

	{#if resizable}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="datagrid-resize-handle"
			class:active={isResizing}
			onmousedown={handleResizeStart}
			ondblclick={handleResizeDoubleClick}
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize column {column.header}. Double-click to auto-size."
			tabindex={-1}
			title="Drag to resize, double-click to auto-size"
		></div>
	{/if}
</div>

<style>
	.datagrid-header-cell {
		display: flex;
		align-items: center;
		padding: 0 12px;
		font-weight: 600;
		color: var(--datagrid-header-color, #333);
		user-select: none;
		position: relative;
		box-sizing: border-box;
		flex-shrink: 0;
		gap: 4px;
	}

	.datagrid-header-cell.sortable {
		cursor: pointer;
	}

	.datagrid-header-cell.sortable:hover {
		background: var(--datagrid-header-hover-bg, #eeeeee);
	}

	.datagrid-header-cell.sortable:focus {
		outline: 2px solid var(--datagrid-focus-color, #1976d2);
		outline-offset: -2px;
	}

	.datagrid-header-cell.align-center {
		justify-content: center;
	}

	.datagrid-header-cell.align-right {
		justify-content: flex-end;
	}

	.datagrid-header-content {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.datagrid-sort-indicator {
		font-size: 12px;
		color: var(--datagrid-primary-color, #1976d2);
		flex-shrink: 0;
	}

	.datagrid-resize-handle {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 6px;
		cursor: col-resize;
		background: transparent;
		transition: background 0.15s;
	}

	.datagrid-resize-handle:hover,
	.datagrid-resize-handle.active {
		background: var(--datagrid-primary-color, #1976d2);
	}
</style>
