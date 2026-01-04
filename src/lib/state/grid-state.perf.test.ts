/**
 * Performance tests for Grid State
 *
 * These tests measure the full grid state pipeline including:
 * - State creation
 * - Data updates
 * - Reactive computations
 */
import { describe, test, expect } from 'vitest';
import { createGridState } from './grid-state.svelte.js';
import type { ColumnDef } from '../types/index.js';

// Generate test data
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
const FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const EMAIL_SUFFIX = '@example.com';
const BASE_DATE = new Date(2015, 0, 1).getTime();
const DAY_MS = 86400000;

interface TestRow extends Record<string, unknown> {
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

const columns: ColumnDef<TestRow>[] = [
	{ key: 'id', header: 'ID', width: 80 },
	{ key: 'firstName', header: 'First Name', width: 120 },
	{ key: 'lastName', header: 'Last Name', width: 120 },
	{ key: 'age', header: 'Age', width: 80 },
	{ key: 'email', header: 'Email', width: 200 },
	{ key: 'department', header: 'Department', width: 120 },
	{ key: 'salary', header: 'Salary', width: 120 },
	{ key: 'startDate', header: 'Start Date', width: 120 },
	{ key: 'isActive', header: 'Active', width: 80 }
];

// Measure execution time
async function measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
	const start = performance.now();
	const result = await fn();
	const duration = performance.now() - start;
	return { result, duration };
}

