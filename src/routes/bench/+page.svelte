<script lang="ts">
	import { DataGrid, createColumnHelper } from '$lib';
	import { tick } from 'svelte';
	import { BENCH_ENABLED, startTimer, summarize, type BenchmarkStats } from '$lib/bench';

	/**
	 * Benchmark Harness Page
	 *
	 * This page provides a controlled environment for running repeatable performance benchmarks.
	 * It supports both programmatic benchmarks (via window.__bench*) and real user interaction
	 * benchmarks driven by Playwright.
	 *
	 * For user interaction benchmarks, Playwright will:
	 * 1. Call setup functions to prepare the grid state
	 * 2. Perform real clicks/types/drags
	 * 3. Wait for DOM changes to complete
	 * 4. Measure the elapsed time
	 */

	// Person data type (same as demo)
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

	// Pre-computed lookup tables
	const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
	const FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'];
	const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
	const EMAIL_SUFFIX = '@example.com';
	const BASE_TIMESTAMP = new Date(2015, 0, 1).getTime();
	const DAY_MS = 86400000;

	// Fast formatters (same as demo)
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

	// Column definitions
	const columnHelper = createColumnHelper<Person>();
	const columns = [
		columnHelper.accessor('id', { header: 'ID', width: 80, align: 'center' }),
		columnHelper.accessor('firstName', { header: 'First Name', width: 120 }),
		columnHelper.accessor('lastName', { header: 'Last Name', width: 120 }),
		columnHelper.accessor('age', { header: 'Age', width: 80, align: 'right' }),
		columnHelper.accessor('email', { header: 'Email', width: 200 }),
		columnHelper.accessor('department', { header: 'Department', width: 120 }),
		columnHelper.accessor('salary', { header: 'Salary', width: 120, align: 'right', formatter: formatCurrency }),
		columnHelper.accessor('startDate', { header: 'Start Date', width: 120, formatter: formatTimestamp }),
		columnHelper.accessor('isActive', { header: 'Active', width: 80, align: 'center' })
	];

	// State
	let show = $state(true);
	let data = $state<Person[]>([]);
	let status = $state('Ready');
	let height = $state(600);
	let rowHeight = $state(40);

	// Helper to wait for next frame
	const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

	// =========================================================================
	// Setup Functions (for Playwright to prepare scenarios)
	// =========================================================================

	/**
	 * Setup grid with specified row count
	 */
	async function setup(rowCount: number): Promise<void> {
		status = `Setting up ${rowCount} rows...`;
		data = generateData(rowCount);
		await tick();
		await nextFrame();
		status = `Ready with ${rowCount} rows`;
	}

	/**
	 * Reset grid to clean state (remount)
	 */
	async function reset(): Promise<void> {
		show = false;
		data = [];
		await tick();
		await nextFrame();
		show = true;
		await tick();
		await nextFrame();
		status = 'Reset complete';
	}

	// =========================================================================
	// Query Functions (for Playwright to verify state)
	// =========================================================================

	/**
	 * Get current row count displayed
	 */
	function getRowCount(): number {
		const grid = document.querySelector('[data-testid="datagrid"]');
		return grid ? parseInt(grid.getAttribute('aria-rowcount') || '0', 10) : 0;
	}

	/**
	 * Get first visible row's data for a specific column
	 */
	function getFirstVisibleCellText(columnKey: string): string | null {
		const firstRow = document.querySelector('[data-testid="datagrid-row"][data-row-index="0"]');
		if (!firstRow) return null;
		const cell = firstRow.querySelector(`[data-column-key="${columnKey}"]`);
		return cell?.textContent?.trim() || null;
	}

	/**
	 * Get sort direction for a column
	 */
	function getSortDirection(columnKey: string): string | null {
		const header = document.querySelector(`[data-testid="datagrid-header-cell"][data-column-key="${columnKey}"]`);
		return header?.getAttribute('aria-sort') || null;
	}

	/**
	 * Get count of selected rows
	 */
	function getSelectedRowCount(): number {
		return document.querySelectorAll('[data-testid="datagrid-row"][aria-selected="true"]').length;
	}

	/**
	 * Check if a specific row is selected
	 */
	function isRowSelected(rowIndex: number): boolean {
		const row = document.querySelector(`[data-testid="datagrid-row"][data-row-index="${rowIndex}"]`);
		return row?.getAttribute('aria-selected') === 'true';
	}

	/**
	 * Get the search input value
	 */
	function getSearchValue(): string {
		const input = document.querySelector('[data-testid="datagrid-search"] input') as HTMLInputElement;
		return input?.value || '';
	}

	// =========================================================================
	// Programmatic Benchmark Functions
	// =========================================================================

	interface BenchmarkResult {
		samples: number[];
		stats: BenchmarkStats;
	}

	async function benchDataGeneration(rowCount: number, iterations: number = 30): Promise<BenchmarkResult> {
		status = `Running data generation benchmark...`;
		const samples: number[] = [];
		for (let i = 0; i < 5; i++) generateData(rowCount);
		for (let i = 0; i < iterations; i++) {
			const timer = startTimer();
			generateData(rowCount);
			samples.push(timer());
		}
		status = `Data generation complete`;
		return { samples, stats: summarize(samples) };
	}

	async function benchInitialRender(rowCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running initial render benchmark...`;
		const samples: number[] = [];
		const testData = generateData(rowCount);

		for (let i = 0; i < iterations; i++) {
			show = false;
			data = [];
			await tick();
			await nextFrame();

			const timer = startTimer();
			show = true;
			data = testData;
			await tick();
			await nextFrame();
			samples.push(timer());
		}
		status = `Initial render complete`;
		return { samples, stats: summarize(samples) };
	}

	async function benchDataUpdate(fromCount: number, toCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running data update benchmark...`;
		const samples: number[] = [];
		const fromData = generateData(fromCount);
		const toData = generateData(toCount);

		for (let i = 0; i < iterations; i++) {
			data = fromData;
			await tick();
			await nextFrame();

			const timer = startTimer();
			data = toData;
			await tick();
			await nextFrame();
			samples.push(timer());
		}
		status = `Data update complete`;
		return { samples, stats: summarize(samples) };
	}

	async function benchScroll(rowCount: number, scrollPositions: number = 100): Promise<BenchmarkResult> {
		status = `Running scroll benchmark...`;
		const samples: number[] = [];

		data = generateData(rowCount);
		await tick();
		await nextFrame();

		const body = document.querySelector('[data-testid="datagrid-body"]') as HTMLElement;
		if (!body) throw new Error('DataGrid body not found');

		const maxScroll = rowCount * rowHeight - height;

		for (let i = 0; i < scrollPositions; i++) {
			const scrollTop = Math.floor(Math.random() * maxScroll);
			const timer = startTimer();
			body.scrollTop = scrollTop;
			await nextFrame();
			samples.push(timer());
		}
		status = `Scroll benchmark complete`;
		return { samples, stats: summarize(samples) };
	}

	async function benchFullFlow(rowCount: number, iterations: number = 10): Promise<BenchmarkResult> {
		status = `Running full flow benchmark...`;
		const samples: number[] = [];

		for (let i = 0; i < iterations; i++) {
			data = [];
			await tick();
			await nextFrame();

			const timer = startTimer();
			const newData = generateData(rowCount);
			data = newData;
			await tick();
			await nextFrame();
			samples.push(timer());
		}
		status = `Full flow complete`;
		return { samples, stats: summarize(samples) };
	}

	// Legacy JS-only benchmarks (for comparison)
	async function benchSort(rowCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running JS sort benchmark...`;
		const samples: number[] = [];
		const testData = generateData(rowCount);

		for (let i = 0; i < iterations; i++) {
			const timer = startTimer();
			const copy = [...testData];
			copy.sort((a, b) => a.salary - b.salary);
			samples.push(timer());
		}
		status = `Sort complete`;
		return { samples, stats: summarize(samples) };
	}

	async function benchFilter(rowCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running JS filter benchmark...`;
		const samples: number[] = [];
		const testData = generateData(rowCount);

		for (let i = 0; i < iterations; i++) {
			const timer = startTimer();
			testData.filter(row => row.salary > 100000);
			samples.push(timer());
		}
		status = `Filter complete`;
		return { samples, stats: summarize(samples) };
	}

	// =========================================================================
	// Expose to Playwright
	// =========================================================================

	if (typeof window !== 'undefined') {
		(window as any).__bench = {
			// Ready flag
			ready: true,

			// Setup functions
			setup,
			reset,
			generateData,

			// Query functions (for verifying results)
			getRowCount,
			getFirstVisibleCellText,
			getSortDirection,
			getSelectedRowCount,
			isRowSelected,
			getSearchValue,

			// Programmatic benchmarks
			benchDataGeneration,
			benchInitialRender,
			benchDataUpdate,
			benchScroll,
			benchFullFlow,
			benchSort,
			benchFilter
		};

		// Legacy support for existing tests
		(window as any).__benchReady = true;
		(window as any).__benchDataGeneration = benchDataGeneration;
		(window as any).__benchInitialRender = benchInitialRender;
		(window as any).__benchDataUpdate = benchDataUpdate;
		(window as any).__benchScroll = benchScroll;
		(window as any).__benchFullFlow = benchFullFlow;
		(window as any).__benchSort = benchSort;
		(window as any).__benchFilter = benchFilter;
	}
