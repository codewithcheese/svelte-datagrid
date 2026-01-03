/**
 * PgLite Data Source - PostgreSQL adapter using PgLite (WebAssembly PostgreSQL)
 *
 * PgLite allows running a full PostgreSQL instance in the browser or Node.js.
 * This adapter translates Grid Query Model requests to SQL and executes them.
 *
 * @see https://github.com/electric-sql/pglite
 */

import type {
	DataSource,
	DataSourceCapabilities,
	DataSourceResult,
	FilterExpression,
	GridQueryRequest,
	GridQueryResponse,
	DataChangeEvent,
	MutableDataSource,
	RowMutation
} from './types.js';
import { SqlBuilder, type SqlBuilderOptions } from './sql-builder.js';

/**
 * Type definition for PgLite database instance.
 * We use a minimal interface to avoid hard dependency on @electric-sql/pglite.
 */
export interface PgLiteDatabase {
	query<T = Record<string, unknown>>(
		sql: string,
		params?: unknown[]
	): Promise<{ rows: T[] }>;
	exec(sql: string): Promise<void>;
}

/** Options for PgLiteDataSource */
export interface PgLiteDataSourceOptions extends SqlBuilderOptions {
	/** PgLite database instance */
	db: PgLiteDatabase;
	/** Enable query logging */
	debug?: boolean;
}

/**
 * PostgreSQL data source using PgLite.
 * Provides full SQL capabilities including joins, aggregations, etc.
 */
