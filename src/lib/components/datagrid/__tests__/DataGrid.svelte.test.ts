/**
 * Browser-based component tests for DataGrid
 *
 * Tests for the GridEngine-based implementation.
 * These tests run in a real Chromium browser via Vitest browser mode.
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import DataGrid from '../DataGrid.svelte';
import type { ColumnDef } from '../../../types/index.js';

// Helper to wait for a specified time
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

		test('renders rows from GridEngine', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					height: 400
				}
			});

			// Wait for engine initialization
			await delay(150);

			// Check that the body container is rendered
			const body = page.getByTestId('datagrid-body');
			await expect.element(body).toBeInTheDocument();
		});

		test('renders column headers', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			// Wait for engine initialization
			await delay(150);

			// Check header cells exist
			await expect.element(page.getByText('ID')).toBeInTheDocument();
			await expect.element(page.getByText('Name')).toBeInTheDocument();
			await expect.element(page.getByText('Value')).toBeInTheDocument();
		});
	});

	describe('error state', () => {
		test('shows error message when errorMessage prop is set', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					errorMessage: 'Something went wrong'
				}
			});

			const error = page.getByTestId('datagrid-error');
			await expect.element(error).toBeInTheDocument();
			await expect.element(page.getByText('Something went wrong')).toBeInTheDocument();
		});

		test('error state takes precedence over other states', async () => {
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

			// Loading should not be shown
			const loading = page.getByTestId('datagrid-loading');
			await expect.element(loading).not.toBeInTheDocument();
		});
	});

	describe('dimensions', () => {
		test('respects height prop with number', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					height: 300
				}
			});

			const grid = page.getByTestId('datagrid');
			// Check that the style contains the height value
			await expect.element(grid).toHaveAttribute('style', 'height: 300px; width: 100%;');
		});

		test('respects width prop with number', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					width: 500
				}
			});

			const grid = page.getByTestId('datagrid');
			await expect.element(grid).toHaveAttribute('style', 'height: 400px; width: 500px;');
		});

		test('accepts string dimensions', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns,
					height: '50vh',
					width: '80%'
				}
			});

			const grid = page.getByTestId('datagrid');
			await expect.element(grid).toHaveAttribute('style', 'height: 50vh; width: 80%;');
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

			const grid = page.getByTestId('datagrid');
			await expect.element(grid).toHaveAttribute('role', 'grid');
		});

		test('has aria-rowcount attribute', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			// Wait for engine initialization
			await delay(150);

			const grid = page.getByTestId('datagrid');
			// After engine init, rowCount should reflect the data
			await expect.element(grid).toHaveAttribute('aria-rowcount');
		});

		test('has aria-colcount attribute', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			const grid = page.getByTestId('datagrid');
			await expect.element(grid).toHaveAttribute('aria-colcount', '3');
		});
	});

	describe('GridEngine integration', () => {
		test('creates header container', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			await delay(150);

			// GridEngine should create the header container
			const header = page.getByRole('rowgroup').first();
			await expect.element(header).toBeInTheDocument();
		});

		test('creates body container', async () => {
			render(DataGrid, {
				props: {
					data: mockData,
					columns: mockColumns
				}
			});

			await delay(150);

			// GridEngine should create the body container
			const body = page.getByTestId('datagrid-body');
			await expect.element(body).toBeInTheDocument();
		});
	});
});
