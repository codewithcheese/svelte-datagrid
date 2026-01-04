<script lang="ts">
	import { getContext } from 'svelte';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import Row from './Row.svelte';

	const gridState = getContext<GridStateInstance<Record<string, unknown>>>('datagrid');
	const options = getContext<{
		rowClass?: string | ((row: unknown, index: number) => string);
		oncellclick?: (event: unknown) => void;
		onrowclick?: (event: unknown) => void;
		selectable: boolean;
		editable: boolean;
	}>('datagrid-options');

	let viewportEl: HTMLDivElement | undefined = $state();

	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		gridState.setScroll(target.scrollTop, target.scrollLeft);
	}

	// Touch scroll handling for mobile
	let touchStartY = $state(0);
	let touchStartScrollTop = $state(0);

	function handleTouchStart(event: TouchEvent) {
		touchStartY = event.touches[0].clientY;
		touchStartScrollTop = gridState.scrollTop;
	}

	function handleTouchMove(event: TouchEvent) {
		const touchY = event.touches[0].clientY;
		const deltaY = touchStartY - touchY;
		const newScrollTop = touchStartScrollTop + deltaY;
		gridState.setScroll(newScrollTop, gridState.scrollLeft);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!options.selectable) return;

		const extendSelection = event.shiftKey;
		let handled = false;

		switch (event.key) {
			case 'ArrowDown':
				gridState.navigateRow(1, true, extendSelection);
				handled = true;
				break;
			case 'ArrowUp':
				gridState.navigateRow(-1, true, extendSelection);
				handled = true;
				break;
			case 'Home':
				if (event.ctrlKey) {
					gridState.navigateToFirst(true);
					handled = true;
				}
				break;
			case 'End':
				if (event.ctrlKey) {
					gridState.navigateToLast(true);
					handled = true;
				}
				break;
			case 'PageDown':
				gridState.navigateByPage('down', true);
				handled = true;
				break;
			case 'PageUp':
				gridState.navigateByPage('up', true);
				handled = true;
				break;
			case 'a':
				if (event.ctrlKey || event.metaKey) {
					gridState.selectAll();
					handled = true;
				}
				break;
			case 'Escape':
				gridState.clearSelection();
				handled = true;
				break;
		}

		if (handled) {
			event.preventDefault();
			event.stopPropagation();
		}
	}
</script>

<div
	class="datagrid-body"
	bind:this={viewportEl}
	onscroll={handleScroll}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	onkeydown={handleKeyDown}
	role="rowgroup"
	tabindex={options.selectable ? 0 : -1}
	data-testid="datagrid-body"
>
	<div
		class="datagrid-scroll-container"
		style="height: {gridState.totalHeight}px; width: {gridState.totalWidth}px;"
	>
		<div
			class="datagrid-rows"
			style="transform: translateY({gridState.offsetY}px);"
		>
			{#each gridState.visibleRows as row, i (gridState.getRowId(row, gridState.visibleRange.startIndex + i))}
				{@const rowIndex = gridState.visibleRange.startIndex + i}
				{@const rowId = gridState.getRowId(row, rowIndex)}
				<Row
					{row}
					{rowIndex}
					{rowId}
					columns={gridState.visibleColumns}
					columnWidths={gridState.columnWidths}
					rowHeight={gridState.rowHeight}
					isSelected={gridState.isRowSelected(rowId)}
					rowClass={typeof options.rowClass === 'function'
						? options.rowClass(row, rowIndex)
						: options.rowClass}
					selectable={options.selectable}
					editable={options.editable}
					scrollLeft={gridState.scrollLeft}
				/>
			{/each}
		</div>
	</div>
</div>

<style>
	.datagrid-body {
		flex: 1;
		overflow: auto;
		position: relative;
	}

	.datagrid-scroll-container {
		position: relative;
	}

	.datagrid-rows {
		position: absolute;
		left: 0;
		right: 0;
		will-change: transform;
	}
</style>
