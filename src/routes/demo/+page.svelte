<script lang="ts">
	import { DataGrid, createColumnHelper } from '$lib';

	// Sample data type - must satisfy Record<string, unknown> for DataGrid
	interface Person extends Record<string, unknown> {
		id: number;
		firstName: string;
		lastName: string;
		age: number;
		email: string;
		department: string;
		salary: number;
		startDate: number; // Use timestamp instead of Date for performance
		isActive: boolean;
	}

	// Pre-computed lookup tables for ultra-fast data generation
	const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
	const FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'];
	const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

	// Pre-compute email prefixes for faster string ops
	const EMAIL_SUFFIX = '@example.com';

	// Pre-compute base dates as timestamps (avoid Date object creation in loop)
	const BASE_TIMESTAMP = new Date(2015, 0, 1).getTime();
	const DAY_MS = 86400000;

	// Fast date formatter - avoids creating Date objects for each cell
	// Pre-compute the base date components
	const BASE_DATE = new Date(2015, 0, 1);
	const BASE_YEAR = BASE_DATE.getFullYear();
	const DAYS_IN_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

	function formatTimestamp(timestamp: number): string {
		// Calculate days since base date
		const daysSinceBase = Math.floor((timestamp - BASE_TIMESTAMP) / DAY_MS);

		// Quick calculation for year/month/day (simplified, assumes 365-day years)
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

	// Fast currency formatter - manual formatting to avoid toLocaleString overhead
	function formatCurrency(value: number): string {
		// Simple comma formatting without locale overhead
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

	/**
	 * Ultra-fast data generation optimized for 10M+ rows.
	 * Uses:
	 * - Pre-allocated array
	 * - Index-based lookups (no modulo for small arrays)
	 * - Timestamps instead of Date objects
	 * - Simple deterministic patterns instead of Math.random()
	 * - Minimal string allocations
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
				// Deterministic salary pattern instead of Math.random()
				salary: 50000 + ((i * 7919) % 100000),
				// Timestamp instead of Date object
				startDate: BASE_TIMESTAMP + ((i % 3650) * DAY_MS),
				isActive: i % 5 !== 0
			};
		}

		return data;
	}

	// Column helper for type safety
	const columnHelper = createColumnHelper<Person>();

	// Column definitions
	const columns = [
		columnHelper.accessor('id', {
			header: 'ID',
			width: 80,
			align: 'center'
		}),
		columnHelper.accessor('firstName', {
			header: 'First Name',
			width: 120
		}),
		columnHelper.accessor('lastName', {
			header: 'Last Name',
			width: 120
		}),
		columnHelper.accessor('age', {
			header: 'Age',
			width: 80,
			align: 'right'
		}),
		columnHelper.accessor('email', {
			header: 'Email',
			width: 200
		}),
		columnHelper.accessor('department', {
			header: 'Department',
			width: 120
		}),
		columnHelper.accessor('salary', {
			header: 'Salary',
			width: 120,
			align: 'right',
			formatter: formatCurrency
		}),
		columnHelper.accessor('startDate', {
			header: 'Start Date',
			width: 120,
			// Fast timestamp formatter - no Date object creation
			formatter: formatTimestamp
		}),
		columnHelper.accessor('isActive', {
			header: 'Active',
			width: 80,
			align: 'center'
		})
	];

	// State
	let rowCount = $state(1000);
	let data = $state(generateData(rowCount));
	let selectedCount = $state(0);
	let isGenerating = $state(false);

	function handleSelectionChange(event: { selected: Set<string | number> }) {
		selectedCount = event.selected.size;
	}

	function loadData(count: number) {
		if (isGenerating) return;
		isGenerating = true;
		rowCount = count;

		// Performance instrumentation - helps diagnose slowness
		console.log(`\n⏱️ Starting load of ${count.toLocaleString()} rows...`);
		const totalStart = performance.now();

		// Use setTimeout to let browser paint the "Generating..." message first
		// then do fast sync generation in one go
		setTimeout(() => {
			// Step 1: Generate data
			const genStart = performance.now();
			const newData = generateData(count);
			const genDuration = performance.now() - genStart;
			console.log(`  1. Generate data: ${genDuration.toFixed(0)}ms`);

			// Step 2: Assign to state (triggers Svelte reactivity)
			const assignStart = performance.now();
			data = newData;
			const assignDuration = performance.now() - assignStart;
			console.log(`  2. Assign to state: ${assignDuration.toFixed(0)}ms`);

			isGenerating = false;

			// Step 3: Measure total (including render in next frame)
			requestAnimationFrame(() => {
				const totalDuration = performance.now() - totalStart;
				console.log(`  3. Total (incl render): ${totalDuration.toFixed(0)}ms`);
				console.log(`✅ Loaded ${count.toLocaleString()} rows\n`);
			});
		}, 0);
	}
</script>

<svelte:head>
	<title>Svelte DataGrid Demo</title>
</svelte:head>

<div class="demo">
	<header>
		<h1>Svelte DataGrid</h1>
		<p>A powerful, high-performance data grid component for Svelte 5</p>
	</header>

	<div class="controls">
		<span class="label">Rows:</span>
		<div class="presets">
			<button onclick={() => loadData(1000)} disabled={isGenerating}>1K</button>
			<button onclick={() => loadData(10000)} disabled={isGenerating}>10K</button>
			<button onclick={() => loadData(100000)} disabled={isGenerating}>100K</button>
			<button onclick={() => loadData(1000000)} disabled={isGenerating}>1M</button>
			<button onclick={() => loadData(10000000)} disabled={isGenerating}>10M</button>
		</div>
		<span class="info">
			{#if isGenerating}
				Generating {rowCount.toLocaleString()} rows...
			{:else}
				{data.length.toLocaleString()} rows | {selectedCount} selected
			{/if}
		</span>
	</div>

	<div class="grid-container">
		<DataGrid
			{data}
			{columns}
			height={600}
			selectable="multiple"
			sortable
			resizable
			onselectionchange={handleSelectionChange}
		/>
	</div>

	<section class="features">
		<h2>Features</h2>
		<ul>
			<li>✓ Virtual scrolling for large datasets (tested with 10M+ rows)</li>
			<li>✓ Column sorting (click header, shift+click for multi-sort)</li>
			<li>✓ Column resizing (drag column edges)</li>
			<li>✓ Row selection (single/multi with ctrl/shift)</li>
			<li>✓ Customizable column widths and alignment</li>
			<li>✓ Value formatters</li>
			<li>✓ Empty, loading, and error states</li>
			<li>✓ Full TypeScript support</li>
		</ul>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		background: #f5f5f5;
	}

	.demo {
		max-width: 1400px;
		margin: 0 auto;
		padding: 24px;
	}

	header {
		margin-bottom: 24px;
	}

	header h1 {
		margin: 0 0 8px 0;
		font-size: 2rem;
		color: #1976d2;
	}

	header p {
		margin: 0;
		color: #666;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
		padding: 12px 16px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.controls .label {
		font-weight: 500;
	}

	.presets {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.presets button {
		padding: 4px 10px;
		border: 1px solid #1976d2;
		border-radius: 4px;
		background: white;
		color: #1976d2;
		font-size: 13px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.presets button:hover:not(:disabled) {
		background: #1976d2;
		color: white;
	}

	.presets button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.info {
		color: #666;
		font-size: 14px;
		margin-left: auto;
	}

	.grid-container {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.features {
		margin-top: 32px;
		padding: 24px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.features h2 {
		margin: 0 0 16px 0;
		font-size: 1.25rem;
	}

	.features ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 8px;
	}

	.features li {
		padding: 8px 0;
		color: #333;
	}
</style>