</script>

<svelte:head>
	<title>DataGrid Benchmark Harness</title>
</svelte:head>

<div class="harness">
	<header>
		<h1>DataGrid Benchmark Harness</h1>
		<p>For automated performance benchmarks via Playwright</p>
	</header>

	<div class="status" data-testid="bench-status">
		<strong>Status:</strong> {status}
		<span class="separator">|</span>
		<strong>Rows:</strong> {data.length.toLocaleString()}
		<span class="separator">|</span>
		<strong>BENCH:</strong> {BENCH_ENABLED}
	</div>

	<div class="grid-container">
		{#if show}
			<DataGrid
				{data}
				{columns}
				{height}
				{rowHeight}
				searchable
				selectable="multiple"
				sortable
				resizable
				reorderable
			/>
		{/if}
	</div>
</div>

<style>
	.harness {
		max-width: 1400px;
		margin: 0 auto;
		padding: 24px;
	}

	header {
		margin-bottom: 24px;
	}

	header h1 {
		margin: 0 0 8px 0;
		font-size: 1.5rem;
	}

	header p {
		margin: 0;
		color: #666;
	}

	.status {
		padding: 12px 16px;
		background: #e3f2fd;
		border-radius: 8px;
		margin-bottom: 16px;
		font-family: monospace;
		font-size: 13px;
	}

	.separator {
		color: #999;
		margin: 0 8px;
	}

	.grid-container {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}
</style>
