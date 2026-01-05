/**
 * Benchmark instrumentation utilities
 *
 * This module provides tools for measuring and tracking component performance.
 * All instrumentation is compile-time gated via __BENCH__ and will be
 * tree-shaken from production builds.
 *
 * @example
 * ```ts
 * // In a component:
 * import { instrumentMount } from '$lib/bench';
 * instrumentMount('DataGrid');
 *
 * // In a test:
 * import { summarize, checkRegression } from '$lib/bench';
 * const stats = summarize(samples);
 * const results = checkRegression(stats, baseline);
 * ```
 */

// Core User Timing API instrumentation
export {
	BENCH_ENABLED,
	mark,
	measure,
	clear,
	clearAll,
	getLastMeasure,
	getAllMeasures,
	startTimer,
	collectSamples,
	type BenchmarkSample
} from './perf.js';

// Svelte lifecycle instrumentation
export {
	instrumentMount,
	measureUpdate,
	measureAsyncUpdate,
	getBenchNames
} from './svelte-mount.js';

// Statistical utilities
export {
	summarize,
	percentile,
	formatStats,
	checkRegression,
	formatRegressionResults,
	type BenchmarkStats,
	type RegressionResult
} from './stats.js';
