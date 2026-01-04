/**
 * Tests for grid state selection and navigation features.
 *
 * Note: Some derived state (sorting, filtering, visibleColumns) requires
 * Svelte's reactive system and is tested in browser tests instead.
 */

import { describe, test, expect, vi } from 'vitest';
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

async function createTestGridState(options?: Partial<GridOptions<TestRow>>) {
	const state = createGridState({
		data: [...testData],
		columns: testColumns,
		getRowId: (row) => row.id,
		selectionMode: 'multiple',
		rowHeight: 40,
		...options
	});
	// Wait for initial data to be fetched from the DataSource
	await state.refresh();
	return state;
}

describe('Grid State', () => {
	describe('selection', () => {
		test('selectRow with set mode clears previous selection', async () => {
			const state = await createTestGridState();

			state.selectRow(1, 'set');
			expect(state.selectedIds.has(1)).toBe(true);
			expect(state.selectedIds.size).toBe(1);

			state.selectRow(2, 'set');
			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.has(1)).toBe(false);
			expect(state.selectedIds.size).toBe(1);
		});

		test('selectRow with toggle mode toggles selection', async () => {
			const state = await createTestGridState();

			state.selectRow(1, 'toggle');
			expect(state.selectedIds.has(1)).toBe(true);

			state.selectRow(1, 'toggle');
			expect(state.selectedIds.has(1)).toBe(false);
		});

		test('selectRow with add mode adds to selection', async () => {
			const state = await createTestGridState();

			state.selectRow(1, 'add');
			state.selectRow(2, 'add');
			expect(state.selectedIds.has(1)).toBe(true);
			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.size).toBe(2);
		});

		test('selectRow with remove mode removes from selection', async () => {
			const state = await createTestGridState();

			state.selectRow(1, 'add');
			state.selectRow(2, 'add');
			state.selectRow(1, 'remove');
			expect(state.selectedIds.has(1)).toBe(false);
			expect(state.selectedIds.has(2)).toBe(true);
		});

		test('selectAll selects all rows in processedData', async () => {
			const state = await createTestGridState();

			state.selectAll();
			expect(state.selectedIds.size).toBe(5);
			expect(state.selectedIds.has(1)).toBe(true);
			expect(state.selectedIds.has(5)).toBe(true);
		});

		test('clearSelection clears all selection', async () => {
			const state = await createTestGridState();

			state.selectAll();
			state.clearSelection();
			expect(state.selectedIds.size).toBe(0);
		});

		test('isRowSelected returns correct status', async () => {
			const state = await createTestGridState();

			state.selectRow(1, 'set');
			expect(state.isRowSelected(1)).toBe(true);
			expect(state.isRowSelected(2)).toBe(false);
		});

		test('selectRow updates lastSelectedRowId', async () => {
			const state = await createTestGridState();

			state.selectRow(3, 'set');
			expect(state.lastSelectedRowId).toBe(3);
		});
	});

	describe('range selection', () => {
		test('selectRange selects rows between anchor and target', async () => {
			const state = await createTestGridState();

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

		test('selectRange works in reverse direction', async () => {
			const state = await createTestGridState();

			state.selectRow(4, 'set');
			state.selectRange(2);

			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.has(4)).toBe(true);
		});

		test('selectRange adds to existing selection', async () => {
			const state = await createTestGridState();

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

		test('selectRange falls back to set when no anchor', async () => {
			const state = await createTestGridState();

			state.selectRange(3);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.size).toBe(1);
		});

		test('selectRange in single selection mode just selects target', async () => {
			const state = await createTestGridState({ selectionMode: 'single' });

			state.selectRow(2, 'set');
			state.selectRange(4);

			expect(state.selectedIds.has(4)).toBe(true);
			expect(state.selectedIds.size).toBe(1);
		});
	});

	describe('keyboard navigation', () => {
		test('navigateRow updates focusedRowIndex', async () => {
			const state = await createTestGridState();
			state.setContainerSize(400, 100);

			// Start from first row
			state.selectRow(1, 'set');
			expect(state.focusedRowIndex).toBe(0);

			state.navigateRow(1, false);
			expect(state.focusedRowIndex).toBe(1);

			state.navigateRow(1, false);
			expect(state.focusedRowIndex).toBe(2);
		});

		test('navigateRow moves focus up', async () => {
			const state = await createTestGridState();
			state.setContainerSize(400, 200);

			// Start at row 3 (index 2)
			state.selectRow(3, 'set');
			expect(state.focusedRowIndex).toBe(2);

			state.navigateRow(-1, false);
			expect(state.focusedRowIndex).toBe(1);
		});

		test('navigateRow with select updates selection', async () => {
			const state = await createTestGridState();
			state.setContainerSize(400, 200);

			// Start somewhere
			state.selectRow(2, 'set');

			// Navigate down with selection
			state.navigateRow(1, true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.size).toBe(1); // set mode
		});

		test('navigateRow with extendSelection creates range', async () => {
			const state = await createTestGridState();
			state.setContainerSize(400, 200);

			state.selectRow(2, 'set');
			state.navigateRow(2, true, true); // Move down 2 with shift

			expect(state.selectedIds.has(2)).toBe(true);
			expect(state.selectedIds.has(3)).toBe(true);
			expect(state.selectedIds.has(4)).toBe(true);
		});

		test('navigateRow clamps to bounds', async () => {
			const state = await createTestGridState();
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

		test('navigateToFirst goes to first row', async () => {
			const state = await createTestGridState();
			state.setContainerSize(400, 200);

			state.selectRow(4, 'set');
			const id = state.navigateToFirst(true);

			expect(id).toBe(1);
			expect(state.focusedRowIndex).toBe(0);
			expect(state.selectedIds.has(1)).toBe(true);
		});

		test('navigateToLast goes to last row', async () => {
			const state = await createTestGridState();
			state.setContainerSize(400, 200);

			const id = state.navigateToLast(true);

			expect(id).toBe(5);
			expect(state.focusedRowIndex).toBe(4);
			expect(state.selectedIds.has(5)).toBe(true);
		});

		test('navigateByPage moves by visible row count', async () => {
			const state = await createTestGridState({ rowHeight: 40 });
			state.setContainerSize(400, 80); // 2 visible rows

			// Start at row 1
			state.selectRow(1, 'set');
			expect(state.focusedRowIndex).toBe(0);

			state.navigateByPage('down', true);
			expect(state.focusedRowIndex).toBe(2); // Moved by 2 rows
		});

		test('navigateRow returns null for empty data', async () => {
			const state = createGridState({
				data: [],
				columns: testColumns,
				selectionMode: 'multiple'
			});
			await state.refresh();
			state.setContainerSize(400, 200);

			const id = state.navigateRow(1, false);
			expect(id).toBe(null);
		});
	});

	describe('column visibility', () => {
		test('setColumnVisibility updates hiddenColumns set', async () => {
			const state = await createTestGridState();

			state.setColumnVisibility('age', false);
			expect(state.hiddenColumns.has('age')).toBe(true);

			state.setColumnVisibility('age', true);
			expect(state.hiddenColumns.has('age')).toBe(false);
		});

		test('multiple columns can be hidden', async () => {
			const state = await createTestGridState();

			state.setColumnVisibility('age', false);
			state.setColumnVisibility('name', false);
			expect(state.hiddenColumns.has('age')).toBe(true);
			expect(state.hiddenColumns.has('name')).toBe(true);
			expect(state.hiddenColumns.size).toBe(2);
		});
	});

	describe('sorting state', () => {
		test('setSort updates sortState', async () => {
			const state = await createTestGridState();

			state.setSort('age', 'asc');
			expect(state.sortState).toHaveLength(1);
			expect(state.sortState[0]).toEqual({ columnKey: 'age', direction: 'asc' });
		});

		test('setSort with null direction clears sort', async () => {
			const state = await createTestGridState();

			state.setSort('age', 'asc');
			state.setSort('age', null);
			expect(state.sortState).toHaveLength(0);
		});

		test('toggleSort cycles through asc, desc, null', async () => {
			const state = await createTestGridState();

			state.toggleSort('age');
			expect(state.sortState[0]?.direction).toBe('asc');

			state.toggleSort('age');
			expect(state.sortState[0]?.direction).toBe('desc');

			state.toggleSort('age');
			expect(state.sortState.length).toBe(0);
		});

		test('multi-sort adds additional columns', async () => {
			const state = await createTestGridState();

			state.setSort('age', 'asc', true);
			state.setSort('name', 'desc', true);

			expect(state.sortState).toHaveLength(2);
			expect(state.sortState[0]).toEqual({ columnKey: 'age', direction: 'asc' });
			expect(state.sortState[1]).toEqual({ columnKey: 'name', direction: 'desc' });
		});
	});

	describe('filter state', () => {
		test('setFilter updates filterState', async () => {
			const state = await createTestGridState();

			state.setFilter('name', 'Alice', 'eq');
			expect(state.filterState).toHaveLength(1);
			expect(state.filterState[0]).toEqual({ columnKey: 'name', value: 'Alice', operator: 'eq' });
		});

		test('setFilter with empty value removes filter', async () => {
			const state = await createTestGridState();

			state.setFilter('name', 'Alice', 'eq');
			state.setFilter('name', '', 'eq');
			expect(state.filterState).toHaveLength(0);
		});

		test('clearFilters removes all filters', async () => {
			const state = await createTestGridState();

			state.setFilter('name', 'Alice', 'eq');
			state.setFilter('age', 30, 'gt');
			state.clearFilters();
			expect(state.filterState).toHaveLength(0);
		});
	});

	describe('global search', () => {
		test('setGlobalSearch updates globalSearchTerm', async () => {
			const state = await createTestGridState();

			state.setGlobalSearch('alice');
			expect(state.globalSearchTerm).toBe('alice');
		});

		test('clearGlobalSearch clears the search term', async () => {
			const state = await createTestGridState();

			state.setGlobalSearch('alice');
			state.clearGlobalSearch();
			expect(state.globalSearchTerm).toBe('');
		});

		test('empty search term does not affect data', async () => {
			const state = await createTestGridState();

			state.setGlobalSearch('');
			// Wait for the search to be applied via DataSource
			await state.refresh();
			expect(state.processedData.length).toBe(5);
		});

		test('whitespace-only search is treated as empty', async () => {
			const state = await createTestGridState();

			state.setGlobalSearch('   ');
			// Wait for the search to be applied via DataSource
			await state.refresh();
			expect(state.processedData.length).toBe(5);
		});
	});

	describe('column resizing', () => {
		test('setColumnWidth updates columnWidths', async () => {
			const state = await createTestGridState();

			state.setColumnWidth('name', 200);
			expect(state.columnWidths.get('name')).toBe(200);
		});

		test('setColumnWidth clamps to minWidth', async () => {
			const state = createGridState({
				data: testData,
				columns: [{ key: 'name', header: 'Name', minWidth: 100 }],
				selectionMode: 'multiple'
			});
			await state.refresh();

			state.setColumnWidth('name', 50);
			expect(state.columnWidths.get('name')).toBe(100);
		});

		test('setColumnWidth clamps to maxWidth', async () => {
			const state = createGridState({
				data: testData,
				columns: [{ key: 'name', header: 'Name', maxWidth: 300 }],
				selectionMode: 'multiple'
			});
			await state.refresh();

			state.setColumnWidth('name', 500);
			expect(state.columnWidths.get('name')).toBe(300);
		});
	});

	describe('scroll and viewport', () => {
		test('setScroll updates scroll position', async () => {
			const state = await createTestGridState();
			// Container smaller than content to allow scrolling
			// 5 rows * 40px = 200px total, container 80px = scrollable
			state.setContainerSize(400, 80);

			// Verify data is loaded and dimensions are correct
			expect(state.rows.length).toBe(5);
			expect(state.totalRowCount).toBe(5);
			expect(state.totalHeight).toBe(200); // 5 * 40

			state.setScroll(50, 0);
			expect(state.scrollTop).toBe(50);
		});

		test('setContainerSize updates container dimensions', async () => {
			const state = await createTestGridState();

			state.setContainerSize(800, 600);
			expect(state.containerWidth).toBe(800);
			expect(state.containerHeight).toBe(600);
		});
	});

	describe('focus management', () => {
		test('setFocus updates focusedRowId and focusedColumnKey', async () => {
			const state = await createTestGridState();

			state.setFocus(2, 'name');
			expect(state.focusedRowId).toBe(2);
			expect(state.focusedColumnKey).toBe('name');
		});

		test('setFocus with null clears focus', async () => {
			const state = await createTestGridState();

			state.setFocus(2, 'name');
			state.setFocus(null, null);
			expect(state.focusedRowId).toBe(null);
			expect(state.focusedColumnKey).toBe(null);
		});
	});

	describe('data updates', () => {
		test('updateData replaces data', async () => {
			const state = await createTestGridState();

			const newData = [{ id: 10, name: 'New', age: 99 }];
			state.updateData(newData);
			// Wait for data to be re-fetched from the internal LocalDataSource
			await state.refresh();
			expect(state.data).toEqual(newData);
		});

		test('updateColumns replaces columns', async () => {
			const state = await createTestGridState();

			const newColumns = [{ key: 'foo', header: 'Foo' }];
			state.updateColumns(newColumns);
			expect(state.columns).toEqual(newColumns);
		});
	});

	describe('cell editing', () => {
		test('startEdit initializes edit state', async () => {
			const state = await createTestGridState();

			const result = state.startEdit(1, 'name');

			expect(result).toBe(true);
			expect(state.editState).not.toBeNull();
			expect(state.editState?.rowId).toBe(1);
			expect(state.editState?.columnKey).toBe('name');
			expect(state.editState?.value).toBe('Alice');
			expect(state.editState?.originalValue).toBe('Alice');
		});

		test('startEdit returns false for non-existent row', async () => {
			const state = await createTestGridState();

			const result = state.startEdit(999, 'name');

			expect(result).toBe(false);
			expect(state.editState).toBeNull();
		});

		test('startEdit returns false for column with editable: false', async () => {
			const state = createGridState({
				data: testData,
				columns: [
					{ key: 'id', header: 'ID', editable: false },
					{ key: 'name', header: 'Name' },
					{ key: 'age', header: 'Age' }
				],
				getRowId: (row) => row.id,
				selectionMode: 'multiple'
			});
			await state.refresh();

			const result = state.startEdit(1, 'id');

			expect(result).toBe(false);
			expect(state.editState).toBeNull();
		});

		test('startEdit focuses the cell', async () => {
			const state = await createTestGridState();

			state.startEdit(2, 'age');

			expect(state.focusedRowId).toBe(2);
			expect(state.focusedColumnKey).toBe('age');
			expect(state.focusedRowIndex).toBe(1); // Row with id=2 is at index 1
		});

		test('setEditValue updates the edit value', async () => {
			const state = await createTestGridState();

			state.startEdit(1, 'name');
			state.setEditValue('Updated Name');

			expect(state.editState?.value).toBe('Updated Name');
		});

		test('setEditValue does nothing without active edit', async () => {
			const state = await createTestGridState();

			state.setEditValue('Test Value');

			expect(state.editState).toBeNull();
		});

		test('setEditValue calls onCellValidate and sets error', async () => {
			const state = createGridState({
				data: testData,
				columns: testColumns,
				getRowId: (row) => row.id,
				selectionMode: 'multiple',
				onCellValidate: (rowId, columnKey, value) => {
					if (columnKey === 'name' && String(value).length < 2) {
						return 'Name must be at least 2 characters';
					}
					return null;
				}
			});
			await state.refresh();

			state.startEdit(1, 'name');
			state.setEditValue('A'); // Too short

			expect(state.editState?.error).toBe('Name must be at least 2 characters');
		});

		test('commitEdit clears edit state on success', async () => {
			const state = await createTestGridState();

			state.startEdit(1, 'name');
			state.setEditValue('New Name');
			const result = await state.commitEdit();

			expect(result).toBe(true);
			expect(state.editState).toBeNull();
		});

		test('commitEdit calls onCellEdit callback when value changed', async () => {
			let callbackCalled = false;
			let callbackArgs: { rowId: any; columnKey: any; newValue: any; oldValue: any } | null = null;

			const state = createGridState({
				data: testData,
				columns: testColumns,
				getRowId: (row) => row.id,
				selectionMode: 'multiple',
				onCellEdit: (rowId, columnKey, newValue, oldValue) => {
					callbackCalled = true;
					callbackArgs = { rowId, columnKey, newValue, oldValue };
				}
			});
			await state.refresh();

			state.startEdit(1, 'name');
			state.setEditValue('New Name');
			await state.commitEdit();

			expect(callbackCalled).toBe(true);
			expect(callbackArgs?.rowId).toBe(1);
			expect(callbackArgs?.columnKey).toBe('name');
			expect(callbackArgs?.newValue).toBe('New Name');
			expect(callbackArgs?.oldValue).toBe('Alice');
		});

		test('commitEdit does not call onCellEdit when value unchanged', async () => {
			let callbackCalled = false;

			const state = createGridState({
				data: testData,
				columns: testColumns,
				getRowId: (row) => row.id,
				selectionMode: 'multiple',
				onCellEdit: () => {
					callbackCalled = true;
				}
			});
			await state.refresh();

			state.startEdit(1, 'name');
			// Don't change the value
			await state.commitEdit();

			expect(callbackCalled).toBe(false);
		});

		test('commitEdit returns false on validation error', async () => {
			const state = createGridState({
				data: testData,
				columns: testColumns,
				getRowId: (row) => row.id,
				selectionMode: 'multiple',
				onCellValidate: (rowId, columnKey, value) => {
					if (String(value).length < 2) return 'Too short';
					return null;
				}
			});
			await state.refresh();

			state.startEdit(1, 'name');
			state.setEditValue('A'); // Too short
			const result = await state.commitEdit();

			expect(result).toBe(false);
			expect(state.editState).not.toBeNull(); // Edit state should remain
			expect(state.editState?.error).toBe('Too short');
		});

		test('commitEdit returns false when no edit in progress', async () => {
			const state = await createTestGridState();

			const result = await state.commitEdit();

			expect(result).toBe(false);
		});

		test('cancelEdit clears edit state', async () => {
			const state = await createTestGridState();

			state.startEdit(1, 'name');
			state.setEditValue('Changed');
			state.cancelEdit();

			expect(state.editState).toBeNull();
		});

		test('isEditing returns true for active edit cell', async () => {
			const state = await createTestGridState();

			state.startEdit(1, 'name');

			expect(state.isEditing(1, 'name')).toBe(true);
			expect(state.isEditing(1, 'age')).toBe(false);
			expect(state.isEditing(2, 'name')).toBe(false);
		});

		test('isEditing returns false when no edit', async () => {
			const state = await createTestGridState();

			expect(state.isEditing(1, 'name')).toBe(false);
		});

		test('hasActiveEdit returns true when editing', async () => {
			const state = await createTestGridState();

			expect(state.hasActiveEdit()).toBe(false);

			state.startEdit(1, 'name');

			expect(state.hasActiveEdit()).toBe(true);

			state.cancelEdit();

			expect(state.hasActiveEdit()).toBe(false);
		});

		test('editState getter returns current edit state', async () => {
			const state = await createTestGridState();

			expect(state.editState).toBeNull();

			state.startEdit(1, 'name');

			expect(state.editState).toEqual({
				rowId: 1,
				columnKey: 'name',
				value: 'Alice',
				originalValue: 'Alice',
				error: undefined
			});
		});

		describe('with DataSource auto-save', () => {
			// Helper to create a mock DataSource that returns test data
			function createMockDataSource(options?: { mutate?: any }) {
				return {
					name: 'MockDataSource',
					capabilities: {
						pagination: { offset: true },
						sort: { enabled: true },
						filter: { enabled: true },
						grouping: { enabled: false },
						search: { enabled: false },
						rowCount: true,
						cancellation: false,
						streaming: false
					},
					getRows: vi.fn(async () => ({
						success: true,
						data: { rows: testData, rowCount: testData.length }
					})),
					...options
				};
			}

			test('auto-saves through MutableDataSource on commit', async () => {
				let mutationCalled = false;
				let mutationData: any = null;

				const mockDataSource = createMockDataSource({
					mutate: vi.fn(async (mutations: any[]) => {
						mutationCalled = true;
						mutationData = mutations[0];
						return { success: true, data: [1] };
					})
				});

				const state = createGridState({
					dataSource: mockDataSource,
					columns: testColumns,
					getRowId: (row) => row.id,
					selectionMode: 'multiple'
				});
				await state.refresh();

				state.startEdit(1, 'name');
				state.setEditValue('Updated Name');
				const result = await state.commitEdit();

				expect(result).toBe(true);
				expect(mutationCalled).toBe(true);
				expect(mutationData).toEqual({
					type: 'update',
					rowId: 1,
					data: { name: 'Updated Name' }
				});
			});

			test('shows error when DataSource mutation fails', async () => {
				const mockDataSource = createMockDataSource({
					mutate: vi.fn(async () => ({
						success: false,
						error: { code: 'UPDATE_FAILED', message: 'Database error' }
					}))
				});

				const state = createGridState({
					dataSource: mockDataSource,
					columns: testColumns,
					getRowId: (row) => row.id,
					selectionMode: 'multiple'
				});
				await state.refresh();

				state.startEdit(1, 'name');
				state.setEditValue('Updated Name');
				const result = await state.commitEdit();

				expect(result).toBe(false);
				expect(state.editState).not.toBeNull();
				expect(state.editState?.error).toBe('Database error');
				expect(state.editState?.saving).toBe(false);
			});

			test('does not auto-save when DataSource is not mutable', async () => {
				// DataSource without mutate method
				const mockDataSource = createMockDataSource();

				let callbackCalled = false;
				const state = createGridState({
					dataSource: mockDataSource,
					columns: testColumns,
					getRowId: (row) => row.id,
					selectionMode: 'multiple',
					onCellEdit: () => {
						callbackCalled = true;
					}
				});
				await state.refresh();

				state.startEdit(1, 'name');
				state.setEditValue('Updated Name');
				const result = await state.commitEdit();

				expect(result).toBe(true);
				expect(callbackCalled).toBe(true); // Falls back to callback
			});
		});
	});

	describe('column pinning', () => {
		test('pinnedLeftColumns returns only left-pinned columns', async () => {
			const state = createGridState({
				data: testData,
				columns: [
					{ key: 'id', header: 'ID', pinned: 'left' },
					{ key: 'name', header: 'Name' },
					{ key: 'age', header: 'Age' }
				],
				getRowId: (row) => row.id,
				selectionMode: 'multiple'
			});
			await state.refresh();

			expect(state.pinnedLeftColumns.length).toBe(1);
			expect(state.pinnedLeftColumns[0].key).toBe('id');
		});

		test('scrollableColumns returns non-pinned columns', async () => {
			const state = createGridState({
				data: testData,
				columns: [
					{ key: 'id', header: 'ID', pinned: 'left' },
					{ key: 'name', header: 'Name' },
					{ key: 'age', header: 'Age' }
				],
				getRowId: (row) => row.id,
				selectionMode: 'multiple'
			});
			await state.refresh();

			expect(state.scrollableColumns.length).toBe(2);
			expect(state.scrollableColumns.map((c) => c.key)).toEqual(['name', 'age']);
		});

		test('pinnedLeftWidth calculates total width of pinned columns', async () => {
			const state = createGridState({
				data: testData,
				columns: [
					{ key: 'id', header: 'ID', width: 80, pinned: 'left' },
					{ key: 'name', header: 'Name', width: 100, pinned: 'left' },
					{ key: 'age', header: 'Age', width: 60 }
				],
				getRowId: (row) => row.id,
				selectionMode: 'multiple'
			});
			await state.refresh();

			expect(state.pinnedLeftWidth).toBe(180); // 80 + 100
		});

		test('scrollableWidth calculates total width of scrollable columns', async () => {
			const state = createGridState({
				data: testData,
				columns: [
					{ key: 'id', header: 'ID', width: 80, pinned: 'left' },
					{ key: 'name', header: 'Name', width: 100 },
					{ key: 'age', header: 'Age', width: 60 }
				],
				getRowId: (row) => row.id,
				selectionMode: 'multiple'
			});
			await state.refresh();

			expect(state.scrollableWidth).toBe(160); // 100 + 60
		});

		test('setColumnPinned updates column pinning', async () => {
			const state = await createTestGridState();

			expect(state.pinnedLeftColumns.length).toBe(0);

			state.setColumnPinned('id', 'left');

			expect(state.pinnedLeftColumns.length).toBe(1);
			expect(state.pinnedLeftColumns[0].key).toBe('id');
		});

		test('setColumnPinned reorders columns (pinned first)', async () => {
			const state = await createTestGridState();

			// Initially: id, name, age
			expect(state.columnOrder).toEqual(['id', 'name', 'age']);

			state.setColumnPinned('age', 'left');

			// After pinning age: age (pinned), id, name (scrollable)
			expect(state.columnOrder).toEqual(['age', 'id', 'name']);
			expect(state.pinnedLeftColumns[0].key).toBe('age');
		});

		test('setColumnPinned to false unpins a column', async () => {
			const state = createGridState({
				data: testData,
				columns: [
					{ key: 'id', header: 'ID', pinned: 'left' },
					{ key: 'name', header: 'Name' },
					{ key: 'age', header: 'Age' }
				],
				getRowId: (row) => row.id,
				selectionMode: 'multiple'
			});
			await state.refresh();

			expect(state.pinnedLeftColumns.length).toBe(1);

			state.setColumnPinned('id', false);

			expect(state.pinnedLeftColumns.length).toBe(0);
			expect(state.scrollableColumns.length).toBe(3);
		});
	});
});
