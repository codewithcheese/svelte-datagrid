import { describe, bench } from 'vitest';
import { createVirtualizer } from '../core/virtualizer.js';

// ============================================================================
// Data generation helpers
// ============================================================================

// Old approach (for comparison) - uses Date objects and Math.random()
function generateDataOld(count: number) {
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		name: `Item ${i}`,
		value: Math.random() * 1000,
		date: new Date(Date.now() - i * 86400000).toISOString()
	}));
}

// Optimized approach - uses timestamps and deterministic patterns
const BASE_TIMESTAMP = Date.now();
const DAY_MS = 86400000;

function generateDataOptimized(count: number) {
	const data = new Array(count);
	for (let i = 0; i < count; i++) {
		data[i] = {
			id: i,
			name: 'Item ' + i,
			value: (i * 7919) % 1000,
			date: BASE_TIMESTAMP - i * DAY_MS
		};
	}
	return data;
}

// Full Person record (like demo page)
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
const FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const EMAIL_SUFFIX = '@example.com';
const BASE_DATE = new Date(2015, 0, 1).getTime();

function generatePersonData(count: number) {
	const data = new Array(count);
	const deptLen = DEPARTMENTS.length;
	const firstLen = FIRST_NAMES.length;
	const lastLen = LAST_NAMES.length;

	for (let i = 0; i < count; i++) {
		data[i] = {
			id: i + 1,
			firstName: FIRST_NAMES[i % firstLen],
			lastName: LAST_NAMES[Math.floor(i / firstLen) % lastLen],
			age: 22 + (i % 43),
			email: 'user' + (i + 1) + EMAIL_SUFFIX,
			department: DEPARTMENTS[i % deptLen],
			salary: 50000 + ((i * 7919) % 100000),
			startDate: BASE_DATE + ((i % 3650) * DAY_MS),
			isActive: i % 5 !== 0
		};
	}
	return data;
}

// ============================================================================
// Virtualizer benchmarks
// ============================================================================

describe('Virtualizer Performance', () => {
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

	// Test with 10M items
	bench('createVirtualizer (10M items)', () => {
		createVirtualizer({
			count: 10000000,
			itemSize: 40
		});
	});

	bench('getVirtualItems (10M items, 100 scrolls)', () => {
		const virtualizer = createVirtualizer({
			count: 10000000,
			itemSize: 40,
			overscan: 5
		});
		for (let i = 0; i < 100; i++) {
			const scrollTop = Math.random() * 399999600;
			virtualizer.getVirtualItems(scrollTop, 600);
		}
	});
});

// ============================================================================
// Data generation benchmarks
// ============================================================================

describe('Data Generation Performance (Old vs Optimized)', () => {
	bench('OLD: generate 10K rows', () => {
		generateDataOld(10000);
	});

	bench('OPTIMIZED: generate 10K rows', () => {
		generateDataOptimized(10000);
	});

	bench('OLD: generate 100K rows', () => {
		generateDataOld(100000);
	});

	bench('OPTIMIZED: generate 100K rows', () => {
		generateDataOptimized(100000);
	});
});

describe('Data Generation at Scale', () => {
	bench('generate 1K rows (Person)', () => {
		generatePersonData(1000);
	});

	bench('generate 10K rows (Person)', () => {
		generatePersonData(10000);
	});

	bench('generate 100K rows (Person)', () => {
		generatePersonData(100000);
	});

	bench('generate 1M rows (Person)', () => {
		generatePersonData(1000000);
	});

	// Note: 10M takes ~3-5 seconds
	bench('generate 10M rows (Person)', () => {
		generatePersonData(10000000);
	});
});

// ============================================================================
// Sorting benchmarks
// ============================================================================

describe('Sorting Performance', () => {
	const data10K = generatePersonData(10000);
	const data100K = generatePersonData(100000);
	const data1M = generatePersonData(1000000);

	bench('sort 10K rows by string (localeCompare)', () => {
		const copy = data10K.slice();
		copy.sort((a, b) => a.firstName.localeCompare(b.firstName));
	});

	bench('sort 10K rows by number', () => {
		const copy = data10K.slice();
		copy.sort((a, b) => a.salary - b.salary);
	});

	bench('sort 100K rows by string (localeCompare)', () => {
		const copy = data100K.slice();
		copy.sort((a, b) => a.firstName.localeCompare(b.firstName));
	});

	bench('sort 100K rows by number', () => {
		const copy = data100K.slice();
		copy.sort((a, b) => a.salary - b.salary);
	});

	bench('sort 1M rows by number', () => {
		const copy = data1M.slice();
		copy.sort((a, b) => a.salary - b.salary);
	});
});

// ============================================================================
// Filtering benchmarks
// ============================================================================

describe('Filtering Performance', () => {
	const data10K = generatePersonData(10000);
	const data100K = generatePersonData(100000);
	const data1M = generatePersonData(1000000);

	bench('filter 10K rows (contains)', () => {
		data10K.filter((row) => row.firstName.toLowerCase().includes('john'));
	});

	bench('filter 10K rows (number comparison)', () => {
		data10K.filter((row) => row.salary > 100000);
	});

	bench('filter 100K rows (contains)', () => {
		data100K.filter((row) => row.firstName.toLowerCase().includes('john'));
	});

	bench('filter 100K rows (number comparison)', () => {
		data100K.filter((row) => row.salary > 100000);
	});

	bench('filter 1M rows (number comparison)', () => {
		data1M.filter((row) => row.salary > 100000);
	});
});

// ============================================================================
// Selection operations benchmarks
// ============================================================================

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

// ============================================================================
// Column width calculations benchmarks
// ============================================================================

describe('Column Width Calculations', () => {
	const columnWidths = new Map(
		Array.from({ length: 50 }, (_, i) => [`col-${i}`, 100 + Math.random() * 200])
	);

	bench('calculate total width (50 columns)', () => {
		let total = 0;
		for (const width of columnWidths.values()) {
			total += width;
		}
		void total;
	});

	bench('Map.get() 1K lookups', () => {
		for (let i = 0; i < 1000; i++) {
			columnWidths.get(`col-${i % 50}`);
		}
	});
});

// ============================================================================
// Array operations benchmarks (copy vs reference)
// ============================================================================

describe('Array Copy Performance', () => {
	const data100K = generatePersonData(100000);
	const data1M = generatePersonData(1000000);

	bench('spread copy 100K rows', () => {
		const copy = [...data100K];
		void copy;
	});

	bench('slice copy 100K rows', () => {
		const copy = data100K.slice();
		void copy;
	});

	bench('spread copy 1M rows', () => {
		const copy = [...data1M];
		void copy;
	});

	bench('slice copy 1M rows', () => {
		const copy = data1M.slice();
		void copy;
	});

	bench('slice subset 1M rows (first 100)', () => {
		const copy = data1M.slice(0, 100);
		void copy;
	});

	bench('slice subset 1M rows (middle 100)', () => {
		const copy = data1M.slice(500000, 500100);
		void copy;
	});
});
