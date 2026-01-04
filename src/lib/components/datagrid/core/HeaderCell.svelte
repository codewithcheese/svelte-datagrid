<script lang="ts">
	import { getContext } from 'svelte';
	import type { ColumnDef, SortDirection } from '../../../types/index.js';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';

	interface Props {
		column: ColumnDef<Record<string, unknown>>;
		width: number;
		sortable: boolean;
		resizable: boolean;
		reorderable: boolean;
		sortDirection: SortDirection;
	}

	let { column, width, sortable, resizable, reorderable, sortDirection }: Props = $props();

	const gridState = getContext<GridStateInstance<Record<string, unknown>>>('datagrid');

	// Resize state
	let isResizing = $state(false);
	let startX = $state(0);
	let startWidth = $state(0);

	// Drag state for reordering
	let isDragging = $state(false);
	let isDropTarget = $state(false);
	let dropSide = $state<'left' | 'right' | null>(null);

	function handleSort(event: MouseEvent) {
		if (!sortable || isResizing || isDragging) return;
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

	// Drag handlers for column reordering
	function handleDragStart(event: DragEvent) {
		if (!reorderable || isResizing) {
			event.preventDefault();
			return;
		}

		isDragging = true;
		event.dataTransfer!.effectAllowed = 'move';
		event.dataTransfer!.setData('text/plain', column.key);

		// Create a drag image
		const el = event.target as HTMLElement;
		if (event.dataTransfer?.setDragImage) {
			event.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
		}
	}

	function handleDragEnd() {
		isDragging = false;
		isDropTarget = false;
		dropSide = null;
	}

	function handleDragOver(event: DragEvent) {
		if (!reorderable) return;
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'move';

		// Determine which side of the cell the cursor is on
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const midpoint = rect.left + rect.width / 2;
		dropSide = event.clientX < midpoint ? 'left' : 'right';
	}

	function handleDragEnter(event: DragEvent) {
		if (!reorderable) return;
		const draggedKey = event.dataTransfer?.types.includes('text/plain');
		if (draggedKey) {
			isDropTarget = true;
		}
	}

	function handleDragLeave(event: DragEvent) {
		// Only clear if we're leaving the element entirely
		const relatedTarget = event.relatedTarget as Node;
		if (!relatedTarget || !(event.currentTarget as HTMLElement).contains(relatedTarget)) {
			isDropTarget = false;
			dropSide = null;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDropTarget = false;
		dropSide = null;

		const draggedKey = event.dataTransfer?.getData('text/plain');
		if (!draggedKey || draggedKey === column.key) return;

		// Get the target index based on drop position
		const columnOrder = gridState.columnOrder;
		const targetIndex = columnOrder.indexOf(column.key);
		const draggedIndex = columnOrder.indexOf(draggedKey);

		if (targetIndex < 0 || draggedIndex < 0) return;

		// Adjust target index based on drop side and relative position
		let newIndex = targetIndex;
		if (dropSide === 'right') {
			newIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
		} else {
			newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
		}

		gridState.reorderColumn(draggedKey, Math.max(0, Math.min(newIndex, columnOrder.length - 1)));
	}

	const alignClass = $derived(column.align ? `align-${column.align}` : '');
	const sortableClass = $derived(sortable ? 'sortable' : '');
	const reorderableClass = $derived(reorderable ? 'reorderable' : '');
</script>

<div
	class="datagrid-header-cell {alignClass} {sortableClass} {reorderableClass} {column.headerClass ?? ''}"
	class:dragging={isDragging}
	class:drop-target={isDropTarget}
	class:drop-left={isDropTarget && dropSide === 'left'}
	class:drop-right={isDropTarget && dropSide === 'right'}
	style="width: {width}px; min-width: {width}px;"
	role="columnheader"
	aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'}
	tabindex={sortable ? 0 : -1}
	draggable={reorderable}
	onclick={handleSort}
	onkeydown={handleKeyDown}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	ondragover={handleDragOver}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
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

	/* Reorderable column styles */
	.datagrid-header-cell.reorderable {
		cursor: grab;
	}

	.datagrid-header-cell.reorderable:active {
		cursor: grabbing;
	}

	.datagrid-header-cell.dragging {
		opacity: 0.5;
	}

	.datagrid-header-cell.drop-left::before {
		content: '';
		position: absolute;
		left: 0;
		top: 4px;
		bottom: 4px;
		width: 3px;
		background: var(--datagrid-primary-color, #1976d2);
		border-radius: 2px;
		z-index: 10;
	}

	.datagrid-header-cell.drop-right::after {
		content: '';
		position: absolute;
		right: 0;
		top: 4px;
		bottom: 4px;
		width: 3px;
		background: var(--datagrid-primary-color, #1976d2);
		border-radius: 2px;
		z-index: 10;
	}
</style>
