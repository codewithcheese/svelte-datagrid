/**
 * User Timing API instrumentation for benchmarks
 *
 * This module provides a thin wrapper around the User Timing API (performance.mark/measure)
 * that is compile-time gated. When __BENCH__ is false, all functions are no-ops and
 * tree-shaken from production builds.
 *
 * Benefits of User Timing API:
 * - Appears in browser DevTools Performance panel
 * - Lighthouse can surface these metrics
 * - Designed for custom app measurements
 *
 * @example
 * ```ts
 * import { mark, measure, BENCH_ENABLED } from '$lib/bench/perf';
 *
 * mark('MyComponent:init');
 * // ... do work ...
 * mark('MyComponent:mounted');
 * measure('MyComponent:mount', 'MyComponent:init', 'MyComponent:mounted');
 * ```
 */

/**
 * Whether benchmark instrumentation is enabled.
 * Controlled by BENCH=1 environment variable at build time.
 */
export const BENCH_ENABLED = __BENCH__;

/**
 * Create a performance mark.
 * No-op when BENCH_ENABLED is false.
 */
export function mark(name: string): void {
	if (!BENCH_ENABLED) return;
	performance.mark(name);
}

/**
 * Create a performance measure between two marks.
 * Returns the duration in milliseconds, or null if not in bench mode.
 */
export function measure(name: string, startMark: string, endMark: string): number | null {
	if (!BENCH_ENABLED) return null;
	performance.measure(name, startMark, endMark);
	const entries = performance.getEntriesByName(name, 'measure');
	return entries.length ? entries[entries.length - 1].duration : null;
}

/**
 * Clear performance marks and measures that start with the given prefix.
 */
export function clear(namePrefix: string): void {
	if (!BENCH_ENABLED) return;
	performance.getEntries().forEach((entry) => {
		if (entry.name.startsWith(namePrefix)) {
			if (entry.entryType === 'mark') {
				performance.clearMarks(entry.name);
			}
			if (entry.entryType === 'measure') {
				performance.clearMeasures(entry.name);
			}
		}
	});
}

/**
 * Get the duration of the last measure with the given name.
 * Returns null if not found or not in bench mode.
 */
export function getLastMeasure(name: string): number | null {
	if (!BENCH_ENABLED) return null;
	const entries = performance.getEntriesByName(name, 'measure');
	return entries.length ? entries[entries.length - 1].duration : null;
}

/**
 * Get all measures with the given name.
 * Returns empty array if not in bench mode.
 */
export function getAllMeasures(name: string): number[] {
	if (!BENCH_ENABLED) return [];
	return performance.getEntriesByName(name, 'measure').map((e) => e.duration);
}

/**
 * Clear all marks and measures.
 */
export function clearAll(): void {
	if (!BENCH_ENABLED) return;
	performance.clearMarks();
	performance.clearMeasures();
}

/**
 * Simple timing helper for imperative benchmarks.
 * Returns a function that, when called, returns the elapsed time.
 */
export function startTimer(): () => number {
	const start = performance.now();
	return () => performance.now() - start;
}

export interface BenchmarkSample {
	name: string;
	duration: number;
	timestamp: number;
}

/**
 * Collect all measures as samples for export.
 */
export function collectSamples(namePrefix: string): BenchmarkSample[] {
	if (!BENCH_ENABLED) return [];
	return performance
		.getEntriesByType('measure')
		.filter((e) => e.name.startsWith(namePrefix))
		.map((e) => ({
			name: e.name,
			duration: e.duration,
			timestamp: e.startTime
		}));
}
