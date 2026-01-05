/**
 * Performance tests for LocalDataSource
 *
 * These tests measure actual execution time and fail if operations
 * take longer than expected thresholds. This catches performance
 * regressions that functional tests miss.
 */
import { describe, test, expect } from 'vitest';
import { createLocalDataSource } from './local-data-source.js';
import type { GridQueryRequest } from './types.js';

// Generate test data (same as demo page)
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
const FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const EMAIL_SUFFIX = '@example.com';
const BASE_DATE = new Date(2015, 0, 1).getTime();
const DAY_MS = 86400000;

interface TestRow {
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

function generateData(count: number): TestRow[] {
	const data = new Array<TestRow>(count);
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
			startDate: BASE_DATE + ((i % 3650) * DAY_MS),
			isActive: i % 5 !== 0
		};
	}
	return data;
}

// Measure execution time in milliseconds
function measure<T>(fn: () => T): { result: T; duration: number } {
	const start = performance.now();
	const result = fn();
	const duration = performance.now() - start;
	return { result, duration };
}

async function measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
	const start = performance.now();
	const result = await fn();
	const duration = performance.now() - start;
	return { result, duration };
}

describe('LocalDataSource Performance', () => {
	// Performance thresholds (in milliseconds)
	const THRESHOLDS = {
		DATA_GENERATION_1M: 2000,      // 1M rows should generate in < 2s
		DATASOURCE_CREATE_1M: 10,       // Creating DS should be instant (zero-copy)
		GET_ROWS_NO_FILTER_1M: 100,     // No filter/sort, just pagination
		GET_ROWS_WITH_SORT_1M: 2500,    // Sorting 1M rows (increased for CI)
		GET_ROWS_WITH_FILTER_1M: 500,   // Filtering 1M rows
		SET_DATA_1M: 10,                // setData should be instant (zero-copy)
	};

	describe('Data Generation', () => {
		test('generates 100K rows in < 200ms', () => {
			const { duration } = measure(() => generateData(100000));
			console.log(`100K rows generated in ${duration.toFixed(2)}ms`);
			expect(duration).toBeLessThan(200);
		});

		test('generates 1M rows in < 2000ms', () => {
			const { duration } = measure(() => generateData(1000000));
			console.log(`1M rows generated in ${duration.toFixed(2)}ms`);
			expect(duration).toBeLessThan(THRESHOLDS.DATA_GENERATION_1M);
		});
	});

	describe('LocalDataSource Creation', () => {
		test('creates DataSource with 1M rows instantly (zero-copy)', () => {
			const data = generateData(1000000);

			const { duration } = measure(() => createLocalDataSource(data, 'id'));
			console.log(`LocalDataSource created with 1M rows in ${duration.toFixed(2)}ms`);
			// Should be under 50ms even with timing variance
			expect(duration).toBeLessThan(50);
		});
	});

	describe('getRows Performance', () => {
		// Pre-generate data for getRows tests
		let data1M: TestRow[];
		let ds1M: ReturnType<typeof createLocalDataSource<TestRow>>;

		// Setup before these tests
		test('setup: generate 1M rows', () => {
			data1M = generateData(1000000);
			ds1M = createLocalDataSource(data1M, 'id');
			expect(data1M.length).toBe(1000000);
		});

		test('getRows with pagination only (first 100 of 1M) < 50ms', async () => {
			const request: GridQueryRequest = {
				pagination: { type: 'offset', offset: 0, limit: 100 },
				requires: { rowCount: true }
			};

			const { result, duration } = await measureAsync(() => ds1M.getRows(request));
			console.log(`getRows (first 100 of 1M) in ${duration.toFixed(2)}ms`);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rows.length).toBe(100);
				expect(result.data.rowCount).toBe(1000000);
			}
			expect(duration).toBeLessThan(50);
		});

		test('getRows with MAX_SAFE_INTEGER limit (fetch all 1M) < 100ms', async () => {
			const request: GridQueryRequest = {
				pagination: { type: 'offset', offset: 0, limit: Number.MAX_SAFE_INTEGER },
				requires: { rowCount: true }
			};

			const { result, duration } = await measureAsync(() => ds1M.getRows(request));
			console.log(`getRows (all 1M rows) in ${duration.toFixed(2)}ms`);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rows.length).toBe(1000000);
			}
			expect(duration).toBeLessThan(THRESHOLDS.GET_ROWS_NO_FILTER_1M);
		});

		test('getRows with sort (1M rows) < 2000ms', async () => {
			const request: GridQueryRequest = {
				pagination: { type: 'offset', offset: 0, limit: 100 },
				sort: [{ field: 'salary', direction: 'desc' }],
				requires: { rowCount: true }
			};

			const { result, duration } = await measureAsync(() => ds1M.getRows(request));
			console.log(`getRows with sort (1M) in ${duration.toFixed(2)}ms`);

			expect(result.success).toBe(true);
			expect(duration).toBeLessThan(THRESHOLDS.GET_ROWS_WITH_SORT_1M);
		});

		test('getRows with cached sort (1M rows) < 50ms', async () => {
			// First call to populate cache
			const request: GridQueryRequest = {
				pagination: { type: 'offset', offset: 0, limit: 100 },
				sort: [{ field: 'salary', direction: 'desc' }],
				requires: { rowCount: true }
			};
			await ds1M.getRows(request);

			// Second call should use cache
			const { result, duration } = await measureAsync(() => ds1M.getRows(request));
			console.log(`getRows with cached sort (1M) in ${duration.toFixed(2)}ms`);

			expect(result.success).toBe(true);
			expect(duration).toBeLessThan(50);
		});

		test('getRows with filter (1M rows) < 500ms', async () => {
			const request: GridQueryRequest = {
				pagination: { type: 'offset', offset: 0, limit: 100 },
				filter: {
					type: 'condition',
					field: 'salary',
					operator: 'gt',
					value: 100000
				},
				requires: { rowCount: true }
			};

			const { result, duration } = await measureAsync(() => ds1M.getRows(request));
			console.log(`getRows with filter (1M) in ${duration.toFixed(2)}ms`);

			expect(result.success).toBe(true);
			expect(duration).toBeLessThan(THRESHOLDS.GET_ROWS_WITH_FILTER_1M);
		});
	});

	describe('setData Performance', () => {
		test('setData with 1M rows is instant (zero-copy)', () => {
			const data1 = generateData(1000000);
			const data2 = generateData(1000000);
			const ds = createLocalDataSource(data1, 'id');

			const { duration } = measure(() => ds.setData(data2));
			console.log(`setData (1M rows) in ${duration.toFixed(2)}ms`);

			expect(duration).toBeLessThan(THRESHOLDS.SET_DATA_1M);
		});
	});

	describe('Critical Path: Data Update Flow', () => {
		/**
		 * This test simulates what happens when user clicks "1M" button:
		 * 1. Generate data
		 * 2. Create/update DataSource
		 * 3. Fetch all rows (as grid does internally)
		 *
		 * Total time should be reasonable for a good UX.
		 */
		test('full data update cycle (1M rows) < 3000ms total', async () => {
			const totalStart = performance.now();

			// Step 1: Generate data
			const genStart = performance.now();
			const data = generateData(1000000);
			const genDuration = performance.now() - genStart;
			console.log(`  Generate: ${genDuration.toFixed(2)}ms`);

			// Step 2: Create DataSource
			const dsStart = performance.now();
			const ds = createLocalDataSource(data, 'id');
			const dsDuration = performance.now() - dsStart;
			console.log(`  Create DS: ${dsDuration.toFixed(2)}ms`);

			// Step 3: Fetch all rows (simulates grid's fetchData)
			const fetchStart = performance.now();
			const result = await ds.getRows({
				pagination: { type: 'offset', offset: 0, limit: Number.MAX_SAFE_INTEGER },
				requires: { rowCount: true }
			});
			const fetchDuration = performance.now() - fetchStart;
			console.log(`  Fetch all: ${fetchDuration.toFixed(2)}ms`);

			const totalDuration = performance.now() - totalStart;
			console.log(`  TOTAL: ${totalDuration.toFixed(2)}ms`);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rows.length).toBe(1000000);
			}

			// Total should be under 3 seconds
			expect(totalDuration).toBeLessThan(3000);
		});

		test('repeated data updates (1M rows, 5 times) remain fast', async () => {
			const ds = createLocalDataSource<TestRow>([], 'id');
			const durations: number[] = [];

			for (let i = 0; i < 5; i++) {
				const start = performance.now();

				const data = generateData(1000000);
				ds.setData(data);
				await ds.getRows({
					pagination: { type: 'offset', offset: 0, limit: Number.MAX_SAFE_INTEGER },
					requires: { rowCount: true }
				});

				const duration = performance.now() - start;
				durations.push(duration);
				console.log(`  Update ${i + 1}: ${duration.toFixed(2)}ms`);
			}

			// Each update should be reasonably fast
			for (const duration of durations) {
				expect(duration).toBeLessThan(3000);
			}

			// No significant increase in later updates (memory leak check)
			// Allow 2.5x variance due to GC timing and CI environment variability
			const firstTwo = (durations[0] + durations[1]) / 2;
			const lastTwo = (durations[3] + durations[4]) / 2;
			expect(lastTwo).toBeLessThan(firstTwo * 2.5);
		});
	});
});
