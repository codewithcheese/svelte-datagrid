import { describe, bench } from 'vitest';
import { createVirtualizer } from '../core/virtualizer.js';

// Helper to generate test data
function generateData(count: number) {
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		name: `Item ${i}`,
		value: Math.random() * 1000,
		date: new Date(Date.now() - i * 86400000).toISOString()
	}));
}

describe('Virtualizer Performance', () => {
	const ITERATIONS = 1000;

	bench('createVirtualizer initialization', () => {
		createVirtualizer({
			count: 100000,
			itemSize: 40
		});
	});

	bench('getTotalSize (fixed, 100K items)', () => {
		const virtualizer = createVirtualizer({
			count: 100000,
			itemSize: 40
		});
		virtualizer.getTotalSize();
	});

	bench('getVirtualItems (fixed, 100K items)', () => {
		const virtualizer = createVirtualizer({
			count: 100000,
			itemSize: 40,
			overscan: 5
		});
		// Simulate random scroll positions
		for (let i = 0; i < 100; i++) {
			const scrollTop = Math.random() * 3900000;
			virtualizer.getVirtualItems(scrollTop, 600);
		}
	});

	bench('getScrollOffset (fixed, 100K items)', () => {
		const virtualizer = createVirtualizer({
			count: 100000,
			itemSize: 40
		});
		for (let i = 0; i < 1000; i++) {
			const index = Math.floor(Math.random() * 100000);
			virtualizer.getScrollOffset(index, 'center', 600);
		}
	});

	bench('getIndexAtOffset (fixed, 100K items)', () => {
		const virtualizer = createVirtualizer({
			count: 100000,
			itemSize: 40
		});
		for (let i = 0; i < 1000; i++) {
			const offset = Math.random() * 4000000;
			virtualizer.getIndexAtOffset(offset);
		}
	});
});

describe('Data Generation Performance', () => {
	bench('generate 1K rows', () => {
		generateData(1000);
	});

	bench('generate 10K rows', () => {
		generateData(10000);
	});

	bench('generate 100K rows', () => {
		generateData(100000);
	});
});

describe('Sorting Performance', () => {
	const data10K = generateData(10000);
	const data100K = generateData(100000);

	bench('sort 10K rows by string (localeCompare)', () => {
		const copy = [...data10K];
		copy.sort((a, b) => a.name.localeCompare(b.name));
	});

	bench('sort 10K rows by number', () => {
		const copy = [...data10K];
		copy.sort((a, b) => a.value - b.value);
	});

	bench('sort 100K rows by string (localeCompare)', () => {
		const copy = [...data100K];
		copy.sort((a, b) => a.name.localeCompare(b.name));
	});

	bench('sort 100K rows by number', () => {
		const copy = [...data100K];
		copy.sort((a, b) => a.value - b.value);
	});
});

describe('Filtering Performance', () => {
	const data10K = generateData(10000);
	const data100K = generateData(100000);

	bench('filter 10K rows (contains)', () => {
		data10K.filter((row) => row.name.toLowerCase().includes('item 5'));
	});

	bench('filter 10K rows (number comparison)', () => {
		data10K.filter((row) => row.value > 500);
	});

	bench('filter 100K rows (contains)', () => {
		data100K.filter((row) => row.name.toLowerCase().includes('item 5'));
	});

	bench('filter 100K rows (number comparison)', () => {
		data100K.filter((row) => row.value > 500);
	});
});

describe('Selection Operations', () => {
	bench('create Set with 1K items', () => {
		new Set(Array.from({ length: 1000 }, (_, i) => i));
	});

	bench('create Set with 10K items', () => {
		new Set(Array.from({ length: 10000 }, (_, i) => i));
	});

	bench('Set.has() 10K lookups on 10K Set', () => {
		const set = new Set(Array.from({ length: 10000 }, (_, i) => i));
		for (let i = 0; i < 10000; i++) {
			set.has(Math.floor(Math.random() * 10000));
		}
	});

	bench('toggle selection in 10K Set', () => {
		const set = new Set(Array.from({ length: 10000 }, (_, i) => i));
		for (let i = 0; i < 1000; i++) {
			const id = Math.floor(Math.random() * 10000);
			if (set.has(id)) {
				set.delete(id);
			} else {
				set.add(id);
			}
		}
	});
});

describe('Column Width Calculations', () => {
	const columnWidths = new Map(
		Array.from({ length: 50 }, (_, i) => [`col-${i}`, 100 + Math.random() * 200])
	);

	bench('calculate total width (50 columns)', () => {
		let total = 0;
		for (const width of columnWidths.values()) {
			total += width;
		}
		// Don't return - bench functions should return void
		void total;
	});

	bench('Map.get() 1K lookups', () => {
		for (let i = 0; i < 1000; i++) {
			columnWidths.get(`col-${i % 50}`);
		}
	});
});
