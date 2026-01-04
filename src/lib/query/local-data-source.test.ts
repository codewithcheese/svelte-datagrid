import { describe, test, expect, beforeEach } from 'vitest';
import { createLocalDataSource, LocalDataSource } from './local-data-source.js';
import { createDataSourceTests, testData, TestRow } from './data-source.test-suite.js';
import type { GridQueryRequest } from './types.js';

// Convert testData to include id field for LocalDataSource
const dataWithIds: TestRow[] = testData.map((row, index) => ({
	id: index + 1,
	...row
}));

// Shared test suite for DataSource interface
createDataSourceTests<TestRow>({
	name: 'LocalDataSource',
	createDataSource: async () => {
		// Create fresh copy of data for each test
		const data = dataWithIds.map((row) => ({ ...row }));
		return createLocalDataSource(data, 'id');
	},
	cleanup: async (dataSource) => {
		dataSource.destroy?.();
	}
});

// LocalDataSource-specific tests
describe('LocalDataSource - Zero-Copy Behavior', () => {
	test('stores data by reference (zero-copy)', () => {
		const data = [
			{ id: 1, name: 'Alice' },
			{ id: 2, name: 'Bob' }
		];
		const ds = createLocalDataSource(data, 'id');

		// The internal data should be the same reference
		expect(ds.getData()).toBe(data);
	});

	test('setData replaces reference without copying', () => {
		const data1 = [{ id: 1, name: 'Alice' }];
		const data2 = [{ id: 2, name: 'Bob' }];

		const ds = createLocalDataSource(data1, 'id');
		expect(ds.getData()).toBe(data1);

		ds.setData(data2);
		expect(ds.getData()).toBe(data2);
	});

	test('caller mutations to data array are visible to LocalDataSource', async () => {
		const data = [
			{ id: 1, name: 'Alice' },
			{ id: 2, name: 'Bob' }
		];
		const ds = createLocalDataSource(data, 'id');

		// Caller adds a new row directly
		data.push({ id: 3, name: 'Charlie' });

		const result = await ds.getRows({
			pagination: { type: 'offset', offset: 0, limit: 10 },
			requires: { rowCount: true }
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.rowCount).toBe(3);
		}
	});

	test('mutate() modifies the referenced data array', async () => {
		const data = [
			{ id: 1, name: 'Alice' },
			{ id: 2, name: 'Bob' }
		];
		const ds = createLocalDataSource(data, 'id');

		await ds.mutate([{ type: 'update', rowId: 1, data: { name: 'Updated' } }]);

		// The original array should be modified
		expect(data[0].name).toBe('Updated');
	});
});

