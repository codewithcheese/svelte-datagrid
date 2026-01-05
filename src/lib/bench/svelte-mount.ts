/**
 * Svelte lifecycle instrumentation for benchmarks
 *
 * Provides helpers to instrument Svelte component mount/update cycles
 * using the User Timing API.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { instrumentMount } from '$lib/bench/svelte-mount';
 *   instrumentMount('MyComponent');
 * </script>
 * ```
 */

import { onMount, tick } from 'svelte';
import { BENCH_ENABLED, mark, measure } from './perf.js';

/**
 * Standard naming convention for benchmark marks/measures.
 * Use consistent names so harnesses can easily find them.
 */
export function getBenchNames(tag: string) {
	return {
		init: `${tag}:init`,
		mounted: `${tag}:mounted`,
		mount: `${tag}:mount`,
		updateStart: `${tag}:update:start`,
		updateEnd: `${tag}:update:end`,
		update: `${tag}:update`
	};
}

/**
 * Instrument a Svelte component's mount lifecycle.
 * Call this at the top of your component's <script> block.
 *
 * Creates measures:
 * - `{tag}:mount` - Time from script initialization to onMount callback
 *
 * @param tag - Unique identifier for the component (e.g., 'DataGrid')
 */
export function instrumentMount(tag: string): void {
	if (!BENCH_ENABLED) return;

	const names = getBenchNames(tag);

	// Mark as early as possible when module runs
	mark(names.init);

	onMount(() => {
		mark(names.mounted);
		measure(names.mount, names.init, names.mounted);
	});
}

/**
 * Measure a specific update operation.
 * Use this to measure how long an update takes.
 *
 * @example
 * ```ts
 * import { measureUpdate } from '$lib/bench/svelte-mount';
 *
 * async function handleClick() {
 *   await measureUpdate('DataGrid', () => {
 *     data = generateData(1000000);
 *   });
 * }
 * ```
 */
export async function measureUpdate(tag: string, trigger: () => void): Promise<number | null> {
	if (!BENCH_ENABLED) {
		trigger();
		await tick();
		return null;
	}

	const names = getBenchNames(tag);

	mark(names.updateStart);
	trigger();
	await tick(); // Wait until DOM is updated
	mark(names.updateEnd);

	return measure(names.update, names.updateStart, names.updateEnd);
}

/**
 * Measure an async update operation.
 *
 * @example
 * ```ts
 * import { measureAsyncUpdate } from '$lib/bench/svelte-mount';
 *
 * async function loadData() {
 *   await measureAsyncUpdate('DataGrid', async () => {
 *     const response = await fetch('/api/data');
 *     data = await response.json();
 *   });
 * }
 * ```
 */
export async function measureAsyncUpdate(
	tag: string,
	trigger: () => Promise<void>
): Promise<number | null> {
	if (!BENCH_ENABLED) {
		await trigger();
		await tick();
		return null;
	}

	const names = getBenchNames(tag);

	mark(names.updateStart);
	await trigger();
	await tick(); // Wait until DOM is updated
	mark(names.updateEnd);

	return measure(names.update, names.updateStart, names.updateEnd);
}
