/**
 * User Interaction Performance Benchmarks
 *
 * These tests measure REAL user interactions - actual clicks, typing, and keyboard
 * events - not just JavaScript operations.
 *
 * Each test:
 * 1. Sets up the grid with data
 * 2. Performs a real user action (click, type, etc.)
 * 3. Waits for the visual result
 * 4. Measures the elapsed time
 *
 * Performance Targets (from CLAUDE.md):
 * - UI updates: <16ms (60fps frame budget)
 * - Sort 100K rows: <100ms
 * - Filter 100K rows: <50ms
 * - Scroll frame: <5ms
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Types
interface BenchmarkStats {
	n: number;
	min: number;
	max: number;
	mean: number;
	median: number;
	p75: number;
	p95: number;
	p99: number;
	stdDev: number;
}

// Stats calculation (same as in stats.ts)
function summarize(samples: number[]): BenchmarkStats {
	if (samples.length === 0) {
		return { n: 0, min: 0, max: 0, mean: 0, median: 0, p75: 0, p95: 0, p99: 0, stdDev: 0 };
	}

	const sorted = [...samples].sort((a, b) => a - b);
	const n = sorted.length;
	const min = sorted[0];
	const max = sorted[n - 1];
	const sum = sorted.reduce((acc, val) => acc + val, 0);
	const mean = sum / n;

	const squaredDiffs = sorted.map((val) => Math.pow(val - mean, 2));
	const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / n;
	const stdDev = Math.sqrt(avgSquaredDiff);

	const percentile = (p: number) => {
		const idx = Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1));
		return sorted[idx];
	};

	return {
		n,
		min,
		max,
		mean,
		median: percentile(0.5),
		p75: percentile(0.75),
		p95: percentile(0.95),
		p99: percentile(0.99),
		stdDev
	};
}

// Output paths
const OUTPUT_DIR = path.join(__dirname, '../bench-results');
const RESULTS_PATH = path.join(OUTPUT_DIR, 'interactions.json');

function saveResult(name: string, stats: BenchmarkStats) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	let results: Record<string, BenchmarkStats> = {};
	try {
		if (fs.existsSync(RESULTS_PATH)) {
			results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
		}
	} catch {
		// Start fresh
	}
	results[name] = stats;
	fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
}

function logStats(name: string, stats: BenchmarkStats) {
	console.log(`\n📈 ${name} (n=${stats.n})`);
	console.log(
		`   min=${stats.min.toFixed(2)}ms median=${stats.median.toFixed(2)}ms p95=${stats.p95.toFixed(2)}ms max=${stats.max.toFixed(2)}ms`
	);
}

// Helper to wait for harness and setup
async function setupGrid(page: Page, rowCount: number): Promise<void> {
	await page.goto('/bench');
	await page.waitForFunction(() => (window as any).__bench?.ready === true, { timeout: 30000 });
	await page.evaluate((count) => (window as any).__bench.setup(count), rowCount);
	// Wait for grid to be fully rendered
	await page.waitForSelector('[data-testid="datagrid-body"]');
	await page.waitForTimeout(100); // Small buffer for rendering
}

// Helper to reset grid state (for repeated tests)
async function resetGrid(page: Page): Promise<void> {
	await page.evaluate(() => (window as any).__bench.reset());
	await page.waitForTimeout(50);
}

// ============================================================================
// SORT INTERACTION BENCHMARKS
// ============================================================================

test.describe('Sort Interaction Benchmarks', () => {
	test('click column header to sort - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 10;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		for (let i = 0; i < ITERATIONS; i++) {
			// Reset sort state by clicking twice to get back to unsorted
			// Or reset the grid
			await resetGrid(page);
			await page.evaluate((count) => (window as any).__bench.setup(count), ROW_COUNT);
			await page.waitForSelector('[data-testid="datagrid-header-cell"][data-column-key="firstName"]');

			// Get the header cell
			const header = page.locator('[data-testid="datagrid-header-cell"][data-column-key="firstName"]');

			// Measure: click header and wait for sort to complete
			const startTime = Date.now();
			await header.click();

			// Wait for aria-sort to change to "ascending"
			await expect(header).toHaveAttribute('aria-sort', 'ascending', { timeout: 5000 });

			const endTime = Date.now();
			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Sort Click 100K', stats);
		saveResult('sortClick100K', stats);

		// Performance target: Sort 100K < 100ms
		expect(stats.median).toBeLessThan(500); // Allow some overhead for click + render
		expect(stats.p95).toBeLessThan(1000);
	});

	test('click column header to sort - 10K rows (should be fast)', async ({ page }) => {
		const ROW_COUNT = 10_000;
		const ITERATIONS = 15;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		for (let i = 0; i < ITERATIONS; i++) {
			await resetGrid(page);
			await page.evaluate((count) => (window as any).__bench.setup(count), ROW_COUNT);
			await page.waitForSelector('[data-testid="datagrid-header-cell"][data-column-key="salary"]');

			const header = page.locator('[data-testid="datagrid-header-cell"][data-column-key="salary"]');

			const startTime = Date.now();
			await header.click();
			await expect(header).toHaveAttribute('aria-sort', 'ascending', { timeout: 2000 });
			const endTime = Date.now();

			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Sort Click 10K', stats);
		saveResult('sortClick10K', stats);

		// 10K should be very fast
		expect(stats.median).toBeLessThan(200);
	});
});

// ============================================================================
// SEARCH/FILTER INTERACTION BENCHMARKS
// ============================================================================

test.describe('Search Interaction Benchmarks', () => {
	test('type in search box and press Enter - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 10;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		for (let i = 0; i < ITERATIONS; i++) {
			await resetGrid(page);
			await page.evaluate((count) => (window as any).__bench.setup(count), ROW_COUNT);

			const searchInput = page.locator('[data-testid="datagrid-search"] input');
			await searchInput.waitFor({ state: 'visible' });

			// Clear any existing value
			await searchInput.fill('');

			// Measure: type search term and press Enter (bypasses debounce)
			const startTime = Date.now();
			await searchInput.fill('John');
			await searchInput.press('Enter');

			// Wait for filtered results (row count should change)
			await page.waitForFunction(
				() => {
					const grid = document.querySelector('[data-testid="datagrid"]');
					const count = parseInt(grid?.getAttribute('aria-rowcount') || '0', 10);
					return count < 100000 && count > 0;
				},
				{ timeout: 5000 }
			);

			const endTime = Date.now();
			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Search Enter 100K', stats);
		saveResult('searchEnter100K', stats);

		// Performance target: Filter 100K < 50ms (allow overhead for typing + render)
		expect(stats.median).toBeLessThan(300);
	});

	test('search with debounce - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 5; // Fewer iterations due to debounce wait
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		for (let i = 0; i < ITERATIONS; i++) {
			await resetGrid(page);
			await page.evaluate((count) => (window as any).__bench.setup(count), ROW_COUNT);

			const searchInput = page.locator('[data-testid="datagrid-search"] input');
			await searchInput.waitFor({ state: 'visible' });
			await searchInput.fill('');

			// Measure: type and wait for debounce (300ms) + filter + render
			const startTime = Date.now();
			await searchInput.type('Alice', { delay: 50 }); // Realistic typing speed

			// Wait for debounce + filter to complete
			await page.waitForFunction(
				() => {
					const grid = document.querySelector('[data-testid="datagrid"]');
					const count = parseInt(grid?.getAttribute('aria-rowcount') || '0', 10);
					return count < 100000 && count > 0;
				},
				{ timeout: 5000 }
			);

			const endTime = Date.now();
			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Search Debounce 100K', stats);
		saveResult('searchDebounce100K', stats);

		// Includes 300ms debounce + typing time + filter time
		expect(stats.median).toBeLessThan(800);
	});
});

// ============================================================================
// SELECTION INTERACTION BENCHMARKS
// ============================================================================

test.describe('Selection Interaction Benchmarks', () => {
	test('click to select single row - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 20;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		for (let i = 0; i < ITERATIONS; i++) {
			// Clear selection by clicking elsewhere first, or just measure click
			const row = page.locator('[data-testid="datagrid-row"]').first();
			await row.waitFor({ state: 'visible' });

			// If already selected, click to deselect first
			const isSelected = await row.getAttribute('aria-selected');
			if (isSelected === 'true') {
				await row.click({ modifiers: ['Control'] }); // Toggle off
				await page.waitForTimeout(50);
			}

			const startTime = Date.now();
			await row.click();

			// Wait for selection to be reflected
			await expect(row).toHaveAttribute('aria-selected', 'true', { timeout: 1000 });
			const endTime = Date.now();

			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Select Single Row 100K', stats);
		saveResult('selectSingleRow100K', stats);

		// Selection should be instant (<16ms target for 60fps)
		expect(stats.median).toBeLessThan(100);
		expect(stats.p95).toBeLessThan(200);
	});

	test('shift+click range selection - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 10;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		for (let i = 0; i < ITERATIONS; i++) {
			await resetGrid(page);
			await page.evaluate((count) => (window as any).__bench.setup(count), ROW_COUNT);

			// First, click first row to set anchor
			const firstRow = page.locator('[data-testid="datagrid-row"][data-row-index="0"]');
			await firstRow.waitFor({ state: 'visible' });
			await firstRow.click();
			await expect(firstRow).toHaveAttribute('aria-selected', 'true');

			// Now shift+click a row further down (row 10 for example)
			const targetRow = page.locator('[data-testid="datagrid-row"][data-row-index="10"]');
			await targetRow.waitFor({ state: 'visible' });

			const startTime = Date.now();
			await targetRow.click({ modifiers: ['Shift'] });

			// Wait for range selection (11 rows should be selected: 0-10)
			await page.waitForFunction(
				() => {
					const selectedRows = document.querySelectorAll(
						'[data-testid="datagrid-row"][aria-selected="true"]'
					);
					return selectedRows.length >= 11;
				},
				{ timeout: 2000 }
			);

			const endTime = Date.now();
			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Range Select 100K', stats);
		saveResult('rangeSelect100K', stats);

		// Range selection should be fast
		expect(stats.median).toBeLessThan(200);
	});
});

// ============================================================================
// KEYBOARD NAVIGATION BENCHMARKS
// ============================================================================

test.describe('Keyboard Navigation Benchmarks', () => {
	test('arrow down navigation - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 50;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		// Focus the grid body
		const body = page.locator('[data-testid="datagrid-body"]');
		await body.click();

		// Select first row
		const firstRow = page.locator('[data-testid="datagrid-row"]').first();
		await firstRow.click();
		await expect(firstRow).toHaveAttribute('aria-selected', 'true');

		for (let i = 0; i < ITERATIONS; i++) {
			const currentRowIndex = i;
			const nextRowIndex = i + 1;

			const startTime = Date.now();
			await page.keyboard.press('ArrowDown');

			// Wait for next row to be selected
			await page.waitForFunction(
				(idx) => {
					const row = document.querySelector(`[data-testid="datagrid-row"][data-row-index="${idx}"]`);
					return row?.getAttribute('aria-selected') === 'true';
				},
				nextRowIndex,
				{ timeout: 1000 }
			);

			const endTime = Date.now();
			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Arrow Down 100K', stats);
		saveResult('arrowDown100K', stats);

		// Keyboard navigation should be instant for 60fps
		expect(stats.median).toBeLessThan(50);
		expect(stats.p95).toBeLessThan(100);
	});

	test('Page Down navigation - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 10;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		// Focus and select first row
		const body = page.locator('[data-testid="datagrid-body"]');
		await body.click();
		const firstRow = page.locator('[data-testid="datagrid-row"]').first();
		await firstRow.click();

		for (let i = 0; i < ITERATIONS; i++) {
			const startTime = Date.now();
			await page.keyboard.press('PageDown');

			// Wait for scroll and selection update
			await page.waitForTimeout(50); // Small buffer
			await page.waitForFunction(
				() => {
					// Check that some row is selected (we don't know exact index after PageDown)
					return document.querySelectorAll('[data-testid="datagrid-row"][aria-selected="true"]').length > 0;
				},
				{ timeout: 1000 }
			);

			const endTime = Date.now();
			samples.push(endTime - startTime);
		}

		const stats = summarize(samples);
		logStats('Page Down 100K', stats);
		saveResult('pageDown100K', stats);

		// Page navigation should be reasonably fast
		expect(stats.median).toBeLessThan(150);
	});
});

// ============================================================================
// COLUMN RESIZE BENCHMARK
// ============================================================================

test.describe('Column Resize Benchmarks', () => {
	test('drag to resize column - 100K rows', async ({ page }) => {
		const ROW_COUNT = 100_000;
		const ITERATIONS = 10;
		const samples: number[] = [];

		await setupGrid(page, ROW_COUNT);

		for (let i = 0; i < ITERATIONS; i++) {
			// Find the resize handle for firstName column
			const headerCell = page.locator(
				'[data-testid="datagrid-header-cell"][data-column-key="firstName"]'
			);
			await headerCell.waitFor({ state: 'visible' });

			const resizeHandle = headerCell.locator('.datagrid-resize-handle');
			await resizeHandle.waitFor({ state: 'visible' });

			// Get initial width
			const initialWidth = await headerCell.evaluate((el) => el.getBoundingClientRect().width);

			// Measure drag operation
			const box = await resizeHandle.boundingBox();
			if (!box) throw new Error('Could not get resize handle bounding box');

			const startTime = Date.now();

			// Perform drag
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 5 });
			await page.mouse.up();

			// Wait for width change
			await page.waitForFunction(
				([selector, oldWidth]) => {
					const el = document.querySelector(selector as string);
					const newWidth = el?.getBoundingClientRect().width || 0;
					return Math.abs(newWidth - (oldWidth as number)) > 10;
				},
				['[data-testid="datagrid-header-cell"][data-column-key="firstName"]', initialWidth] as const,
				{ timeout: 1000 }
			);

			const endTime = Date.now();
			samples.push(endTime - startTime);

			// Reset width for next iteration (drag back)
			await page.mouse.move(box.x + 50, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x, box.y + box.height / 2, { steps: 5 });
			await page.mouse.up();
			await page.waitForTimeout(50);
		}

		const stats = summarize(samples);
		logStats('Column Resize 100K', stats);
		saveResult('columnResize100K', stats);

		// Column resize should be smooth
		expect(stats.median).toBeLessThan(200);
	});
});

// ============================================================================
// SUMMARY TEST
// ============================================================================

test.describe('Summary', () => {
	test.afterAll(() => {
		console.log('\n========================================');
		console.log('User Interaction Benchmarks Complete');
		console.log('========================================');
		console.log(`Results saved to: ${RESULTS_PATH}`);
	});
});
