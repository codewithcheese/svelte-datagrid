/**
 * Statistical utilities for benchmark analysis
 *
 * Provides percentile calculations and statistical summaries
 * for benchmark samples.
 */

export interface BenchmarkStats {
	/** Number of samples */
	n: number;
	/** Minimum value */
	min: number;
	/** Maximum value */
	max: number;
	/** Arithmetic mean */
	mean: number;
	/** Median (50th percentile) */
	median: number;
	/** 75th percentile (commonly used for performance budgets) */
	p75: number;
	/** 95th percentile (captures tail latency) */
	p95: number;
	/** 99th percentile */
	p99: number;
	/** Standard deviation */
	stdDev: number;
}

/**
 * Calculate a specific percentile from a sorted array.
 */
export function percentile(sortedSamples: number[], p: number): number {
	if (sortedSamples.length === 0) return 0;
	const idx = Math.min(
		sortedSamples.length - 1,
		Math.max(0, Math.ceil(p * sortedSamples.length) - 1)
	);
	return sortedSamples[idx];
}

/**
 * Calculate comprehensive statistics for benchmark samples.
 */
export function summarize(samples: number[]): BenchmarkStats {
	if (samples.length === 0) {
		return {
			n: 0,
			min: 0,
			max: 0,
			mean: 0,
			median: 0,
			p75: 0,
			p95: 0,
			p99: 0,
			stdDev: 0
		};
	}

	const sorted = [...samples].sort((a, b) => a - b);
	const n = sorted.length;

	// Basic stats
	const min = sorted[0];
	const max = sorted[n - 1];
	const sum = sorted.reduce((acc, val) => acc + val, 0);
	const mean = sum / n;

	// Standard deviation
	const squaredDiffs = sorted.map((val) => Math.pow(val - mean, 2));
	const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / n;
	const stdDev = Math.sqrt(avgSquaredDiff);

	// Percentiles
	const median = percentile(sorted, 0.5);
	const p75 = percentile(sorted, 0.75);
	const p95 = percentile(sorted, 0.95);
	const p99 = percentile(sorted, 0.99);

	return { n, min, max, mean, median, p75, p95, p99, stdDev };
}

/**
 * Format stats for human-readable output.
 */
export function formatStats(stats: BenchmarkStats, unit = 'ms'): string {
	return [
		`n=${stats.n}`,
		`min=${stats.min.toFixed(2)}${unit}`,
		`median=${stats.median.toFixed(2)}${unit}`,
		`p75=${stats.p75.toFixed(2)}${unit}`,
		`p95=${stats.p95.toFixed(2)}${unit}`,
		`max=${stats.max.toFixed(2)}${unit}`,
		`stdDev=${stats.stdDev.toFixed(2)}${unit}`
	].join(' | ');
}

export interface RegressionResult {
	passed: boolean;
	metric: string;
	baseline: number;
	current: number;
	threshold: number;
	percentChange: number;
}

/**
 * Check for regressions against a baseline.
 */
export function checkRegression(
	current: BenchmarkStats,
	baseline: BenchmarkStats,
	thresholds: { median?: number; p75?: number; p95?: number } = {}
): RegressionResult[] {
	const results: RegressionResult[] = [];

	// Default thresholds: 5% for median, 8% for p95
	const medianThreshold = thresholds.median ?? 1.05;
	const p75Threshold = thresholds.p75 ?? 1.05;
	const p95Threshold = thresholds.p95 ?? 1.08;

	const checks: [string, number, number, number][] = [
		['median', current.median, baseline.median, medianThreshold],
		['p75', current.p75, baseline.p75, p75Threshold],
		['p95', current.p95, baseline.p95, p95Threshold]
	];

	for (const [metric, currentVal, baselineVal, threshold] of checks) {
		const percentChange = baselineVal > 0 ? (currentVal - baselineVal) / baselineVal : 0;
		const maxAllowed = baselineVal * threshold;
		const passed = currentVal <= maxAllowed;

		results.push({
			passed,
			metric,
			baseline: baselineVal,
			current: currentVal,
			threshold,
			percentChange
		});
	}

	return results;
}

/**
 * Format regression results for output.
 */
export function formatRegressionResults(results: RegressionResult[]): string {
	return results
		.map((r) => {
			const status = r.passed ? '✓' : '✗';
			const change = (r.percentChange * 100).toFixed(1);
			const sign = r.percentChange >= 0 ? '+' : '';
			return `${status} ${r.metric}: ${r.current.toFixed(2)}ms (baseline: ${r.baseline.toFixed(2)}ms, ${sign}${change}%, max: ${(r.baseline * r.threshold).toFixed(2)}ms)`;
		})
		.join('\n');
}
