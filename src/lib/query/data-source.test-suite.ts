/**
 * Shared test suite for DataSource implementations.
 *
 * Both LocalDataSource and PostgresDataSource implement the same interface,
 * so they should pass the same tests. This avoids test drift between implementations.
 *
 * Usage:
 * ```ts
 * import { createDataSourceTests } from './data-source.test-suite.js';
 *
 * createDataSourceTests({
 *   name: 'LocalDataSource',
 *   createDataSource: async () => createLocalDataSource(testData, 'id'),
 *   cleanup: async () => {}
 * });
 * ```
 */

import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import type { MutableDataSource, GridQueryRequest, FilterExpression } from './types.js';

export interface TestRow {
	id: number;
	name: string;
	age: number;
	email: string;
	active: boolean;
	createdAt?: Date;
	created_at?: Date; // Allow either naming convention
}

export const testData: Omit<TestRow, 'id'>[] = [
	{ name: 'Alice', age: 30, email: 'alice@example.com', active: true, createdAt: new Date('2023-01-15') },
	{ name: 'Bob', age: 25, email: 'bob@example.com', active: false, createdAt: new Date('2023-02-20') },
	{ name: 'Charlie', age: 35, email: 'charlie@example.com', active: true, createdAt: new Date('2023-03-10') },
	{ name: 'Diana', age: 28, email: 'diana@example.com', active: true, createdAt: new Date('2023-04-05') },
	{ name: 'Eve', age: 32, email: 'eve@example.com', active: false, createdAt: new Date('2023-05-12') },
];

export function createRequest(overrides?: Partial<GridQueryRequest>): GridQueryRequest {
	return {
		version: 1,
		requestId: 'test-1',
		pagination: { type: 'offset', offset: 0, limit: 100 },
		...overrides
	};
}

export interface DataSourceTestConfig<T extends TestRow> {
	/** Name for the test suite */
	name: string;
	/** Factory to create the data source with test data already loaded */
	createDataSource: () => Promise<MutableDataSource<T>>;
	/** Cleanup function called after each test */
	cleanup: (dataSource: MutableDataSource<T>) => Promise<void>;
	/** Skip certain tests if not supported */
	skip?: {
		search?: boolean;
		projection?: boolean;
	};
}

/**
 * Creates the standard DataSource test suite for an implementation.
 */
