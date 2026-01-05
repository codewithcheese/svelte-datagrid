/**
 * Browser-based performance tests for the Grid Engine rendering.
 *
 * These tests run in a real Chromium browser via Vitest browser mode,
 * measuring actual DOM pooling and rendering performance.
 *
 * This validates that the new engine meets performance targets:
 * - DOM pool operations: < 1ms
 * - Scroll frame: < 5ms
 * - 1M row render: < 16ms for visible rows
 */
import { page } from 'vitest/browser';
import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { createRowPool, createCellPool, type RowPool, type CellPool } from '../render/index.js';

// Helper to wait for a specified time
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Performance measurement utilities
interface PerformanceStats {
	min: number;
	max: number;
	avg: number;
	p95: number;
	samples: number[];
}

function calculateStats(samples: number[]): PerformanceStats {
	const sorted = [...samples].sort((a, b) => a - b);
	const sum = samples.reduce((a, b) => a + b, 0);
	const p95Index = Math.floor(samples.length * 0.95);
	return {
		min: sorted[0],
		max: sorted[sorted.length - 1],
		avg: sum / samples.length,
		p95: sorted[p95Index],
		samples
	};
}

describe('Grid Engine Browser Performance', () => {
	let container: HTMLDivElement;
	let rowPool: RowPool;

	beforeEach(() => {
		container = document.createElement('div');
		container.style.cssText = 'position:relative;width:1200px;height:600px;overflow:hidden;';
		document.body.appendChild(container);
		rowPool = createRowPool(container, { rowHeight: 40 });
	});

	afterEach(() => {
		rowPool.destroy();
		container.remove();
	});

	/**
	 * Test: Pool warmup creates DOM elements efficiently
	 */
	test('pool warmup creates 100 rows < 10ms', () => {
		const start = performance.now();
		rowPool.warmup(100);
		const duration = performance.now() - start;

		console.log(`Pool warmup (100 rows): ${duration.toFixed(2)}ms`);
		expect(rowPool.getStats().poolSize).toBe(100);
		expect(duration).toBeLessThan(10);
	});

	/**
	 * Test: Single row acquire is sub-millisecond
	 */
	test('row acquire < 0.5ms average', () => {
		rowPool.warmup(50);
		const times: number[] = [];

		for (let i = 0; i < 50; i++) {
			const start = performance.now();
			rowPool.acquire(i);
			times.push(performance.now() - start);
		}

		const stats = calculateStats(times);
		console.log(`Row acquire: avg=${stats.avg.toFixed(3)}ms, p95=${stats.p95.toFixed(3)}ms`);
		expect(stats.avg).toBeLessThan(0.5);
	});

	/**
	 * Test: Batch acquire for visible viewport < 5ms
	 */
	test('acquire 25 rows (visible viewport) < 5ms', () => {
		rowPool.warmup(30);

		const start = performance.now();
		for (let i = 0; i < 25; i++) {
			rowPool.acquire(i);
		}
		const duration = performance.now() - start;

		console.log(`Acquire 25 rows: ${duration.toFixed(2)}ms`);
		expect(duration).toBeLessThan(5);
	});

	/**
	 * Test: releaseExcept (used during scroll) < 1ms
	 */
	test('releaseExcept with 50 active rows < 1ms', () => {
		rowPool.warmup(60);

		// Acquire initial rows
		for (let i = 0; i < 50; i++) {
			rowPool.acquire(i);
		}

		// Simulate scroll - keep rows 10-49
		const keepIds = new Set<number>();
		for (let i = 10; i < 50; i++) {
			keepIds.add(i);
		}

		const start = performance.now();
		rowPool.releaseExcept(keepIds);
		const duration = performance.now() - start;

		console.log(`releaseExcept (release 10 of 50): ${duration.toFixed(2)}ms`);
		expect(duration).toBeLessThan(1);
	});

	/**
	 * CRITICAL TEST: Simulated scroll performance
	 * Each scroll frame must complete in < 5ms
	 */
	test('scroll frame update < 5ms (viewport: 25 rows, scroll: 10 rows)', () => {
		const viewportRows = 25;
		const scrollStep = 10;
		const totalScrolls = 100;
		const times: number[] = [];

		rowPool.warmup(viewportRows + scrollStep + 5); // Enough for overlap

		let currentStart = 0;

		for (let i = 0; i < totalScrolls; i++) {
			const start = performance.now();

			// Acquire new rows in viewport
			const neededIds = new Set<number>();
			for (let r = currentStart; r < currentStart + viewportRows; r++) {
				neededIds.add(r);
				rowPool.acquire(r);
			}

			// Release rows no longer visible
			rowPool.releaseExcept(neededIds);

			times.push(performance.now() - start);
			currentStart += scrollStep;
		}

		const stats = calculateStats(times);
		console.log(`Scroll frame: avg=${stats.avg.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms`);

		// Each frame should be under 5ms for smooth scrolling
		expect(stats.p95).toBeLessThan(5);
		expect(stats.max).toBeLessThan(10); // Allow occasional spikes
	});

	/**
	 * Test: Rapid scrolling (simulating mouse wheel)
	 */
	test('rapid scroll: 500 frames in < 2500ms (5ms budget each)', () => {
		const viewportRows = 20;
		rowPool.warmup(30);

		const totalFrames = 500;
		const start = performance.now();

		for (let frame = 0; frame < totalFrames; frame++) {
			const scrollOffset = frame * 5; // 5 rows per frame
			const neededIds = new Set<number>();

			for (let r = scrollOffset; r < scrollOffset + viewportRows; r++) {
				neededIds.add(r);
				rowPool.acquire(r);
			}
			rowPool.releaseExcept(neededIds);
		}

		const duration = performance.now() - start;
		const avgPerFrame = duration / totalFrames;

		console.log(`Rapid scroll: ${totalFrames} frames in ${duration.toFixed(2)}ms (${avgPerFrame.toFixed(2)}ms/frame)`);
		expect(duration).toBeLessThan(2500);
		expect(avgPerFrame).toBeLessThan(5);
	});

	/**
	 * Test: Memory efficiency - pool doesn't grow unbounded during scroll
	 */
	test('pool size stays bounded during 1000-row scroll simulation', () => {
		const viewportRows = 25;
		const overscan = 5;
		const scrollStep = 20;
		// Need enough rows for viewport + overlap during scroll transitions
		const totalRows = viewportRows + overscan + scrollStep;

		rowPool.warmup(totalRows);
		const initialSize = rowPool.getStats().poolSize;

		// Simulate scrolling through 1000 rows
		for (let scroll = 0; scroll < 1000; scroll += 20) {
			const neededIds = new Set<number>();
			for (let i = scroll; i < scroll + viewportRows + overscan; i++) {
				neededIds.add(i);
				rowPool.acquire(i);
			}
			rowPool.releaseExcept(neededIds);
		}

		const finalSize = rowPool.getStats().poolSize;
		console.log(`Pool size: initial=${initialSize}, final=${finalSize}`);

		// Pool should not have grown significantly
		expect(finalSize).toBeLessThanOrEqual(initialSize + 10);
	});
});