describe('Grid State Performance', () => {
	describe('State Creation', () => {
		test('creates grid state with 100K rows in < 500ms', async () => {
			const data = generateData(100000);

			const start = performance.now();
			const state = createGridState({
				data,
				columns,
				rowHeight: 40,
				overscan: 5
			});
			// Use refresh() to wait for initial data fetch (same pattern as unit tests)
			await state.refresh();
			const duration = performance.now() - start;

			console.log(`Grid state created with 100K rows in ${duration.toFixed(2)}ms`);
			console.log(`  rows.length: ${state.rows.length}`);
			expect(state.rows.length).toBe(100000);
			expect(duration).toBeLessThan(500);
		});

		test('creates grid state with 1M rows in < 2000ms', async () => {
			const data = generateData(1000000);

			const start = performance.now();
			const state = createGridState({
				data,
				columns,
				rowHeight: 40,
				overscan: 5
			});
			// Use refresh() to wait for initial data fetch
			await state.refresh();
			const duration = performance.now() - start;

			console.log(`Grid state created with 1M rows in ${duration.toFixed(2)}ms`);
			console.log(`  rows.length: ${state.rows.length}`);
			expect(state.rows.length).toBe(1000000);
			expect(duration).toBeLessThan(2000);
		});
	});

	describe('Data Updates', () => {
		test('updateData with 1M rows in < 1000ms', async () => {
			// Create with small data first
			const initialData = generateData(1000);
			const state = createGridState({
				data: initialData,
				columns,
				rowHeight: 40,
				overscan: 5
			});
			await state.refresh();

			// Now update with 1M rows
			const largeData = generateData(1000000);
			const start = performance.now();
			state.updateData(largeData);
			await state.refresh();
			const duration = performance.now() - start;

			console.log(`updateData with 1M rows in ${duration.toFixed(2)}ms`);
			expect(state.rows.length).toBe(1000000);
			expect(duration).toBeLessThan(1000);
		});

		test('repeated updateData (1M rows, 3 times) remains fast', async () => {
			const state = createGridState({
				data: generateData(1000),
				columns,
				rowHeight: 40,
				overscan: 5
			});
			await state.refresh();

			const durations: number[] = [];

			for (let i = 0; i < 3; i++) {
				const data = generateData(1000000);
				const start = performance.now();
				state.updateData(data);
				await state.refresh();
				const duration = performance.now() - start;
				durations.push(duration);
				console.log(`  Update ${i + 1}: ${duration.toFixed(2)}ms`);
			}

			// Each update should be fast
			for (const duration of durations) {
				expect(duration).toBeLessThan(1000);
			}
		});
	});

	describe('Visible Rows Computation', () => {
		test('visibleRows computation with 1M rows is O(1)', async () => {
			const data = generateData(1000000);
			const state = createGridState({
				data,
				columns,
				rowHeight: 40,
				overscan: 5
			});
			await state.refresh();

			// Set container size
			state.setContainerSize(1000, 600);

			// Measure visibleRows access
			const iterations = 10000;
			const start = performance.now();
			for (let i = 0; i < iterations; i++) {
				const rows = state.visibleRows;
				void rows.length;
			}
			const duration = performance.now() - start;
			const perAccess = duration / iterations;

			console.log(`visibleRows: ${perAccess.toFixed(4)}ms per access (${iterations} iterations)`);
			// Should be extremely fast - O(1) access
			expect(perAccess).toBeLessThan(0.1); // < 0.1ms per access
		});

		test('visibleRange computation with 1M rows is O(1)', async () => {
			const data = generateData(1000000);
			const state = createGridState({
				data,
				columns,
				rowHeight: 40,
				overscan: 5
			});
			await state.refresh();

			state.setContainerSize(1000, 600);

			const iterations = 10000;
			const start = performance.now();
			for (let i = 0; i < iterations; i++) {
				const range = state.visibleRange;
				void range.startIndex;
			}
			const duration = performance.now() - start;
			const perAccess = duration / iterations;

			console.log(`visibleRange: ${perAccess.toFixed(4)}ms per access (${iterations} iterations)`);
			expect(perAccess).toBeLessThan(0.1);
		});
	});

	describe('Scroll Performance', () => {
		test('scroll updates with 1M rows are instant', async () => {
			const data = generateData(1000000);
			const state = createGridState({
				data,
				columns,
				rowHeight: 40,
				overscan: 5
			});
			await state.refresh();

			state.setContainerSize(1000, 600);

			// Simulate 100 scroll updates
			const scrollPositions = Array.from({ length: 100 }, (_, i) => i * 10000);
			const start = performance.now();
			for (const pos of scrollPositions) {
				state.setScroll(pos, 0);
				// Access visible rows to trigger computation
				const rows = state.visibleRows;
				void rows.length;
			}
			const duration = performance.now() - start;
			const perScroll = duration / scrollPositions.length;

			console.log(`Scroll update: ${perScroll.toFixed(4)}ms per scroll (100 positions)`);
			expect(perScroll).toBeLessThan(1); // < 1ms per scroll
		});
	});

	describe('Full Simulation: Demo Page Flow', () => {
		/**
		 * This test simulates the exact flow when user clicks "1M" button:
		 * 1. Generate 1M rows
		 * 2. Update grid state with new data
		 * 3. Wait for data to be ready
		 * 4. Access visible rows (simulates render)
		 */
		test('demo page 1M button click simulation < 2000ms', async () => {
			// Pre-create state with small data (simulates initial load)
			const state = createGridState({
				data: generateData(1000),
				columns,
				rowHeight: 40,
				overscan: 5
			});
			await state.refresh();
			state.setContainerSize(1000, 600);

			// Now simulate clicking "1M" button
			const totalStart = performance.now();

			// Step 1: Generate data (happens in demo page)
			const genStart = performance.now();
			const newData = generateData(1000000);
			const genDuration = performance.now() - genStart;
			console.log(`  1. Generate data: ${genDuration.toFixed(2)}ms`);

			// Step 2: Update grid state
			const updateStart = performance.now();
			state.updateData(newData);
			const updateDuration = performance.now() - updateStart;
			console.log(`  2. updateData call: ${updateDuration.toFixed(2)}ms`);

			// Step 3: Wait for data fetch
			const fetchStart = performance.now();
			await state.refresh();
			const fetchDuration = performance.now() - fetchStart;
			console.log(`  3. refresh: ${fetchDuration.toFixed(2)}ms`);

			// Step 4: Access visible rows (simulates render)
			const renderStart = performance.now();
			const visibleRows = state.visibleRows;
			const totalHeight = state.totalHeight;
			const renderDuration = performance.now() - renderStart;
			console.log(`  4. Access visible state: ${renderDuration.toFixed(2)}ms`);

			const totalDuration = performance.now() - totalStart;
			console.log(`  TOTAL: ${totalDuration.toFixed(2)}ms`);

			// Verify correctness
			expect(state.rows.length).toBe(1000000);
			expect(visibleRows.length).toBeGreaterThan(0);
			expect(visibleRows.length).toBeLessThan(50); // Should only render ~15-20 visible rows
			expect(totalHeight).toBe(1000000 * 40);

			// Performance assertion
			expect(totalDuration).toBeLessThan(2000);
		});
	});
});
