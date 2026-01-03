/**
 * Tests for grid state selection and navigation features.
 *
 * Note: Some derived state (sorting, filtering, visibleColumns) requires
 * Svelte's reactive system and is tested in browser tests instead.
 */

import { describe, test, expect } from 'vitest';
import { createGridState, type GridOptions } from '../grid-state.svelte.js';

interface TestRow {
	id: number;
	name: string;
	age: number;
}

const testData: TestRow[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
	{ id: 3, name: 'Charlie', age: 35 },
	{ id: 4, name: 'Diana', age: 28 },
	{ id: 5, name: 'Eve', age: 32 }
];

const testColumns = [
	{ key: 'id', header: 'ID' },
	{ key: 'name', header: 'Name' },
	{ key: 'age', header: 'Age' }
];

function createTestGridState(options?: Partial<GridOptions<TestRow>>) {
	return createGridState({
		data: [...testData],
		columns: testColumns,
		getRowId: (row) => row.id,
		selectionMode: 'multiple',
		rowHeight: 40,
		...options
	});
}

describe('Grid State', () => {
	describe('selection', () => {
		test('selectRow with set mode clears previous selection', () => {
			const state = createTestGridState();

			state.selectRow(1, 'set');
			expect(state.selectedIds.has(1)).toBe(true);
			expect(state.selectedIds.size).toBe(1);

			state.selectRow(2, 'set');
			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.has(1)).toBe(false);
			expect(state.selectedIds.size).toBe(1);
		});

		test('selectRow with toggle mode toggles selection', () => {
			const state = createTestGridState();

			state.selectRow(1, 'toggle');
			expect(state.selectedIds.has(1)).toBe(true);

			state.selectRow(1, 'toggle');
			expect(state.selectedIds.has(1)).toBe(false);
		});

		test('selectRow with add mode adds to selection', () => {
			const state = createTestGridState();

			state.selectRow(1, 'add');
			state.selectRow(2, 'add');
			expect(state.selectedIds.has(1)).toBe(true);
			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.size).toBe(2);
		});

		test('selectRow with remove mode removes from selection', () => {
			const state = createTestGridState();

			state.selectRow(1, 'add');
			state.selectRow(2, 'add');
			state.selectRow(1, 'remove');
			expect(state.selectedIds.has(1)).toBe(false);
			expect(state.selectedIds.has(2)).toBe(true);
		});

		test('selectAll selects all rows in processedData', () => {
			const state = createTestGridState();

			state.selectAll();
			expect(state.selectedIds.size).toBe(5);
			expect(state.selectedIds.has(1)).toBe(true);
			expect(state.selectedIds.has(5)).toBe(true);
		});

		test('clearSelection clears all selection', () => {
			const state = createTestGridState();

			state.selectAll();
			state.clearSelection();
			expect(state.selectedIds.size).toBe(0);
		});

		test('isRowSelected returns correct status', () => {
			const state = createTestGridState();

			state.selectRow(1, 'set');
			expect(state.isRowSelected(1)).toBe(true);
			expect(state.isRowSelected(2)).toBe(false);
		});

		test('selectRow updates lastSelectedRowId', () => {
			const state = createTestGridState();

			state.selectRow(3, 'set');
			expect(state.lastSelectedRowId).toBe(3);
		});
	});

	describe('range selection', () => {
		test('selectRange selects rows between anchor and target', () => {
			const state = createTestGridState();

			// First click sets anchor
			state.selectRow(2, 'set');
			expect(state.lastSelectedRowId).toBe(2);

			// Shift+click selects range
			state.selectRange(4);
			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.has(4)).toBe(true);
			expect(state.selectedIds.size).toBe(3);
		});

		test('selectRange works in reverse direction', () => {
			const state = createTestGridState();

			state.selectRow(4, 'set');
			state.selectRange(2);

			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.has(4)).toBe(true);
		});

		test('selectRange adds to existing selection', () => {
			const state = createTestGridState();

			// Add row 1 first
			state.selectRow(1, 'add');
			// Then set anchor at 3
			state.selectRow(3, 'add');
			// Range select to 5 (should keep 1, and add 3-5)
			state.selectRange(5);

			expect(state.selectedIds.has(1)).toBe(true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.has(4)).toBe(true);
			expect(state.selectedIds.has(5)).toBe(true);
		});

		test('selectRange falls back to set when no anchor', () => {
			const state = createTestGridState();

			state.selectRange(3);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.size).toBe(1);
		});

		test('selectRange in single selection mode just selects target', () => {
			const state = createTestGridState({ selectionMode: 'single' });

			state.selectRow(2, 'set');
			state.selectRange(4);

			expect(state.selectedIds.has(4)).toBe(true);
			expect(state.selectedIds.size).toBe(1);
		});
	});

	describe('keyboard navigation', () => {
		test('navigateRow updates focusedRowIndex', () => {
			const state = createTestGridState();
			state.setContainerSize(400, 100);

			// Start from first row
			state.selectRow(1, 'set');
			expect(state.focusedRowIndex).toBe(0);

			state.navigateRow(1, false);
			expect(state.focusedRowIndex).toBe(1);

			state.navigateRow(1, false);
			expect(state.focusedRowIndex).toBe(2);
		});

		test('navigateRow moves focus up', () => {
			const state = createTestGridState();
			state.setContainerSize(400, 200);

			// Start at row 3 (index 2)
			state.selectRow(3, 'set');
			expect(state.focusedRowIndex).toBe(2);

			state.navigateRow(-1, false);
			expect(state.focusedRowIndex).toBe(1);
		});

		test('navigateRow with select updates selection', () => {
			const state = createTestGridState();
			state.setContainerSize(400, 200);

			// Start somewhere
			state.selectRow(2, 'set');

			// Navigate down with selection
			state.navigateRow(1, true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.size).toBe(1); // set mode
		});

		test('navigateRow with extendSelection creates range', () => {
			const state = createTestGridState();
			state.setContainerSize(400, 200);

			state.selectRow(2, 'set');
			state.navigateRow(2, true, true); // Move down 2 with shift

			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.has(4)).toBe(true);
		});

		test('navigateRow clamps to bounds', () => {
			const state = createTestGridState();
			state.setContainerSize(400, 200);

			// Navigate to start
			state.selectRow(1, 'set');

			// Try to go before first row
			state.navigateRow(-10, false);
			expect(state.focusedRowIndex).toBe(0);

			// Try to go after last row
			state.navigateRow(100, false);
			expect(state.focusedRowIndex).toBe(4);
		});

		test('navigateToFirst goes to first row', () => {
			const state = createTestGridState();
			state.setContainerSize(400, 200);

			state.selectRow(4, 'set');
			const id = state.navigateToFirst(true);

			expect(id).toBe(1);
			expect(state.focusedRowIndex).toBe(0);
			expect(state.selectedIds.has(1)).toBe(true);
		});

		test('navigateToLast goes to last row', () => {
			const state = createTestGridState();
			state.setContainerSize(400, 200);

			const id = state.navigateToLast(true);

			expect(id).toBe(5);
			expect(state.focusedRowIndex).toBe(4);
			expect(state.selectedIds.has(5)).toBe(true);
		});

		test('navigateByPage moves by visible row count', () => {
			const state = createTestGridState({ rowHeight: 40 });
			state.setContainerSize(400, 80); // 2 visible rows

			// Start at row 1
			state.selectRow(1, 'set');
			expect(state.focusedRowIndex).toBe(0);

			state.navigateByPage('down', true);
			expect(state.focusedRowIndex).toBe(2); // Moved by 2 rows
		});

		test('navigateRow returns null for empty data', () => {
			const state = createGridState({
				data: [],
				columns: testColumns,
				selectionMode: 'multiple'
			});
			state.setContainerSize(400, 200);

			const id = state.navigateRow(1, false);
			expect(id).toBe(null);
		});
	});

	describe('column visibility', () => {
		test('setColumnVisibility updates hiddenColumns set', () => {
			const state = createTestGridState();

			state.setColumnVisibility('age', false);
			expect(state.hiddenColumns.has('age')).toBe(true);

			state.setColumnVisibility('age', true);
			expect(state.hiddenColumns.has('age')).toBe(false);
		});

		test('multiple columns can be hidden', () => {
			const state = createTestGridState();

			state.setColumnVisibility('age', false);
			state.setColumnVisibility('name', false);
			expect(state.hiddenColumns.has('age')).toBe(true);
			expect(state.hiddenColumns.has('name')).toBe(true);
			expect(state.hiddenColumns.size).toBe(2);
		});
	});

	describe('sorting state', () => {
		test('setSort updates sortState', () => {
			const state = createTestGridState();

			state.setSort('age', 'asc');
			expect(state.sortState).toHaveLength(1);
			expect(state.sortState[0]).toEqual({ columnKey: 'age', direction: 'asc' });
		});

		test('setSort with null direction clears sort', () => {
			const state = createTestGridState();

			state.setSort('age', 'asc');
			state.setSort('age', null);
			expect(state.sortState).toHaveLength(0);
		});

		test('toggleSort cycles through asc, desc, null', () => {
			const state = createTestGridState();

			state.toggleSort('age');
			expect(state.sortState[0]?.direction).toBe('asc');

			state.toggleSort('age');
			expect(state.sortState[0]?.direction).toBe('desc');

			state.toggleSort('age');
			expect(state.sortState.length).toBe(0);
		});

		test('multi-sort adds additional columns', () => {
			const state = createTestGridState();

			state.setSort('age', 'asc', true);
			state.setSort('name', 'desc', true);

			expect(state.sortState).toHaveLength(2);
			expect(state.sortState[0]).toEqual({ columnKey: 'age', direction: 'asc' });
			expect(state.sortState[1]).toEqual({ columnKey: 'name', direction: 'desc' });
		});
	});

	describe('filter state', () => {
		test('setFilter updates filterState', () => {
			const state = createTestGridState();

			state.setFilter('name', 'Alice', 'eq');
			expect(state.filterState).toHaveLength(1);
			expect(state.filterState[0]).toEqual({ columnKey: 'name', value: 'Alice', operator: 'eq' });
		});

		test('setFilter with empty value removes filter', () => {
			const state = createTestGridState();

			state.setFilter('name', 'Alice', 'eq');
			state.setFilter('name', '', 'eq');
			expect(state.filterState).toHaveLength(0);
		});

		test('clearFilters removes all filters', () => {
			const state = createTestGridState();

			state.setFilter('name', 'Alice', 'eq');
			state.setFilter('age', 30, 'gt');
			state.clearFilters();
			expect(state.filterState).toHaveLength(0);
		});
	});

	describe('column resizing', () => {
		test('setColumnWidth updates columnWidths', () => {
			const state = createTestGridState();

			state.setColumnWidth('name', 200);
			expect(state.columnWidths.get('name')).toBe(200);
		});

		test('setColumnWidth clamps to minWidth', () => {
			const state = createGridState({
				data: testData,
				columns: [{ key: 'name', header: 'Name', minWidth: 100 }],
				selectionMode: 'multiple'
			});

			state.setColumnWidth('name', 50);
			expect(state.columnWidths.get('name')).toBe(100);
		});

		test('setColumnWidth clamps to maxWidth', () => {
			const state = createGridState({
				data: testData,
				columns: [{ key: 'name', header: 'Name', maxWidth: 300 }],
				selectionMode: 'multiple'
			});

			state.setColumnWidth('name', 500);
			expect(state.columnWidths.get('name')).toBe(300);
		});
	});

	describe('scroll and viewport', () => {
		test('setScroll updates scroll position', () => {
			const state = createTestGridState();
			// Container smaller than content to allow scrolling
			// 5 rows * 40px = 200px total, container 80px = scrollable
			state.setContainerSize(400, 80);

			state.setScroll(50, 0);
			expect(state.scrollTop).toBe(50);
		});

		test('setContainerSize updates container dimensions', () => {
			const state = createTestGridState();

			state.setContainerSize(800, 600);
			expect(state.containerWidth).toBe(800);
			expect(state.containerHeight).toBe(600);
		});
	});

	describe('focus management', () => {
		test('setFocus updates focusedRowId and focusedColumnKey', () => {
			const state = createTestGridState();

			state.setFocus(2, 'name');
			expect(state.focusedRowId).toBe(2);
			expect(state.focusedColumnKey).toBe('name');
		});

		test('setFocus with null clears focus', () => {
			const state = createTestGridState();

			state.setFocus(2, 'name');
			state.setFocus(null, null);
			expect(state.focusedRowId).toBe(null);
			expect(state.focusedColumnKey).toBe(null);
		});
	});

	describe('data updates', () => {
		test('updateData replaces data', () => {
			const state = createTestGridState();

			const newData = [{ id: 10, name: 'New', age: 99 }];
			state.updateData(newData);
			expect(state.data).toEqual(newData);
		});

		test('updateColumns replaces columns', () => {
			const state = createTestGridState();

			const newColumns = [{ key: 'foo', header: 'Foo' }];
			state.updateColumns(newColumns);
			expect(state.columns).toEqual(newColumns);
		});
	});
});
