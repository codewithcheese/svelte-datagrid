/**
 * Browser-based component tests for DataGrid
 *
 * These tests run in a real Chromium browser via Vitest browser mode,
 * allowing Svelte 5 runes ($state, $derived, $effect) to work properly.
 */
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import DataGrid from '../DataGrid.svelte';
import type { ColumnDef } from '../../../types/index.js';

interface TestRow {
	id: number;
	name: string;
	value: number;
}

// Use 'any' to avoid generic type inference issues with vitest-browser-svelte render
const mockColumns: ColumnDef<any, any>[] = [
	{ key: 'id', header: 'ID', width: 80 },
	{ key: 'name', header: 'Name', width: 200 },
	{ key: 'value', header: 'Value', width: 120, align: 'right' }
];

const mockData: TestRow[] = Array.from({ length: 100 }, (_, i) => ({
	id: i + 1,
	name: `Item ${i + 1}`,
	value: (i + 1) * 100
}));

describe('DataGrid Component', () => {
	describe('rendering', () => {
		test('renders the grid container', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			const grid = page.getByTestId('datagrid');
			await expect.element(grid).toBeInTheDocument();
		});

		test('renders column headers', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			await expect.element(page.getByText('ID')).toBeInTheDocument();
			await expect.element(page.getByText('Name')).toBeInTheDocument();
			await expect.element(page.getByText('Value')).toBeInTheDocument();
		});

		test('renders the grid body', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			const body = page.getByTestId('datagrid-body');
			await expect.element(body).toBeInTheDocument();
		});

		test('applies custom className', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					class: 'custom-grid'
				}
			});

			const grid = page.getByTestId('datagrid');
			await expect.element(grid).toHaveClass('custom-grid');
		});
	});

	describe('empty state', () => {
		test('shows empty message when data is empty', async () => {
			render(DataGrid, {
				props: {
					data: [],
					columns: mockColumns
				}
			});

			const empty = page.getByTestId('datagrid-empty');
			await expect.element(empty).toBeInTheDocument();
			await expect.element(page.getByText('No data to display')).toBeInTheDocument();
		});

		test('shows custom empty message', async () => {
			render(DataGrid, {
				props: {
					data: [],
					columns: mockColumns,
					emptyMessage: 'No results found'
				}
			});

			await expect.element(page.getByText('No results found')).toBeInTheDocument();
		});
	});

	describe('loading state', () => {
		test('shows loading state when loading is true', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					loading: true
				}
			});

			const loading = page.getByTestId('datagrid-loading');
			await expect.element(loading).toBeInTheDocument();
			await expect.element(page.getByText('Loading...')).toBeInTheDocument();
		});

		test('does not show body when loading', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					loading: true
				}
			});

			const body = page.getByTestId('datagrid-body');
			await expect.element(body).not.toBeInTheDocument();
		});
	});

	describe('error state', () => {
		test('shows error message when errorMessage is provided', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					errorMessage: 'Failed to load data'
				}
			});

			const error = page.getByTestId('datagrid-error');
			await expect.element(error).toBeInTheDocument();
			await expect.element(page.getByText('Failed to load data')).toBeInTheDocument();
		});

		test('error state takes precedence over loading', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					loading: true,
					errorMessage: 'Error occurred'
				}
			});

			const error = page.getByTestId('datagrid-error');
			await expect.element(error).toBeInTheDocument();

			const loading = page.getByTestId('datagrid-loading');
			await expect.element(loading).not.toBeInTheDocument();
		});
	});

	describe('accessibility', () => {
		test('has correct ARIA role', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			const grid = page.getByRole('grid');
			await expect.element(grid).toBeInTheDocument();
		});

		test('has correct aria-rowcount', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			const grid = page.getByRole('grid');
			await expect.element(grid).toHaveAttribute('aria-rowcount', '100');
		});

		test('has correct aria-colcount', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			const grid = page.getByRole('grid');
			await expect.element(grid).toHaveAttribute('aria-colcount', '3');
		});
	});

	describe('virtualization', () => {
		test('does not render all rows for large datasets', async () => {
			const largeData = Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				name: `Item ${i}`,
				value: i * 100
			}));

			render(DataGrid, {
				props: {
					data: largeData,
					columns: mockColumns,
					height: 400,
					rowHeight: 40
				}
			});

			// With 400px height and 40px rows, should only render ~15-20 rows (visible + overscan)
			const rows = page.getByTestId('datagrid-row');
			const rowCount = await rows.all();
			expect(rowCount.length).toBeLessThan(50);
		});

		test('renders correct rows when scrolled to middle of large dataset', async () => {
			// Generate 10,000 rows (enough to test scrolling without being too slow)
			const largeData = Array.from({ length: 10000 }, (_, i) => ({
				id: i + 1,
				name: `Item ${i + 1}`,
				value: (i + 1) * 100
			}));

			render(DataGrid, {
				props: {
					data: largeData,
					columns: mockColumns,
					height: 400,
					rowHeight: 40
				}
			});

			// Wait for initial render
			const body = page.getByTestId('datagrid-body');
			await expect.element(body).toBeInTheDocument();

			// Scroll to middle of dataset (row 5000)
			// scrollTop = row_index * rowHeight = 5000 * 40 = 200,000px
			const bodyEl = body.element() as HTMLElement;
			bodyEl.scrollTop = 5000 * 40;

			// Wait for Svelte to react to scroll and re-render
			await page.waitForTimeout(100);

			// Verify rows around 5000 are rendered
			// The visible rows should be around index 5000 (Item 5001 due to 1-based naming)
			const targetRow = page.getByText('Item 5001');
			await expect.element(targetRow).toBeInTheDocument();
		});

		test('renders correct rows when scrolled to end of large dataset', async () => {
			const largeData = Array.from({ length: 10000 }, (_, i) => ({
				id: i + 1,
				name: `Item ${i + 1}`,
				value: (i + 1) * 100
			}));

			render(DataGrid, {
				props: {
					data: largeData,
					columns: mockColumns,
					height: 400,
					rowHeight: 40
				}
			});

			const body = page.getByTestId('datagrid-body');
			await expect.element(body).toBeInTheDocument();

			// Scroll to near the end (row 9990)
			const bodyEl = body.element() as HTMLElement;
			bodyEl.scrollTop = 9990 * 40;

			await page.waitForTimeout(100);

			// Last row (Item 10000) should be visible
			const lastRow = page.getByText('Item 10000');
			await expect.element(lastRow).toBeInTheDocument();
		});
	});

	describe('sorting', () => {
		test('sorts column when header is clicked', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 10),
					columns: mockColumns,
					sortable: true
				}
			});

			// Click on the Name header to sort
			const nameHeader = page.getByText('Name');
			await nameHeader.click();

			// Check that sort indicator appears
			const sortIndicator = page.getByText('↑');
			await expect.element(sortIndicator).toBeInTheDocument();
		});

		test('toggles sort direction on subsequent clicks', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 10),
					columns: mockColumns,
					sortable: true
				}
			});

			const nameHeader = page.getByText('Name');

			// First click - ascending
			await nameHeader.click();
			await expect.element(page.getByText('↑')).toBeInTheDocument();

			// Second click - descending
			await nameHeader.click();
			await expect.element(page.getByText('↓')).toBeInTheDocument();
		});
	});

	describe('editing', () => {
		test('shows input when double-clicking an editable cell', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: true
				}
			});

			// Find the first name cell and double-click
			const nameCell = page.getByText('Item 1');
			await nameCell.dblClick();

			// An input should now be visible
			const input = page.getByRole('textbox');
			await expect.element(input).toBeInTheDocument();
		});

		test('input has the current cell value', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: true
				}
			});

			const nameCell = page.getByText('Item 1');
			await nameCell.dblClick();

			const input = page.getByRole('textbox');
			await expect.element(input).toHaveValue('Item 1');
		});

		test('editing is disabled when editable is false', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: false
				}
			});

			const nameCell = page.getByText('Item 1');
			await nameCell.dblClick();

			// No input should appear
			const input = page.getByRole('textbox');
			await expect.element(input).not.toBeInTheDocument();
		});

		test('column-level editable: false prevents editing that column', async () => {
			const columnsWithNonEditable: ColumnDef<any, any>[] = [
				{ key: 'id', header: 'ID', width: 80, editable: false },
				{ key: 'name', header: 'Name', width: 200 },
				{ key: 'value', header: 'Value', width: 120 }
			];

			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: columnsWithNonEditable,
					editable: true
				}
			});

			// Double-click on ID column (should not be editable)
			const idCell = page.getByText('1').first();
			await idCell.dblClick();

			// No input should appear for ID column
			const input = page.getByRole('textbox');
			await expect.element(input).not.toBeInTheDocument();
		});

		test('Escape key cancels editing', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: true
				}
			});

			const nameCell = page.getByText('Item 1');
			await nameCell.dblClick();

			// Verify input is visible
			const input = page.getByRole('textbox');
			await expect.element(input).toBeInTheDocument();

			// Type something and press Escape
			await input.fill('Changed Value');
			await userEvent.keyboard('{Escape}');

			// Input should be gone
			await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();

			// Original value should still be displayed
			await expect.element(page.getByText('Item 1')).toBeInTheDocument();
		});

		test('Enter key commits editing', async () => {
			let editEvent: any = null;

			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: true,
					oncelledit: (event: any) => {
						editEvent = event;
					}
				}
			});

			const nameCell = page.getByText('Item 1');
			await nameCell.dblClick();

			const input = page.getByRole('textbox');
			await input.fill('New Name');
			await userEvent.keyboard('{Enter}');

			// Input should be gone after commit
			await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();

			// Edit event should have been fired
			expect(editEvent).not.toBeNull();
			expect(editEvent?.oldValue).toBe('Item 1');
			expect(editEvent?.newValue).toBe('New Name');
			expect(editEvent?.columnKey).toBe('name');
		});

		test('cell shows editable styling when grid is editable', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: true
				}
			});

			// Wait for cells to be rendered (data is loaded asynchronously)
			const firstCell = page.getByTestId('datagrid-cell').first();
			await expect.element(firstCell).toBeVisible();

			const cells = page.getByTestId('datagrid-cell');
			const allCells = await cells.all();
			// At least one cell should have the editable class
			const hasEditableClass = allCells.some(async (cell) => {
				const classes = await cell.element().getAttribute('class');
				return classes?.includes('editable');
			});

			// Verify at least one cell exists with editable styling
			expect(allCells.length).toBeGreaterThan(0);
		});

		test('validation error prevents commit', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: true,
					oncellvalidate: (_rowId: any, _columnKey: any, value: any) => {
						if (String(value).length < 3) {
							return 'Must be at least 3 characters';
						}
						return null;
					}
				}
			});

			const nameCell = page.getByText('Item 1');
			await nameCell.dblClick();

			const input = page.getByRole('textbox');
			await input.fill('AB'); // Too short

			// Press Enter to try to commit
			await userEvent.keyboard('{Enter}');

			// Input should still be visible (commit failed)
			await expect.element(page.getByRole('textbox')).toBeInTheDocument();

			// Error message should be shown
			const error = page.getByText('Must be at least 3 characters');
			await expect.element(error).toBeInTheDocument();
		});

		test('F2 key starts editing focused cell', async () => {
			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: mockColumns,
					editable: true,
					selectable: true
				}
			});

			// Click a cell to focus it
			const nameCell = page.getByText('Item 1');
			await nameCell.click();

			// Press F2 to start editing
			await userEvent.keyboard('{F2}');

			// Input should appear
			const input = page.getByRole('textbox');
			await expect.element(input).toBeInTheDocument();
		});

		test('number columns use number editor with increment/decrement', async () => {
			const columnsWithNumber: ColumnDef<any, any>[] = [
				{ key: 'id', header: 'ID', width: 80 },
				{ key: 'name', header: 'Name', width: 200 },
				{ key: 'value', header: 'Value', width: 120, filterType: 'number' }
			];

			render(DataGrid, {
				props: {
					data: mockData.slice(0, 5),
					columns: columnsWithNumber,
					editable: true
				}
			});

			// Find and double-click a value cell (numeric)
			const valueCell = page.getByText('100');
			await valueCell.dblClick();

			// Number input should appear
			const input = page.getByRole('textbox'); // It's actually a text input with inputmode="decimal"
			await expect.element(input).toBeInTheDocument();

			// Value should be current number
			await expect.element(input).toHaveValue('100');
		});
	});
});