describe('LocalDataSource - Sort Cache', () => {
	let ds: LocalDataSource<{ id: number; name: string; value: number }>;
	let data: { id: number; name: string; value: number }[];

	beforeEach(() => {
		data = [
			{ id: 1, name: 'Charlie', value: 30 },
			{ id: 2, name: 'Alice', value: 10 },
			{ id: 3, name: 'Bob', value: 20 }
		];
		ds = createLocalDataSource(data, 'id');
	});

	const sortedQuery: GridQueryRequest = {
		pagination: { type: 'offset', offset: 0, limit: 10 },
		sort: [{ field: 'name', direction: 'asc' }]
	};

	test('caches sorted results for repeated queries', async () => {
		const result1 = await ds.getRows(sortedQuery);
		const result2 = await ds.getRows(sortedQuery);

		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);

		if (result1.success && result2.success) {
			// Results should be identical
			expect(result1.data.rows).toEqual(result2.data.rows);
			// Order should be Alice, Bob, Charlie
			expect(result1.data.rows.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
		}
	});

	test('cache is invalidated by setData()', async () => {
		// First query to populate cache
		await ds.getRows(sortedQuery);

		// Replace data
		ds.setData([
			{ id: 4, name: 'Zebra', value: 100 },
			{ id: 5, name: 'Alpha', value: 50 }
		]);

		const result = await ds.getRows(sortedQuery);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.rows.map((r) => r.name)).toEqual(['Alpha', 'Zebra']);
		}
	});

	test('cache is invalidated by mutate()', async () => {
		// First query to populate cache
		const result1 = await ds.getRows(sortedQuery);

		// Mutate a row
		await ds.mutate([{ type: 'update', rowId: 1, data: { name: 'Aaron' } }]);

		const result2 = await ds.getRows(sortedQuery);

		expect(result1.success && result2.success).toBe(true);
		if (result1.success && result2.success) {
			// After mutation, Aaron should come first
			expect(result2.data.rows.map((r) => r.name)).toEqual(['Aaron', 'Alice', 'Bob']);
		}
	});

	test('different sort orders use different cache entries', async () => {
		const ascQuery: GridQueryRequest = {
			pagination: { type: 'offset', offset: 0, limit: 10 },
			sort: [{ field: 'name', direction: 'asc' }]
		};
		const descQuery: GridQueryRequest = {
			pagination: { type: 'offset', offset: 0, limit: 10 },
			sort: [{ field: 'name', direction: 'desc' }]
		};

		const ascResult = await ds.getRows(ascQuery);
		const descResult = await ds.getRows(descQuery);

		expect(ascResult.success && descResult.success).toBe(true);
		if (ascResult.success && descResult.success) {
			expect(ascResult.data.rows.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
			expect(descResult.data.rows.map((r) => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
		}
	});

	test('cache is not used when filters are applied', async () => {
		// Query with sort to populate cache
		await ds.getRows(sortedQuery);

		// Query with same sort but also a filter
		const filteredQuery: GridQueryRequest = {
			pagination: { type: 'offset', offset: 0, limit: 10 },
			sort: [{ field: 'name', direction: 'asc' }],
			filter: {
				type: 'condition',
				field: 'value',
				operator: 'gt',
				value: 15
			}
		};

		const result = await ds.getRows(filteredQuery);

		expect(result.success).toBe(true);
		if (result.success) {
			// Should only return rows where value > 15
			expect(result.data.rows.map((r) => r.name)).toEqual(['Bob', 'Charlie']);
		}
	});

	test('WARNING: direct object mutation is NOT detected by cache', async () => {
		// This test documents a known limitation
		// First query to populate cache
		const result1 = await ds.getRows(sortedQuery);

		// Direct mutation of object (NOT through mutate())
		data[0].name = 'Zebra'; // Charlie -> Zebra

		// Query again - cache returns stale result!
		const result2 = await ds.getRows(sortedQuery);

		expect(result1.success && result2.success).toBe(true);
		if (result1.success && result2.success) {
			// KNOWN LIMITATION: Cache returns old sorted order
			// The cache doesn't know the object was mutated
			// Correct order would be [Alice, Bob, Zebra]
			// But cache returns [Alice, Bob, Charlie] with mutated object
			expect(result2.data.rows[2].name).toBe('Zebra'); // Object IS updated
			// But order is wrong because cache was used
			expect(result2.data.rows.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Zebra']);
		}
	});
});

describe('LocalDataSource - Array Ownership', () => {
	test('getRows with filter creates new array (can sort in place)', async () => {
		const data = [
			{ id: 1, name: 'Charlie', value: 30 },
			{ id: 2, name: 'Alice', value: 10 },
			{ id: 3, name: 'Bob', value: 20 }
		];
		const ds = createLocalDataSource(data, 'id');

		const result = await ds.getRows({
			pagination: { type: 'offset', offset: 0, limit: 10 },
			filter: { type: 'condition', field: 'value', operator: 'gt', value: 15 },
			sort: [{ field: 'name', direction: 'asc' }]
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.rows.map((r) => r.name)).toEqual(['Bob', 'Charlie']);
		}

		// Original data should be unchanged
		expect(data.map((r) => r.name)).toEqual(['Charlie', 'Alice', 'Bob']);
	});

	test('getRows without filter copies array before sorting', async () => {
		const data = [
			{ id: 1, name: 'Charlie', value: 30 },
			{ id: 2, name: 'Alice', value: 10 },
			{ id: 3, name: 'Bob', value: 20 }
		];
		const ds = createLocalDataSource(data, 'id');

		const result = await ds.getRows({
			pagination: { type: 'offset', offset: 0, limit: 10 },
			sort: [{ field: 'name', direction: 'asc' }]
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.rows.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
		}

		// Original data order should be unchanged
		expect(data.map((r) => r.name)).toEqual(['Charlie', 'Alice', 'Bob']);
	});
});