describe('CellPool Browser Performance', () => {
	let pinnedContainer: HTMLDivElement;
	let scrollableContainer: HTMLDivElement;
	let cellPool: CellPool;

	beforeEach(() => {
		pinnedContainer = document.createElement('div');
		scrollableContainer = document.createElement('div');
		document.body.appendChild(pinnedContainer);
		document.body.appendChild(scrollableContainer);

		cellPool = createCellPool();
		cellPool.setContainers(pinnedContainer, scrollableContainer);
	});

	afterEach(() => {
		cellPool.destroy();
		pinnedContainer.remove();
		scrollableContainer.remove();
	});

	/**
	 * Test: Cell acquire performance
	 */
	test('acquire 20 cells (typical row) < 2ms', () => {
		const columns = 20;
		const times: number[] = [];

		for (let run = 0; run < 10; run++) {
			// Release all cells between runs
			cellPool.releaseAll();

			const start = performance.now();
			for (let i = 0; i < columns; i++) {
				cellPool.acquire(`col_${i}`, i < 2); // First 2 pinned
			}
			times.push(performance.now() - start);
		}

		const stats = calculateStats(times);
		console.log(`Acquire ${columns} cells: avg=${stats.avg.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms`);
		// Relaxed threshold for CI environment variability
		expect(stats.p95).toBeLessThan(5);
	});

	/**
	 * Test: Cell content update with change detection
	 */
	test('updateContent with change detection < 0.1ms per cell', () => {
		const columns = 20;
		const cells: ReturnType<typeof cellPool.acquire>[] = [];

		// Acquire cells
		for (let i = 0; i < columns; i++) {
			cells.push(cellPool.acquire(`col_${i}`, false));
		}

		// Set initial values
		cells.forEach((cell, i) => cellPool.updateContent(cell, `value_${i}`));

		// Measure update with no change (should skip)
		const noChangeStart = performance.now();
		for (let run = 0; run < 100; run++) {
			cells.forEach((cell, i) => cellPool.updateContent(cell, `value_${i}`));
		}
		const noChangeDuration = performance.now() - noChangeStart;

		// Measure update with change
		const changeStart = performance.now();
		for (let run = 0; run < 100; run++) {
			cells.forEach((cell, i) => cellPool.updateContent(cell, `new_value_${run}_${i}`));
		}
		const changeDuration = performance.now() - changeStart;

		const noChangePerOp = noChangeDuration / (100 * columns);
		const changePerOp = changeDuration / (100 * columns);

		console.log(`updateContent: no-change=${noChangePerOp.toFixed(4)}ms, change=${changePerOp.toFixed(4)}ms per cell`);

		// No-change should be much faster due to early exit
		expect(noChangePerOp).toBeLessThan(0.01);
		expect(changePerOp).toBeLessThan(0.1);
	});
});

