/**
 * Browser-based performance tests for DataGrid
 *
 * These tests run in a real Chromium browser via Vitest browser mode,
 * measuring actual rendering performance with large datasets.
 *
 * This catches browser-specific issues that Node.js tests miss:
 * - DOM rendering overhead
 * - Svelte reactivity in browser context
 * - Layout/paint operations
 * - Memory pressure
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import DataGrid from '../DataGrid.svelte';
import type { ColumnDef } from '../../../types/index.js';

// Helper to wait for a specified time (vitest-browser doesn't have page.waitForTimeout)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// EXACT REPLICA OF DEMO PAGE DATA GENERATION
// This must match src/routes/demo/+page.svelte exactly
// =============================================================================

interface Person extends Record<string, unknown> {
	id: number;
	firstName: string;
	lastName: string;
	age: number;
	email: string;
	department: string;
	salary: number;
	startDate: number;
	isActive: boolean;
}

// Pre-computed lookup tables (same as demo)
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
const FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const EMAIL_SUFFIX = '@example.com';
const BASE_TIMESTAMP = new Date(2015, 0, 1).getTime();
const DAY_MS = 86400000;

/**
 * EXACT COPY of demo page's generateData function
 */
function generateData(count: number): Person[] {
	const data = new Array<Person>(count);

	const deptLen = DEPARTMENTS.length;
	const firstLen = FIRST_NAMES.length;
	const lastLen = LAST_NAMES.length;

	for (let i = 0; i < count; i++) {
		data[i] = {
			id: i + 1,
			firstName: FIRST_NAMES[i % firstLen],
			lastName: LAST_NAMES[Math.floor(i / firstLen) % lastLen],
			age: 22 + (i % 43),
			email: 'user' + (i + 1) + EMAIL_SUFFIX,
			department: DEPARTMENTS[i % deptLen],
			salary: 50000 + ((i * 7919) % 100000),
			startDate: BASE_TIMESTAMP + ((i % 3650) * DAY_MS),
			isActive: i % 5 !== 0
		};
	}

	return data;
}

// Fast timestamp formatter (same as demo)
const BASE_DATE = new Date(2015, 0, 1);
const BASE_YEAR = BASE_DATE.getFullYear();
const DAYS_IN_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function formatTimestamp(timestamp: number): string {
	const daysSinceBase = Math.floor((timestamp - BASE_TIMESTAMP) / DAY_MS);
	let year = BASE_YEAR;
	let remainingDays = daysSinceBase;

	while (remainingDays >= 365) {
		remainingDays -= 365;
		year++;
	}

	let month = 0;
	while (month < 11 && remainingDays >= DAYS_IN_MONTHS[month]) {
		remainingDays -= DAYS_IN_MONTHS[month];
		month++;
	}

	const day = remainingDays + 1;
	return `${month + 1}/${day}/${year}`;
}

// Fast currency formatter (same as demo)
function formatCurrency(value: number): string {
	const str = String(Math.round(value));
	let result = '';
	let count = 0;
	for (let i = str.length - 1; i >= 0; i--) {
		if (count > 0 && count % 3 === 0) {
			result = ',' + result;
		}
		result = str[i] + result;
		count++;
	}
	return '$' + result;
}

