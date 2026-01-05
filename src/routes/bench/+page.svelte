<script lang="ts">
	import { DataGrid, createColumnHelper } from '$lib';
	import { tick } from 'svelte';
	import { BENCH_ENABLED, mark, measure, clear, clearAll, startTimer, summarize, type BenchmarkStats } from '$lib/bench';

	/**
	 * Benchmark Harness Page
	 *
	 * This page provides a controlled environment for running repeatable performance benchmarks.
	 * It exposes functions to the window object that Playwright can call to:
	 * - Run mount benchmarks (multiple iterations)
	 * - Run update benchmarks (data changes)
	 * - Run scroll benchmarks
	 * - Run sort benchmarks
	 * - Run filter benchmarks
	 *
	 * All benchmarks return raw sample arrays for percentile analysis.
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
	const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

	// =========================================================================
	// Benchmark Functions (exposed to Playwright via window.__bench*)
	// =========================================================================

	interface BenchmarkResult {
		samples: number[];
		stats: BenchmarkStats;
	}

	/**
	 * Benchmark: Data generation
	 * Measures how long it takes to generate N rows of data
	 */
	async function benchDataGeneration(rowCount: number, iterations: number = 30): Promise<BenchmarkResult> {
		status = `Running data generation benchmark (${rowCount} rows, ${iterations} iterations)...`;
		const samples: number[] = [];

		// Warm-up (5 iterations, discarded)
		for (let i = 0; i < 5; i++) {
			generateData(rowCount);
		}

		// Benchmark
		for (let i = 0; i < iterations; i++) {
			const timer = startTimer();
			generateData(rowCount);
			samples.push(timer());
		}

		status = `Data generation complete`;
		return { samples, stats: summarize(samples) };
	}

	/**
	 * Benchmark: Initial render
	 * Measures time from data assignment to DOM rendered
	 */
	async function benchInitialRender(rowCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running initial render benchmark (${rowCount} rows, ${iterations} iterations)...`;
		const samples: number[] = [];

		// Pre-generate data once
		const testData = generateData(rowCount);

		for (let i = 0; i < iterations; i++) {
			// Hide grid
			show = false;
			data = [];
			await tick();
			await nextFrame();

			// Show grid with data and measure
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

	/**
	 * Benchmark: Data update
	 * Measures time to update from one dataset to another
	 */
	async function benchDataUpdate(fromCount: number, toCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running data update benchmark (${fromCount} -> ${toCount} rows, ${iterations} iterations)...`;
		const samples: number[] = [];

		const fromData = generateData(fromCount);
		const toData = generateData(toCount);

		for (let i = 0; i < iterations; i++) {
			// Reset to initial state
			data = fromData;
			await tick();
			await nextFrame();

			// Measure update
			const timer = startTimer();
			data = toData;
			await tick();
			await nextFrame();
			samples.push(timer());
		}

		status = `Data update complete`;
		return { samples, stats: summarize(samples) };
	}

	/**
	 * Benchmark: Scroll performance
	 * Measures time for scroll updates across many positions
	 */
	async function benchScroll(rowCount: number, scrollPositions: number = 100): Promise<BenchmarkResult> {
		status = `Running scroll benchmark (${rowCount} rows, ${scrollPositions} positions)...`;
		const samples: number[] = [];

		// Setup
		data = generateData(rowCount);
		await tick();
		await nextFrame();

		// Get the scroll container
		const body = document.querySelector('[data-testid="datagrid-body"]') as HTMLElement;
		if (!body) throw new Error('DataGrid body not found');

		const maxScroll = rowCount * rowHeight - height;

		for (let i = 0; i < scrollPositions; i++) {
			// Random scroll position
			const scrollTop = Math.floor(Math.random() * maxScroll);

			const timer = startTimer();
			body.scrollTop = scrollTop;
			await nextFrame();
			samples.push(timer());
		}

		status = `Scroll benchmark complete`;
		return { samples, stats: summarize(samples) };
	}

	/**
	 * Benchmark: Full demo simulation
	 * Measures the complete flow like clicking a row count button
	 */
	async function benchFullFlow(rowCount: number, iterations: number = 10): Promise<BenchmarkResult> {
		status = `Running full flow benchmark (${rowCount} rows, ${iterations} iterations)...`;
		const samples: number[] = [];

		for (let i = 0; i < iterations; i++) {
			// Reset
			data = [];
			await tick();
			await nextFrame();

			// Full flow: generate + render
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

	/**
	 * Benchmark: Sorting performance
	 * Measures in-memory sort time (not DataGrid sort, just array sort)
	 */
	async function benchSort(rowCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running sort benchmark (${rowCount} rows, ${iterations} iterations)...`;
		const samples: number[] = [];

		// Pre-generate data
		const testData = generateData(rowCount);

		for (let i = 0; i < iterations; i++) {
			// Copy array and sort
			const timer = startTimer();
			const copy = [...testData];
			copy.sort((a, b) => a.salary - b.salary);
			samples.push(timer());
		}

		status = `Sort complete`;
		return { samples, stats: summarize(samples) };
	}

	/**
	 * Benchmark: Filtering performance
	 * Measures in-memory filter time
	 */
	async function benchFilter(rowCount: number, iterations: number = 20): Promise<BenchmarkResult> {
		status = `Running filter benchmark (${rowCount} rows, ${iterations} iterations)...`;
		const samples: number[] = [];

		// Pre-generate data
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
	// Expose benchmark functions to Playwright
	// =========================================================================

	if (typeof window !== 'undefined') {
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
		<p>This page is used by Playwright for automated performance benchmarks.</p>
	</header>

	<div class="status">
		<strong>Status:</strong> {status}
		<br />
		<strong>BENCH_ENABLED:</strong> {BENCH_ENABLED}
	</div>

	<div class="grid-container">
		{#if show}
			<DataGrid
				{data}
				{columns}
				{height}
				{rowHeight}
				selectable="multiple"
				sortable
				resizable
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
	}

	.grid-container {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}
</style>
