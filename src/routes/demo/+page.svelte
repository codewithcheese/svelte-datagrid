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
		startDate: Date;
		isActive: boolean;
	}

	// Generate sample data
	function generateData(count: number): Person[] {
		const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
		const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'];
		const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

		return Array.from({ length: count }, (_, i) => ({
			id: i + 1,
			firstName: firstNames[i % firstNames.length],
			lastName: lastNames[Math.floor(i / firstNames.length) % lastNames.length],
			age: 22 + (i % 43),
			email: `user${i + 1}@example.com`,
			department: departments[i % departments.length],
			salary: 50000 + Math.floor(Math.random() * 100000),
			startDate: new Date(2015 + (i % 10), i % 12, (i % 28) + 1),
			isActive: i % 5 !== 0
		}));
	}

	// Column helper for type safety
	const columnHelper = createColumnHelper<Person>();

	// Column definitions - use 'as const' satisfies to maintain type inference
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
			formatter: (value) => `$${value.toLocaleString()}`
		}),
		columnHelper.accessor('startDate', {
			header: 'Start Date',
			width: 120,
			formatter: (value) => value.toLocaleDateString()
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

	function handleRowCountChange(event: Event) {
		const input = event.target as HTMLInputElement;
		rowCount = parseInt(input.value) || 1000;
		data = generateData(rowCount);
	}

	function handleSelectionChange(event: { selected: Set<string | number> }) {
		selectedCount = event.selected.size;
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
		<label>
			Row Count:
			<input
				type="number"
				value={rowCount}
				onchange={handleRowCountChange}
				min="10"
				max="1000000"
			/>
		</label>
		<span class="info">
			Showing {data.length.toLocaleString()} rows | {selectedCount} selected
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
			<li>✓ Virtual scrolling for large datasets</li>
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
		gap: 24px;
		margin-bottom: 16px;
		padding: 12px 16px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.controls label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 500;
	}

	.controls input {
		width: 120px;
		padding: 6px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
	}

	.info {
		color: #666;
		font-size: 14px;
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