// Column definitions (same as demo)
const columns: ColumnDef<Person, any>[] = [
	{ key: 'id', header: 'ID', width: 80, align: 'center' },
	{ key: 'firstName', header: 'First Name', width: 120 },
	{ key: 'lastName', header: 'Last Name', width: 120 },
	{ key: 'age', header: 'Age', width: 80, align: 'right' },
	{ key: 'email', header: 'Email', width: 200 },
	{ key: 'department', header: 'Department', width: 120 },
	{ key: 'salary', header: 'Salary', width: 120, align: 'right', formatter: formatCurrency },
	{ key: 'startDate', header: 'Start Date', width: 120, formatter: formatTimestamp },
	{ key: 'isActive', header: 'Active', width: 80, align: 'center' }
];

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('DataGrid Browser Performance', () => {
	/**
	 * Test data generation performance in browser
	 * This is the first step - just generating the data array
	 */
	test('generates 100K rows in browser < 500ms', async () => {
		const start = performance.now();
		const data = generateData(100000);
		const duration = performance.now() - start;

		console.log(`Browser: Generated 100K rows in ${duration.toFixed(2)}ms`);
		expect(data.length).toBe(100000);
		expect(duration).toBeLessThan(500);
	});

	test('generates 1M rows in browser < 2000ms', async () => {
		const start = performance.now();
		const data = generateData(1000000);
		const duration = performance.now() - start;

		console.log(`Browser: Generated 1M rows in ${duration.toFixed(2)}ms`);
		expect(data.length).toBe(1000000);
		expect(duration).toBeLessThan(2000);
	});

	/**
	 * Test initial render with small dataset
	 */
	test('renders DataGrid with 1K rows < 500ms', async () => {
		const data = generateData(1000);

		const start = performance.now();
		render(DataGrid, {
			props: {
				data,
				columns,
				height: 600,
				rowHeight: 40
			}
		});

		// Wait for body to be present (data loaded)
		const body = page.getByTestId('datagrid-body');
		await expect.element(body).toBeInTheDocument();

		const duration = performance.now() - start;
		console.log(`Browser: Rendered 1K rows in ${duration.toFixed(2)}ms`);
		expect(duration).toBeLessThan(500);
	});

	/**
	 * Test initial render with medium dataset
	 */
	test('renders DataGrid with 100K rows < 2000ms', async () => {
		const data = generateData(100000);

		const start = performance.now();
		render(DataGrid, {
			props: {
				data,
				columns,
				height: 600,
				rowHeight: 40
			}
		});

		const body = page.getByTestId('datagrid-body');
		await expect.element(body).toBeInTheDocument();

		const duration = performance.now() - start;
		console.log(`Browser: Rendered 100K rows in ${duration.toFixed(2)}ms`);
		expect(duration).toBeLessThan(2000);
	});

	/**
	 * CRITICAL TEST: This mimics clicking "1M" button on demo page
	 * Measures the complete flow: generate data + render DataGrid
	 */
	test('renders DataGrid with 1M rows < 5000ms (demo page simulation)', async () => {
		// Step 1: Generate data (like demo's generateData call)
		const genStart = performance.now();
		const data = generateData(1000000);
		const genDuration = performance.now() - genStart;
		console.log(`  Step 1 - Generate 1M rows: ${genDuration.toFixed(2)}ms`);

		// Step 2: Render DataGrid with all props matching demo
		const renderStart = performance.now();
		render(DataGrid, {
			props: {
				data,
				columns,
				height: 600,
				sortable: true,
				resizable: true,
				selectable: 'multiple'
			}
		});

		// Wait for body to appear (indicates data is loaded and rendered)
		const body = page.getByTestId('datagrid-body');
		await expect.element(body).toBeInTheDocument();
		const renderDuration = performance.now() - renderStart;
		console.log(`  Step 2 - Render DataGrid: ${renderDuration.toFixed(2)}ms`);

		const totalDuration = genDuration + renderDuration;
		console.log(`  TOTAL: ${totalDuration.toFixed(2)}ms`);

		// Verify grid is actually showing data
		const grid = page.getByTestId('datagrid');
		await expect.element(grid).toHaveAttribute('aria-rowcount', '1000000');

		// Should render quickly - if this fails, we've found the browser bottleneck
		expect(totalDuration).toBeLessThan(5000);
	});

	/**
	 * Test that virtualization is working correctly with 1M rows
	 */
	test('only renders ~20 visible rows from 1M row dataset', async () => {
		const data = generateData(1000000);

		render(DataGrid, {
			props: {
				data,
				columns,
				height: 600,
				rowHeight: 40,
				overscan: 5
			}
		});

		const body = page.getByTestId('datagrid-body');
		await expect.element(body).toBeInTheDocument();

		// Count rendered rows - should be small (visible + 2*overscan)
		const rows = page.getByTestId('datagrid-row');
		const rowCount = await rows.all();

		// With 600px height, 40px rows, 5 overscan: ~15 visible + 10 overscan = ~25 max
		console.log(`Rendered ${rowCount.length} rows from 1M dataset`);
		expect(rowCount.length).toBeLessThan(50);
		expect(rowCount.length).toBeGreaterThan(10);
	});

	/**
	 * Test scroll performance with 1M rows
	 */
	test('scrolling 1M row grid is responsive', async () => {
		const data = generateData(1000000);

		render(DataGrid, {
			props: {
				data,
				columns,
				height: 600,
				rowHeight: 40
			}
		});

		const body = page.getByTestId('datagrid-body');
		await expect.element(body).toBeInTheDocument();

		// Perform multiple scroll operations and measure time
		const scrollPositions = [100000, 500000, 900000, 100];
		const scrollTimes: number[] = [];

		for (const scrollTo of scrollPositions) {
			const start = performance.now();

			// Use direct element access (vitest-browser API)
			const bodyEl = body.element() as HTMLElement;
			bodyEl.scrollTop = scrollTo * 40; // pos * rowHeight

			// Wait for re-render
			await delay(50);

			const duration = performance.now() - start;
			scrollTimes.push(duration);
		}

		const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
		console.log(`Average scroll time: ${avgScrollTime.toFixed(2)}ms`);
		console.log(`Individual scroll times: ${scrollTimes.map(t => t.toFixed(1)).join('ms, ')}ms`);

		// Each scroll should complete within 200ms (well under 16ms frame budget ideally)
		for (const time of scrollTimes) {
			expect(time).toBeLessThan(200);
		}
	});

	/**
	 * Test updating data (simulates clicking different row count buttons)
	 */
	test('updating from 1K to 1M rows < 5000ms', async () => {
		// Start with small dataset
		const smallData = generateData(1000);

		const { rerender } = render(DataGrid, {
			props: {
				data: smallData,
				columns,
				height: 600
			}
		});

		const body = page.getByTestId('datagrid-body');
		await expect.element(body).toBeInTheDocument();

		// Generate large dataset
		const genStart = performance.now();
		const largeData = generateData(1000000);
		const genDuration = performance.now() - genStart;
		console.log(`  Generate 1M rows: ${genDuration.toFixed(2)}ms`);

		// Update DataGrid with new data
		const updateStart = performance.now();
		await rerender({
			data: largeData,
			columns,
			height: 600
		});

		// Wait for update to complete
		await delay(100);
		const updateDuration = performance.now() - updateStart;
		console.log(`  Rerender with 1M rows: ${updateDuration.toFixed(2)}ms`);

		const grid = page.getByTestId('datagrid');
		await expect.element(grid).toHaveAttribute('aria-rowcount', '1000000');

		const totalDuration = genDuration + updateDuration;
		console.log(`  TOTAL update: ${totalDuration.toFixed(2)}ms`);

		expect(totalDuration).toBeLessThan(5000);
	});
});
