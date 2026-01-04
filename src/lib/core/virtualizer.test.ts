import { describe, it, expect } from 'vitest';
import { createVirtualizer } from './virtualizer.js';

describe('createVirtualizer', () => {
	describe('with fixed item size', () => {
		it('calculates total size correctly', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40
			});

			expect(virtualizer.getTotalSize()).toBe(4000);
		});

		it('calculates total size with padding', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40,
				paddingStart: 10,
				paddingEnd: 20
			});

			expect(virtualizer.getTotalSize()).toBe(4030);
		});

		it('returns empty array for zero items', () => {
			const virtualizer = createVirtualizer({
				count: 0,
				itemSize: 40
			});

			const result = virtualizer.getVirtualItems(0, 400);
			expect(result.virtualItems).toEqual([]);
			expect(result.totalSize).toBe(0);
		});

		it('returns correct virtual items for scroll position 0', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40,
				overscan: 2
			});

			const result = virtualizer.getVirtualItems(0, 200);

			// Should render items 0-6 (visible 0-4 + 2 overscan)
			expect(result.virtualItems.length).toBeGreaterThanOrEqual(5);
			expect(result.virtualItems[0].index).toBe(0);
			expect(result.virtualItems[0].start).toBe(0);
			expect(result.virtualItems[0].size).toBe(40);
		});

		it('returns correct virtual items for scrolled position', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40,
				overscan: 2
			});

			const result = virtualizer.getVirtualItems(400, 200);

			// Scroll of 400px with 40px items = start at item 10
			// With overscan of 2, should start at item 8
			expect(result.startIndex).toBe(8);
			expect(result.virtualItems[0].index).toBe(8);
			expect(result.virtualItems[0].start).toBe(320);
		});

		it('handles end of list correctly', () => {
			const virtualizer = createVirtualizer({
				count: 20,
				itemSize: 40,
				overscan: 2
			});

			// Scroll to near the end
			const result = virtualizer.getVirtualItems(600, 200);

			// Should not exceed bounds
			expect(result.endIndex).toBeLessThanOrEqual(19);
			const lastItem = result.virtualItems[result.virtualItems.length - 1];
			expect(lastItem.index).toBe(19);
		});

		it('calculates scroll offset for index', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40
			});

			expect(virtualizer.getScrollOffset(0)).toBe(0);
			expect(virtualizer.getScrollOffset(10)).toBe(400);
			expect(virtualizer.getScrollOffset(50)).toBe(2000);
		});

		it('calculates centered scroll offset', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40
			});

			// Item at index 10 starts at 400px
			// To center: 400 - 200/2 + 40/2 = 400 - 100 + 20 = 320
			const offset = virtualizer.getScrollOffset(10, 'center', 200);
			expect(offset).toBe(320);
		});

		it('finds index at offset', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40
			});

			expect(virtualizer.getIndexAtOffset(0)).toBe(0);
			expect(virtualizer.getIndexAtOffset(40)).toBe(1);
			expect(virtualizer.getIndexAtOffset(100)).toBe(2);
			expect(virtualizer.getIndexAtOffset(399)).toBe(9);
			expect(virtualizer.getIndexAtOffset(400)).toBe(10);
		});
	});

	describe('with variable item size', () => {
		const getVariableSize = (index: number) => (index % 2 === 0 ? 40 : 60);

		it('calculates total size correctly', () => {
			const virtualizer = createVirtualizer({
				count: 10,
				itemSize: getVariableSize
			});

			// 5 even (40px) + 5 odd (60px) = 200 + 300 = 500
			expect(virtualizer.getTotalSize()).toBe(500);
		});

		it('returns correct virtual items for variable heights', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: getVariableSize,
				overscan: 1
			});

			const result = virtualizer.getVirtualItems(0, 100);

			expect(result.virtualItems[0].index).toBe(0);
			expect(result.virtualItems[0].size).toBe(40);
			expect(result.virtualItems[1].index).toBe(1);
			expect(result.virtualItems[1].size).toBe(60);
			expect(result.virtualItems[1].start).toBe(40);
		});

		it('calculates scroll offset for variable sizes', () => {
			const virtualizer = createVirtualizer({
				count: 10,
				itemSize: getVariableSize
			});

			// Index 0: 0
			// Index 1: 40
			// Index 2: 40 + 60 = 100
			// Index 3: 100 + 40 = 140
			expect(virtualizer.getScrollOffset(0)).toBe(0);
			expect(virtualizer.getScrollOffset(1)).toBe(40);
			expect(virtualizer.getScrollOffset(2)).toBe(100);
			expect(virtualizer.getScrollOffset(3)).toBe(140);
		});
	});

	describe('with custom keys', () => {
		it('uses custom key getter', () => {
			const virtualizer = createVirtualizer({
				count: 10,
				itemSize: 40,
				getItemKey: (i) => `item-${i}`
			});

			const result = virtualizer.getVirtualItems(0, 200);

			expect(result.virtualItems[0].key).toBe('item-0');
			expect(result.virtualItems[1].key).toBe('item-1');
		});
	});

	describe('edge cases', () => {
		it('handles single item', () => {
			const virtualizer = createVirtualizer({
				count: 1,
				itemSize: 40
			});

			const result = virtualizer.getVirtualItems(0, 400);
			expect(result.virtualItems.length).toBe(1);
			expect(result.virtualItems[0].index).toBe(0);
		});

		it('handles container larger than content', () => {
			const virtualizer = createVirtualizer({
				count: 5,
				itemSize: 40
			});

			const result = virtualizer.getVirtualItems(0, 1000);
			expect(result.virtualItems.length).toBe(5);
		});

		it('handles scroll beyond content', () => {
			const virtualizer = createVirtualizer({
				count: 10,
				itemSize: 40,
				overscan: 0
			});

			// When scrolled past the end, should return last visible items
			// Total height = 400px, scrolling to 1000 is way past
			const result = virtualizer.getVirtualItems(1000, 200);
			// The virtualizer returns items near the end when scrolled past
			expect(result.totalSize).toBe(400);
			expect(result.endIndex).toBeLessThanOrEqual(9);
		});

		it('handles negative scroll', () => {
			const virtualizer = createVirtualizer({
				count: 100,
				itemSize: 40
			});

			// Should treat as 0
			expect(virtualizer.getIndexAtOffset(-100)).toBe(0);
		});

		it('handles out of bounds index for scroll offset', () => {
			const virtualizer = createVirtualizer({
				count: 10,
				itemSize: 40
			});

			expect(virtualizer.getScrollOffset(-1)).toBe(0);
			expect(virtualizer.getScrollOffset(100)).toBe(0);
		});
	});
});