export function createDataSourceTests<T extends TestRow>(config: DataSourceTestConfig<T>) {
	describe(config.name, () => {
		let dataSource: MutableDataSource<T>;

		beforeEach(async () => {
			dataSource = await config.createDataSource();
		});

		afterEach(async () => {
			await config.cleanup(dataSource);
		});

		describe('basic queries', () => {
			test('returns all rows without filters', async () => {
				const result = await dataSource.getRows(createRequest());

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(5);
				}
			});

			test('returns row count when requested', async () => {
				const result = await dataSource.getRows(
					createRequest({ requires: { rowCount: true } })
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rowCount).toBe(5);
				}
			});

			test('respects pagination offset and limit', async () => {
				const result = await dataSource.getRows(
					createRequest({
						pagination: { type: 'offset', offset: 1, limit: 2 },
						sort: [{ field: 'id', direction: 'asc' }]
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(2);
					expect(result.data.rows[0].name).toBe('Bob');
					expect(result.data.rows[1].name).toBe('Charlie');
				}
			});

			test('respects range pagination', async () => {
				const result = await dataSource.getRows(
					createRequest({
						pagination: { type: 'range', startRow: 2, endRow: 4 },
						sort: [{ field: 'id', direction: 'asc' }]
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(2);
					expect(result.data.rows[0].name).toBe('Charlie');
					expect(result.data.rows[1].name).toBe('Diana');
				}
			});
		});

		describe('sorting', () => {
			test('sorts by single column ascending', async () => {
				const result = await dataSource.getRows(
					createRequest({
						sort: [{ field: 'age', direction: 'asc' }]
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows[0].name).toBe('Bob'); // age 25
					expect(result.data.rows[4].name).toBe('Charlie'); // age 35
				}
			});

			test('sorts by single column descending', async () => {
				const result = await dataSource.getRows(
					createRequest({
						sort: [{ field: 'age', direction: 'desc' }]
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows[0].name).toBe('Charlie'); // age 35
					expect(result.data.rows[4].name).toBe('Bob'); // age 25
				}
			});

			test('sorts by multiple columns', async () => {
				const result = await dataSource.getRows(
					createRequest({
						sort: [
							{ field: 'active', direction: 'desc' },
							{ field: 'age', direction: 'asc' }
						]
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					// Active users first, sorted by age
					expect(result.data.rows[0].name).toBe('Diana'); // active, age 28
					expect(result.data.rows[1].name).toBe('Alice'); // active, age 30
				}
			});

			test('sorts strings correctly', async () => {
				const result = await dataSource.getRows(
					createRequest({
						sort: [{ field: 'name', direction: 'asc' }]
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows[0].name).toBe('Alice');
					expect(result.data.rows[4].name).toBe('Eve');
				}
			});
		});

		describe('filtering', () => {
			test('filters with eq operator', async () => {
				const result = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'name', operator: 'eq', value: 'Alice' }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(1);
					expect(result.data.rows[0].name).toBe('Alice');
				}
			});

			test('filters with neq operator', async () => {
				const result = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'name', operator: 'neq', value: 'Alice' }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(4);
					expect(result.data.rows.every((r) => r.name !== 'Alice')).toBe(true);
				}
			});

			test('filters with gt operator', async () => {
				const result = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'age', operator: 'gt', value: 30 }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(2);
					expect(result.data.rows.every((r) => r.age > 30)).toBe(true);
				}
			});

			test('filters with between operator', async () => {
				const result = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'age', operator: 'between', value: [28, 32] }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(3);
					expect(result.data.rows.every((r) => r.age >= 28 && r.age <= 32)).toBe(true);
				}
			});

			test('filters with in operator', async () => {
				const result = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'name', operator: 'in', value: ['Alice', 'Bob'] }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(2);
				}
			});

			test('filters with contains operator (case insensitive)', async () => {
				const result = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'email', operator: 'contains', value: 'EXAMPLE' }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(5);
				}
			});

			test('filters with startsWith operator', async () => {
				const result = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'name', operator: 'startsWith', value: 'A' }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(1);
					expect(result.data.rows[0].name).toBe('Alice');
				}
			});

			test('filters with AND group', async () => {
				const filter: FilterExpression = {
					type: 'group',
					operator: 'and',
					conditions: [
						{ type: 'condition', field: 'active', operator: 'eq', value: true },
						{ type: 'condition', field: 'age', operator: 'gte', value: 30 }
					]
				};

				const result = await dataSource.getRows(createRequest({ filter }));

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(2);
					expect(result.data.rows.every((r) => r.active && r.age >= 30)).toBe(true);
				}
			});

			test('filters with OR group', async () => {
				const filter: FilterExpression = {
					type: 'group',
					operator: 'or',
					conditions: [
						{ type: 'condition', field: 'name', operator: 'eq', value: 'Alice' },
						{ type: 'condition', field: 'name', operator: 'eq', value: 'Bob' }
					]
				};

				const result = await dataSource.getRows(createRequest({ filter }));

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(2);
				}
			});

			test('filters with nested groups', async () => {
				const filter: FilterExpression = {
					type: 'group',
					operator: 'and',
					conditions: [
						{ type: 'condition', field: 'active', operator: 'eq', value: true },
						{
							type: 'group',
							operator: 'or',
							conditions: [
								{ type: 'condition', field: 'age', operator: 'lt', value: 30 },
								{ type: 'condition', field: 'age', operator: 'gt', value: 32 }
							]
						}
					]
				};

				const result = await dataSource.getRows(createRequest({ filter }));

				expect(result.success).toBe(true);
				if (result.success) {
					// Active AND (age < 30 OR age > 32)
					// Diana (28, active), Charlie (35, active)
					expect(result.data.rows).toHaveLength(2);
				}
			});
		});

		describe('search', () => {
			test('searches across specified fields', async () => {
				if (config.skip?.search) return;

				const result = await dataSource.getRows(
					createRequest({
						search: { query: 'alice', fields: ['name', 'email'] }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(1);
					expect(result.data.rows[0].name).toBe('Alice');
				}
			});

			test('searches with case insensitivity', async () => {
				if (config.skip?.search) return;

				const result = await dataSource.getRows(
					createRequest({
						search: { query: 'EXAMPLE', fields: ['email'] }
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.rows).toHaveLength(5);
				}
			});
		});

		describe('projection', () => {
			test('returns only specified fields', async () => {
				if (config.skip?.projection) return;

				const result = await dataSource.getRows(
					createRequest({
						projection: ['id', 'name']
					})
				);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(Object.keys(result.data.rows[0])).toEqual(['id', 'name']);
				}
			});
		});

		describe('distinct values', () => {
			test('returns distinct values for a field', async () => {
				const result = await dataSource.getDistinctValues!('active');

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toHaveLength(2);
					expect(result.data).toContain(true);
					expect(result.data).toContain(false);
				}
			});

			test('returns distinct values with filter', async () => {
				const result = await dataSource.getDistinctValues!('name', {
					type: 'condition',
					field: 'active',
					operator: 'eq',
					value: true
				});

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toHaveLength(3); // Alice, Charlie, Diana
				}
			});
		});

		describe('mutations', () => {
			test('inserts a new row', async () => {
				const newRow = {
					name: 'Frank',
					age: 40,
					email: 'frank@example.com',
					active: true,
					createdAt: new Date()
				};

				const result = await dataSource.mutate([{ type: 'insert', data: newRow as T }]);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toHaveLength(1);
				}

				const queryResult = await dataSource.getRows(
					createRequest({ requires: { rowCount: true } })
				);
				expect(queryResult.success && queryResult.data.rowCount).toBe(6);
			});

			test('updates an existing row', async () => {
				const result = await dataSource.mutate([
					{ type: 'update', rowId: 1, data: { name: 'Alicia' } }
				]);

				expect(result.success).toBe(true);

				const queryResult = await dataSource.getRows(
					createRequest({
						filter: { type: 'condition', field: 'id', operator: 'eq', value: 1 }
					})
				);
				expect(queryResult.success && queryResult.data.rows[0].name).toBe('Alicia');
			});

			test('deletes a row', async () => {
				const result = await dataSource.mutate([{ type: 'delete', rowId: 1 }]);

				expect(result.success).toBe(true);

				const queryResult = await dataSource.getRows(
					createRequest({ requires: { rowCount: true } })
				);
				expect(queryResult.success && queryResult.data.rowCount).toBe(4);
			});
		});

		describe('capabilities', () => {
			test('advertises correct capabilities', () => {
				expect(dataSource.capabilities.pagination.offset).toBe(true);
				expect(dataSource.capabilities.sort.enabled).toBe(true);
				expect(dataSource.capabilities.filter.enabled).toBe(true);
				expect(dataSource.capabilities.rowCount).toBe(true);
			});
		});

		describe('metadata', () => {
			test('includes duration in response', async () => {
				const result = await dataSource.getRows(createRequest());

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.meta?.duration).toBeGreaterThanOrEqual(0);
				}
			});
		});
	});
}
