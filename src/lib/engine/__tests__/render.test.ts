/**
 * Tests for the render module - RowPool, CellPool, BodyRenderer, HeaderRenderer.
 *
 * These tests run in Node.js with JSDOM for basic DOM testing.
 * Browser-specific performance tests are in separate .svelte.test.ts files.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { CellPool, createCellPool } from '../render/CellPool.js';
import { RowPool, createRowPool } from '../render/RowPool.js';

// Set up JSDOM for DOM testing
let dom: JSDOM;
let document: Document;

beforeEach(() => {
	dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>');
	document = dom.window.document;
	(global as any).document = document;
});

afterEach(() => {
	(global as any).document = undefined;
});

describe('CellPool', () => {
	test('creates and acquires cells', () => {
		const pool = createCellPool();
		const container = document.createElement('div');
		pool.setContainers(container, container);

		const cell = pool.acquire('name', false);

		expect(cell).toBeDefined();
		expect(cell.element).toBeInstanceOf(dom.window.HTMLDivElement);
		expect(cell.contentEl).toBeInstanceOf(dom.window.HTMLSpanElement);
		expect(cell.columnKey).toBe('name');
		expect(cell.inUse).toBe(true);
	});

	test('reuses cells after release', () => {
		const pool = createCellPool();
		const container = document.createElement('div');
		pool.setContainers(container, container);

		const cell1 = pool.acquire('name', false);
		const element1 = cell1.element;

		pool.release('name');

		const cell2 = pool.acquire('age', false);

		// Should reuse the same element
		expect(cell2.element).toBe(element1);
		expect(cell2.columnKey).toBe('age');
	});

	test('returns existing cell for same column', () => {
		const pool = createCellPool();
		const container = document.createElement('div');
		pool.setContainers(container, container);

		const cell1 = pool.acquire('name', false);
		const cell2 = pool.acquire('name', false);

		expect(cell1).toBe(cell2);
	});

	test('releaseAll clears all active cells', () => {
		const pool = createCellPool();
		const container = document.createElement('div');
		pool.setContainers(container, container);

		pool.acquire('name', false);
		pool.acquire('age', false);
		pool.acquire('email', false);

		expect(pool.getActiveCells().size).toBe(3);

		pool.releaseAll();

		expect(pool.getActiveCells().size).toBe(0);
	});

	test('releaseExcept keeps specified cells', () => {
		const pool = createCellPool();
		const container = document.createElement('div');
		pool.setContainers(container, container);

		pool.acquire('name', false);
		pool.acquire('age', false);
		pool.acquire('email', false);

		pool.releaseExcept(new Set(['name', 'email']));

		expect(pool.getActiveCells().has('name')).toBe(true);
		expect(pool.getActiveCells().has('email')).toBe(true);
		expect(pool.getActiveCells().has('age')).toBe(false);
	});

	test('updateContent only updates when value changes', () => {
		const pool = createCellPool();
		const container = document.createElement('div');
		pool.setContainers(container, container);

		const cell = pool.acquire('name', false);

		const changed1 = pool.updateContent(cell, 'Alice');
		expect(changed1).toBe(true);
		expect(cell.contentEl.textContent).toBe('Alice');

		const changed2 = pool.updateContent(cell, 'Alice');
		expect(changed2).toBe(false);

		const changed3 = pool.updateContent(cell, 'Bob');
		expect(changed3).toBe(true);
		expect(cell.contentEl.textContent).toBe('Bob');
	});
});

describe('RowPool', () => {
	test('creates and acquires rows', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		const row = pool.acquire(1);

		expect(row).toBeDefined();
		expect(row.element).toBeInstanceOf(dom.window.HTMLDivElement);
		expect(row.rowId).toBe(1);
		expect(row.inUse).toBe(true);
	});

	test('warmup pre-allocates rows', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		pool.warmup(10);

		const stats = pool.getStats();
		expect(stats.poolSize).toBe(10);
		expect(stats.activeCount).toBe(0);
		expect(stats.inactiveCount).toBe(10);
	});

	test('reuses rows after release', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		const row1 = pool.acquire(1);
		const element1 = row1.element;

		pool.release(1);

		const row2 = pool.acquire(2);

		// Should reuse the same element
		expect(row2.element).toBe(element1);
		expect(row2.rowId).toBe(2);
	});

	test('returns existing row for same rowId', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		const row1 = pool.acquire(1);
		const row2 = pool.acquire(1);

		expect(row1).toBe(row2);
	});

	test('releaseExcept keeps specified rows', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		pool.acquire(1);
		pool.acquire(2);
		pool.acquire(3);

		expect(pool.getActiveRows().size).toBe(3);

		pool.releaseExcept(new Set([1, 3]));

		expect(pool.getActiveRows().has(1)).toBe(true);
		expect(pool.getActiveRows().has(3)).toBe(true);
		expect(pool.getActiveRows().has(2)).toBe(false);
		expect(pool.getStats().activeCount).toBe(2);
	});

	test('getStats returns correct counts', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		pool.warmup(5);
		pool.acquire(1);
		pool.acquire(2);

		const stats = pool.getStats();
		expect(stats.poolSize).toBe(5);
		expect(stats.activeCount).toBe(2);
		expect(stats.inactiveCount).toBe(3);
	});

	test('rows have correct structure', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		const row = pool.acquire(1);

		expect(row.pinnedLeftEl).toBeInstanceOf(dom.window.HTMLDivElement);
		expect(row.scrollableEl).toBeInstanceOf(dom.window.HTMLDivElement);
		expect(row.cells).toBeDefined();
		expect(row.element.contains(row.pinnedLeftEl)).toBe(true);
		expect(row.element.contains(row.scrollableEl)).toBe(true);
	});

	test('destroy removes all elements from DOM', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });

		pool.warmup(5);
		pool.acquire(1);
		pool.acquire(2);

		expect(container.children.length).toBe(5);

		pool.destroy();

		expect(container.children.length).toBe(0);
		expect(pool.getStats().poolSize).toBe(0);
	});
});

describe('Pool Performance', () => {
	test('pool handles 1000 acquire/release cycles efficiently', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });
		pool.warmup(50);

		const start = performance.now();

		// Simulate scrolling through 1000 rows, 50 visible at a time
		for (let scroll = 0; scroll < 1000; scroll += 10) {
			const neededIds = new Set<number>();
			for (let i = scroll; i < scroll + 50 && i < 1000; i++) {
				neededIds.add(i);
				pool.acquire(i);
			}
			pool.releaseExcept(neededIds);
		}

		const duration = performance.now() - start;

		// Should complete in under 200ms (relaxed for CI environment variability)
		expect(duration).toBeLessThan(200);

		// Pool should have grown but stayed bounded
		const stats = pool.getStats();
		expect(stats.poolSize).toBeLessThanOrEqual(60); // 50 + some extra
	});

	test('no new elements created during scroll simulation', () => {
		const container = document.createElement('div');
		const pool = createRowPool(container, { rowHeight: 40 });
		// Need 70 rows: 50 visible + 20 overlap during scroll transitions
		pool.warmup(70);

		const initialPoolSize = pool.getStats().poolSize;

		// Simulate scrolling - needs up to 70 rows during transitions
		for (let scroll = 0; scroll < 500; scroll += 20) {
			const neededIds = new Set<number>();
			for (let i = scroll; i < scroll + 50 && i < 500; i++) {
				neededIds.add(i);
				pool.acquire(i);
			}
			pool.releaseExcept(neededIds);
		}

		const finalPoolSize = pool.getStats().poolSize;

		// Pool should not have grown
		expect(finalPoolSize).toBe(initialPoolSize);
	});
});