export class PgLiteDataSource<TRow extends Record<string, unknown>>
	implements MutableDataSource<TRow>
{
	readonly name = 'PgLiteDataSource';

	readonly capabilities: DataSourceCapabilities = {
		pagination: {
			offset: true,
			cursor: true, // Can implement with keyset pagination
			range: true
		},
		sort: {
			enabled: true,
			multiColumn: true,
			nullsPosition: true
		},
		filter: {
			enabled: true,
			operators: [
				'eq',
				'neq',
				'gt',
				'gte',
				'lt',
				'lte',
				'in',
				'notIn',
				'between',
				'isNull',
				'isNotNull',
				'contains',
				'notContains',
				'startsWith',
				'endsWith',
				'matches'
			],
			logicalOperators: ['and', 'or', 'not'],
			nestedGroups: true
		},
		grouping: {
			enabled: true,
			aggregations: ['sum', 'avg', 'min', 'max', 'count'],
			nestedGroups: true
		},
		search: {
			enabled: true,
			fullText: true // PostgreSQL has full-text search
		},
		rowCount: true,
		cancellation: false, // PgLite doesn't support query cancellation yet
		streaming: false
	};

	private readonly db: PgLiteDatabase;
	private readonly sqlBuilder: SqlBuilder;
	private readonly debug: boolean;
	private readonly table: string;
	private readonly idColumn: string;
	private subscribers: Set<(event: DataChangeEvent<TRow>) => void> = new Set();

	constructor(options: PgLiteDataSourceOptions) {
		this.db = options.db;
		this.sqlBuilder = new SqlBuilder(options);
		this.debug = options.debug ?? false;
		this.table = options.schema
			? `"${options.schema}"."${options.table}"`
			: `"${options.table}"`;
		this.idColumn = options.idColumn ?? 'id';
	}

	async getRows(
		request: GridQueryRequest,
		signal?: AbortSignal
	): Promise<DataSourceResult<GridQueryResponse<TRow>>> {
		const startTime = performance.now();

		try {
			// Build and execute the main query
			const query = this.sqlBuilder.buildSelect(request);
			this.logQuery('SELECT', query.sql, query.params);

			const result = await this.db.query<TRow>(query.sql, query.params);

			// Get total count if requested
			let rowCount: number | undefined;
			if (request.requires?.rowCount) {
				const countQuery = this.sqlBuilder.buildCount(request);
				this.logQuery('COUNT', countQuery.sql, countQuery.params);

				const countResult = await this.db.query<{ count: string }>(
					countQuery.sql,
					countQuery.params
				);
				rowCount = parseInt(countResult.rows[0]?.count ?? '0', 10);
			}

			// Get distinct values if requested
			let distinctValues: Record<string, unknown[]> | undefined;
			if (request.requires?.distinctValues) {
				distinctValues = {};
				for (const field of request.requires.distinctValues) {
					const distinctResult = await this.getDistinctValues(
						field,
						request.filter
					);
					if (distinctResult.success) {
						distinctValues[field] = distinctResult.data;
					}
				}
			}

			const duration = performance.now() - startTime;

			return {
				success: true,
				data: {
					rows: result.rows,
					rowCount,
					distinctValues,
					meta: {
						duration,
						cached: false
					}
				}
			};
		} catch (error) {
			this.logError('getRows failed', error);
			return {
				success: false,
				error: {
					code: 'QUERY_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error',
					details: error,
					retryable: this.isRetryable(error)
				}
			};
		}
	}

	async getDistinctValues(
		field: string,
		filter?: FilterExpression,
		signal?: AbortSignal
	): Promise<DataSourceResult<unknown[]>> {
		try {
			const query = this.sqlBuilder.buildDistinct(field, filter);
			this.logQuery('DISTINCT', query.sql, query.params);

			const result = await this.db.query<Record<string, unknown>>(
				query.sql,
				query.params
			);

			const values = result.rows.map((row) => row[field]);

			return { success: true, data: values };
		} catch (error) {
			this.logError('getDistinctValues failed', error);
			return {
				success: false,
				error: {
					code: 'DISTINCT_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error'
				}
			};
		}
	}

	async mutate(
		mutations: RowMutation<TRow>[],
		signal?: AbortSignal
	): Promise<DataSourceResult<(string | number)[]>> {
		try {
			const affectedIds: (string | number)[] = [];

			for (const mutation of mutations) {
				switch (mutation.type) {
					case 'insert': {
						const id = await this.insertRow(mutation.data as TRow);
						affectedIds.push(id);
						break;
					}

					case 'update': {
						await this.updateRow(mutation.rowId!, mutation.data!);
						affectedIds.push(mutation.rowId!);
						break;
					}

					case 'delete': {
						await this.deleteRow(mutation.rowId!);
						affectedIds.push(mutation.rowId!);
						break;
					}
				}
			}

			// Notify subscribers
			this.notifySubscribers({ type: 'refresh' });

			return { success: true, data: affectedIds };
		} catch (error) {
			this.logError('mutate failed', error);
			return {
				success: false,
				error: {
					code: 'MUTATION_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error',
					retryable: this.isRetryable(error)
				}
			};
		}
	}

	subscribe(callback: (event: DataChangeEvent<TRow>) => void): () => void {
		this.subscribers.add(callback);
		return () => this.subscribers.delete(callback);
	}

	destroy(): void {
		this.subscribers.clear();
	}

	// =========================================================================
	// Mutation helpers
	// =========================================================================

	private async insertRow(data: TRow): Promise<string | number> {
		const columns = Object.keys(data);
		const values = Object.values(data);
		const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
		const columnList = columns.map((c) => `"${c}"`).join(', ');

		const sql = `INSERT INTO ${this.table} (${columnList}) VALUES (${placeholders}) RETURNING "${this.idColumn}"`;

		this.logQuery('INSERT', sql, values);

		const result = await this.db.query<Record<string, unknown>>(sql, values);
		return result.rows[0][this.idColumn] as string | number;
	}

	private async updateRow(
		rowId: string | number,
		data: Partial<TRow>
	): Promise<void> {
		const columns = Object.keys(data);
		const values = Object.values(data);

		const setClause = columns
			.map((col, i) => `"${col}" = $${i + 1}`)
			.join(', ');

		const sql = `UPDATE ${this.table} SET ${setClause} WHERE "${this.idColumn}" = $${columns.length + 1}`;

		this.logQuery('UPDATE', sql, [...values, rowId]);

		await this.db.query(sql, [...values, rowId]);
	}

	private async deleteRow(rowId: string | number): Promise<void> {
		const sql = `DELETE FROM ${this.table} WHERE "${this.idColumn}" = $1`;

		this.logQuery('DELETE', sql, [rowId]);

		await this.db.query(sql, [rowId]);
	}

	// =========================================================================
	// Helpers
	// =========================================================================

	private notifySubscribers(event: DataChangeEvent<TRow>): void {
		for (const callback of this.subscribers) {
			callback(event);
		}
	}

	private isRetryable(error: unknown): boolean {
		// Could check for transient errors, connection issues, etc.
		return false;
	}

	private logQuery(type: string, sql: string, params: unknown[]): void {
		if (this.debug) {
			console.log(`[PgLite ${type}]`, sql, params);
		}
	}

	private logError(message: string, error: unknown): void {
		if (this.debug) {
			console.error(`[PgLite ERROR] ${message}:`, error);
		}
	}
}

/**
 * Create a PgLite data source for a table.
 */
export function createPgLiteDataSource<TRow extends Record<string, unknown>>(
	options: PgLiteDataSourceOptions
): PgLiteDataSource<TRow> {
	return new PgLiteDataSource(options);
}

/**
 * Helper to initialize a PgLite database with a schema.
 * Useful for testing.
 */
export async function initializePgLiteSchema(
	db: PgLiteDatabase,
	schema: string
): Promise<void> {
	await db.exec(schema);
}

/**
 * Helper to seed a PgLite database with test data.
 */
export async function seedPgLiteData<TRow extends Record<string, unknown>>(
	db: PgLiteDatabase,
	table: string,
	data: TRow[]
): Promise<void> {
	if (data.length === 0) return;

	const columns = Object.keys(data[0]);
	const columnList = columns.map((c) => `"${c}"`).join(', ');

	for (const row of data) {
		const values = columns.map((c) => row[c]);
		const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
		const sql = `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`;
		await db.query(sql, values);
	}
}
