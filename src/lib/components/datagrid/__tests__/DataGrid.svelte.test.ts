/**
 * Browser-based component tests for DataGrid
 *
 * These tests run in a real Chromium browser via Vitest browser mode,
 * allowing Svelte 5 runes ($state, $derived, $effect) to work properly.
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
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
});
