/**
 * DataGrid Performance Benchmark Tests
 *
 * These tests run against a production build to measure real-world performance.
 * They use percentile-based regression detection to catch performance issues.
 *
 * Performance Targets (from CLAUDE.md):
 * - UI updates: <16ms (60fps frame budget)
 * - Sort 100K rows: <100ms
 * - Filter 100K rows: <50ms
 * - Scroll frame: <5ms
 *
 * Running benchmarks:
 * - Local: pnpm bench:playwright
 * - CI: Automatically runs and compares against baseline
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions for benchmark results
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

interface BenchmarkResult {
	samples: number[];
	stats: BenchmarkStats;
}

interface Baseline {
	[key: string]: BenchmarkStats;
}

// Paths
const BASELINE_PATH = path.join(__dirname, 'baseline.json');
const OUTPUT_DIR = path.join(__dirname, '../bench-results');
const RESULTS_PATH = path.join(OUTPUT_DIR, 'latest.json');

// Load baseline if it exists
function loadBaseline(): Baseline | null {
	try {
		if (fs.existsSync(BASELINE_PATH)) {
			return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
		}
	} catch (e) {
		console.warn('Failed to load baseline:', e);
	}
	return null;
}

// Save results
function saveResult(name: string, stats: BenchmarkStats) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	let results: Baseline = {};
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

// Regression check thresholds
const REGRESSION_THRESHOLDS = {
	median: 1.1, // 10% regression allowed
	p75: 1.15, // 15% regression allowed
	p95: 1.2 // 20% regression allowed for tail latency
};

function checkRegression(
	name: string,
	current: BenchmarkStats,
	baseline: BenchmarkStats | undefined
): void {
	if (!baseline) {
		console.log(`  ⚪ ${name}: No baseline (median: ${current.median.toFixed(2)}ms)`);
		return;
	}

	const checks = [
		{ metric: 'median', threshold: REGRESSION_THRESHOLDS.median },
		{ metric: 'p75', threshold: REGRESSION_THRESHOLDS.p75 },
		{ metric: 'p95', threshold: REGRESSION_THRESHOLDS.p95 }
	];

	for (const { metric, threshold } of checks) {
		const currentVal = current[metric as keyof BenchmarkStats] as number;
		const baselineVal = baseline[metric as keyof BenchmarkStats] as number;
		const maxAllowed = baselineVal * threshold;
		const percentChange = ((currentVal - baselineVal) / baselineVal) * 100;
		const sign = percentChange >= 0 ? '+' : '';

		if (currentVal > maxAllowed) {
			console.log(
				`  ❌ ${name} ${metric}: ${currentVal.toFixed(2)}ms (baseline: ${baselineVal.toFixed(2)}ms, ${sign}${percentChange.toFixed(1)}%, max: ${maxAllowed.toFixed(2)}ms)`
			);
			throw new Error(
				`Regression detected in ${name} ${metric}: ${currentVal.toFixed(2)}ms > ${maxAllowed.toFixed(2)}ms (${sign}${percentChange.toFixed(1)}%)`
			);
		} else {
			console.log(
				`  ✅ ${name} ${metric}: ${currentVal.toFixed(2)}ms (baseline: ${baselineVal.toFixed(2)}ms, ${sign}${percentChange.toFixed(1)}%)`
			);
		}
	}
}

// Wait for benchmark harness to be ready
async function waitForHarness(page: any): Promise<void> {
	await page.goto('/bench');
	await page.waitForFunction(() => (window as any).__benchReady === true, { timeout: 30000 });
}

// ============================================================================
// BENCHMARK TESTS
// ============================================================================

test.describe('DataGrid Performance Benchmarks', () => {
	const baseline = loadBaseline();

	test.beforeAll(() => {
		console.log('\n📊 DataGrid Performance Benchmarks');
		console.log('===================================');
		if (baseline) {
			console.log(`Baseline loaded with ${Object.keys(baseline).length} benchmarks`);
		} else {
			console.log('No baseline found - will create new baseline');
		}
		console.log('');
	});

	// -------------------------------------------------------------------------
	// Data Generation Benchmarks
	// -------------------------------------------------------------------------

	test('data generation - 100K rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchDataGeneration(100000, 30);
		});

		console.log(`\n📈 Data Generation 100K (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('dataGeneration100K', result.stats);
		checkRegression('dataGeneration100K', result.stats, baseline?.dataGeneration100K);
	});

	test('data generation - 1M rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchDataGeneration(1000000, 10);
		});

		console.log(`\n📈 Data Generation 1M (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('dataGeneration1M', result.stats);
		checkRegression('dataGeneration1M', result.stats, baseline?.dataGeneration1M);
	});

	// -------------------------------------------------------------------------
	// Initial Render Benchmarks
	// -------------------------------------------------------------------------

	test('initial render - 1K rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchInitialRender(1000, 20);
		});

		console.log(`\n📈 Initial Render 1K (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('initialRender1K', result.stats);
		checkRegression('initialRender1K', result.stats, baseline?.initialRender1K);
	});

	test('initial render - 100K rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchInitialRender(100000, 15);
		});

		console.log(`\n📈 Initial Render 100K (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('initialRender100K', result.stats);
		checkRegression('initialRender100K', result.stats, baseline?.initialRender100K);
	});

	test('initial render - 1M rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchInitialRender(1000000, 10);
		});

		console.log(`\n📈 Initial Render 1M (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('initialRender1M', result.stats);
		checkRegression('initialRender1M', result.stats, baseline?.initialRender1M);
	});

	// -------------------------------------------------------------------------
	// Scroll Performance (Target: <5ms per frame)
	// -------------------------------------------------------------------------

	test('scroll performance - 100K rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchScroll(100000, 100);
		});

		console.log(`\n📈 Scroll 100K (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('scroll100K', result.stats);
		checkRegression('scroll100K', result.stats, baseline?.scroll100K);

		// Hard limit: scroll should be <16ms for 60fps
		expect(result.stats.p95).toBeLessThan(16);
	});

	test('scroll performance - 1M rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchScroll(1000000, 100);
		});

		console.log(`\n📈 Scroll 1M (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('scroll1M', result.stats);
		checkRegression('scroll1M', result.stats, baseline?.scroll1M);

		// Hard limit: scroll should be <16ms for 60fps
		expect(result.stats.p95).toBeLessThan(16);
	});

	// -------------------------------------------------------------------------
	// Sort Performance (Target: 100K < 100ms)
	// -------------------------------------------------------------------------

	test('sort performance - 100K rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchSort(100000, 20);
		});

		console.log(`\n📈 Sort 100K (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('sort100K', result.stats);
		checkRegression('sort100K', result.stats, baseline?.sort100K);

		// Hard limit from performance targets
		expect(result.stats.median).toBeLessThan(100);
	});

	// -------------------------------------------------------------------------
	// Filter Performance (Target: 100K < 50ms)
	// -------------------------------------------------------------------------

	test('filter performance - 100K rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchFilter(100000, 20);
		});

		console.log(`\n📈 Filter 100K (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('filter100K', result.stats);
		checkRegression('filter100K', result.stats, baseline?.filter100K);

		// Hard limit from performance targets
		expect(result.stats.median).toBeLessThan(50);
	});

	// -------------------------------------------------------------------------
	// Full Flow (Demo simulation)
	// -------------------------------------------------------------------------

	test('full flow - 1M rows (demo simulation)', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchFullFlow(1000000, 5);
		});

		console.log(`\n📈 Full Flow 1M (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('fullFlow1M', result.stats);
		checkRegression('fullFlow1M', result.stats, baseline?.fullFlow1M);
	});

	// -------------------------------------------------------------------------
	// Data Update Benchmarks
	// -------------------------------------------------------------------------

	test('data update - 1K to 100K rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchDataUpdate(1000, 100000, 15);
		});

		console.log(`\n📈 Data Update 1K→100K (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('dataUpdate1Kto100K', result.stats);
		checkRegression('dataUpdate1Kto100K', result.stats, baseline?.dataUpdate1Kto100K);
	});

	test('data update - 100K to 1M rows', async ({ page }) => {
		await waitForHarness(page);

		const result: BenchmarkResult = await page.evaluate(async () => {
			return await (window as any).__benchDataUpdate(100000, 1000000, 10);
		});

		console.log(`\n📈 Data Update 100K→1M (n=${result.stats.n})`);
		console.log(
			`   min=${result.stats.min.toFixed(2)}ms median=${result.stats.median.toFixed(2)}ms p95=${result.stats.p95.toFixed(2)}ms max=${result.stats.max.toFixed(2)}ms`
		);

		saveResult('dataUpdate100Kto1M', result.stats);
		checkRegression('dataUpdate100Kto1M', result.stats, baseline?.dataUpdate100Kto1M);
	});
});
