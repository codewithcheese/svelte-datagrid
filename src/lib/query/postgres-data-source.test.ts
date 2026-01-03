import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { PostgresDataSource, createPostgresDataSource } from './postgres-data-source.js';
import type { GridQueryRequest, FilterExpression } from './types.js';

interface TestRow {
	id: number;
	name: string;
	age: number;
	email: string;
	active: boolean;
	created_at: Date;
}

const testData: Omit<TestRow, 'id'>[] = [
	{ name: 'Alice', age: 30, email: 'alice@example.com', active: true, created_at: new Date('2023-01-15') },
	{ name: 'Bob', age: 25, email: 'bob@example.com', active: false, created_at: new Date('2023-02-20') },
	{ name: 'Charlie', age: 35, email: 'charlie@example.com', active: true, created_at: new Date('2023-03-10') },
	{ name: 'Diana', age: 28, email: 'diana@example.com', active: true, created_at: new Date('2023-04-05') },
	{ name: 'Eve', age: 32, email: 'eve@example.com', active: false, created_at: new Date('2023-05-12') },
];

function createRequest(overrides?: Partial<GridQueryRequest>): GridQueryRequest {
	return {
		version: 1,
		requestId: 'test-1',
		pagination: { type: 'offset', offset: 0, limit: 100 },
		...overrides
	};
}

describe('PostgresDataSource', () => {
	let db: PGlite;
	let dataSource: PostgresDataSource<TestRow>;

	beforeEach(async () => {
		// Create in-memory PgLite database
		db = new PGlite();

		// Create schema
		await db.exec(`
			CREATE TABLE users (
				id SERIAL PRIMARY KEY,
				name TEXT NOT NULL,
				age INTEGER NOT NULL,
				email TEXT NOT NULL,
				active BOOLEAN NOT NULL DEFAULT true,
				created_at TIMESTAMP NOT NULL DEFAULT NOW()
			)
		`);

		// Seed data
		for (const row of testData) {
			await db.query(
				`INSERT INTO users (name, age, email, active, created_at) VALUES ($1, $2, $3, $4, $5)`,
				[row.name, row.age, row.email, row.active, row.created_at]
			);
		}

		// Create data source
		dataSource = createPostgresDataSource<TestRow>({
			connection: db,
			table: 'users',
			idColumn: 'id'
		});
	});

	afterEach(async () => {
		dataSource.destroy();
		await db.close();
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

	describe('distinct values', () => {
		test('returns distinct values for a field', async () => {
			const result = await dataSource.getDistinctValues('active');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
				expect(result.data).toContain(true);
				expect(result.data).toContain(false);
			}
		});

		test('returns distinct values with filter', async () => {
			const result = await dataSource.getDistinctValues('name', {
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
				created_at: new Date()
			};

			const result = await dataSource.mutate([{ type: 'insert', data: newRow as TestRow }]);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(1);
				expect(typeof result.data[0]).toBe('number');
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
			expect(dataSource.capabilities.pagination.cursor).toBe(true);
			expect(dataSource.capabilities.sort.enabled).toBe(true);
			expect(dataSource.capabilities.sort.multiColumn).toBe(true);
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