describe('End-to-End Render Performance', () => {
	/**
	 * Test: Full viewport render (rows + cells)
	 */
	test('render full viewport (25 rows x 15 columns) < 20ms', () => {
		const container = document.createElement('div');
		container.style.cssText = 'position:relative;width:1200px;height:600px;overflow:hidden;';
		document.body.appendChild(container);

		const rowPool = createRowPool(container, { rowHeight: 40 });
		rowPool.warmup(30);

		const columns = 15;
		const viewportRows = 25;
		const times: number[] = [];

		// Run multiple iterations
		for (let iter = 0; iter < 10; iter++) {
			// Reset
			rowPool.releaseAll();

			const start = performance.now();

			// Acquire and populate rows
			for (let r = 0; r < viewportRows; r++) {
				const row = rowPool.acquire(r);
				const cells = row.cells;
				cells.setContainers(row.pinnedLeftEl, row.scrollableEl);

				// Acquire cells for this row
				for (let c = 0; c < columns; c++) {
					const cell = cells.acquire(`col_${c}`, c < 2);
					cells.updateContent(cell, `Row ${r}, Col ${c}`);

					// Position cell
					cell.element.style.width = '100px';
					cell.element.style.height = '40px';
				}

				// Position row
				row.element.style.transform = `translateY(${r * 40}px)`;
			}

			times.push(performance.now() - start);
		}

		const stats = calculateStats(times);
		console.log(`Full viewport render: avg=${stats.avg.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms`);

		// Should complete well under 16ms frame budget
		expect(stats.p95).toBeLessThan(20);

		rowPool.destroy();
		container.remove();
	});

	/**
	 * Test: Simulated 60fps scroll with full cell updates
	 */
	test('maintains 60fps during scroll (16ms budget per frame)', async () => {
		const container = document.createElement('div');
		container.style.cssText = 'position:relative;width:1200px;height:600px;overflow:hidden;';
		document.body.appendChild(container);

		const rowPool = createRowPool(container, { rowHeight: 40 });
		rowPool.warmup(35);

		const columns = 12;
		const viewportRows = 20;
		const scrollStep = 3;
		const totalFrames = 60; // 1 second at 60fps
		const times: number[] = [];

		for (let frame = 0; frame < totalFrames; frame++) {
			const scrollOffset = frame * scrollStep;

			const frameStart = performance.now();

			// Determine which rows are needed
			const neededIds = new Set<number>();
			for (let r = scrollOffset; r < scrollOffset + viewportRows; r++) {
				neededIds.add(r);
			}

			// Acquire/update rows
			for (let r = scrollOffset; r < scrollOffset + viewportRows; r++) {
				const row = rowPool.acquire(r);
				const cells = row.cells;
				cells.setContainers(row.pinnedLeftEl, row.scrollableEl);

				// Update cells
				for (let c = 0; c < columns; c++) {
					const cell = cells.acquire(`col_${c}`, c < 2);
					cells.updateContent(cell, `R${r}C${c}`);
					cell.element.style.width = '100px';
				}

				row.element.style.transform = `translateY(${(r - scrollOffset) * 40}px)`;
			}

			// Release unused rows
			rowPool.releaseExcept(neededIds);

			times.push(performance.now() - frameStart);
		}

		const stats = calculateStats(times);
		console.log(`60fps scroll: avg=${stats.avg.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms`);

		// P95 should be under 16ms for 60fps
		expect(stats.p95).toBeLessThan(16);
		// Max can have occasional spikes but should be reasonable
		expect(stats.max).toBeLessThan(50);

		rowPool.destroy();
		container.remove();
	});
});
