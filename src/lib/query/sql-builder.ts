/**
 * SQL Query Builder - Translates Grid Query Model to SQL
 *
 * This module converts GQM requests to parameterized SQL queries.
 * It's designed to be database-agnostic but optimized for PostgreSQL.
 */

import type {
	FilterCondition,
	FilterExpression,
	FilterGroup,
	GridQueryRequest,
	SortSpec
} from './types.js';

/** A parameterized SQL query */
export interface SqlQuery {
	/** The SQL statement with $1, $2, etc. placeholders */
	sql: string;
	/** Parameter values in order */
	params: unknown[];
}

/** Options for SQL generation */
export interface SqlBuilderOptions {
	/** Table or view name */
	table: string;
	/** Schema name (optional) */
	schema?: string;
	/** Column name mappings (grid field -> SQL column) */
	columnMap?: Record<string, string>;
	/** Default columns to select if no projection specified */
	defaultColumns?: string[];
	/** Column to use for row identity */
	idColumn?: string;
}

/**
 * Builds SQL queries from Grid Query Model requests.
 */
export class SqlBuilder {
	private readonly table: string;
	private readonly columnMap: Record<string, string>;
	private readonly defaultColumns: string[];
	private readonly idColumn: string;

	constructor(options: SqlBuilderOptions) {
		this.table = options.schema
			? `"${options.schema}"."${options.table}"`
			: `"${options.table}"`;
		this.columnMap = options.columnMap ?? {};
		this.defaultColumns = options.defaultColumns ?? ['*'];
		this.idColumn = options.idColumn ?? 'id';
	}

	/**
	 * Build a SELECT query from a grid request.
	 */
	buildSelect(request: GridQueryRequest): SqlQuery {
		const params: unknown[] = [];
		let paramIndex = 1;

		const nextParam = (value: unknown): string => {
			params.push(value);
			return `$${paramIndex++}`;
		};

		// SELECT clause
		const columns = request.projection ?? this.defaultColumns;
		const selectColumns = columns
			.map((c) => (c === '*' ? '*' : `"${this.mapColumn(c)}"`))
			.join(', ');

		let sql = `SELECT ${selectColumns} FROM ${this.table}`;

		// WHERE clause
		const whereClauses: string[] = [];

		if (request.filter) {
			const filterSql = this.buildFilterExpression(request.filter, nextParam);
			if (filterSql) {
				whereClauses.push(filterSql);
			}
		}

		if (request.search?.query) {
			const searchSql = this.buildSearchClause(
				request.search.query,
				request.search.fields,
				nextParam
			);
			if (searchSql) {
				whereClauses.push(searchSql);
			}
		}

		if (whereClauses.length > 0) {
			sql += ` WHERE ${whereClauses.join(' AND ')}`;
		}

		// ORDER BY clause
		if (request.sort && request.sort.length > 0) {
			const orderBy = this.buildOrderBy(request.sort);
			sql += ` ORDER BY ${orderBy}`;
		}

		// LIMIT/OFFSET clause
		const { limitSql, offsetValue, limitValue } = this.buildPagination(
			request.pagination,
			nextParam
		);
		if (limitSql) {
			sql += ` ${limitSql}`;
		}

		return { sql, params };
	}

	/**
	 * Build a COUNT query for getting total row count.
	 */
	buildCount(request: GridQueryRequest): SqlQuery {
		const params: unknown[] = [];
		let paramIndex = 1;

		const nextParam = (value: unknown): string => {
			params.push(value);
			return `$${paramIndex++}`;
		};

		let sql = `SELECT COUNT(*) as count FROM ${this.table}`;

		// WHERE clause (same as select, but no pagination)
		const whereClauses: string[] = [];

		if (request.filter) {
			const filterSql = this.buildFilterExpression(request.filter, nextParam);
			if (filterSql) {
				whereClauses.push(filterSql);
			}
		}

		if (request.search?.query) {
			const searchSql = this.buildSearchClause(
				request.search.query,
				request.search.fields,
				nextParam
			);
			if (searchSql) {
				whereClauses.push(searchSql);
			}
		}

		if (whereClauses.length > 0) {
			sql += ` WHERE ${whereClauses.join(' AND ')}`;
		}

		return { sql, params };
	}

	/**
	 * Build a DISTINCT query for filter dropdowns.
	 */
	buildDistinct(field: string, filter?: FilterExpression): SqlQuery {
		const params: unknown[] = [];
		let paramIndex = 1;

		const nextParam = (value: unknown): string => {
			params.push(value);
			return `$${paramIndex++}`;
		};

		const column = this.mapColumn(field);
		let sql = `SELECT DISTINCT "${column}" FROM ${this.table}`;

		const whereClauses: string[] = [];

		if (filter) {
			const filterSql = this.buildFilterExpression(filter, nextParam);
			if (filterSql) {
				whereClauses.push(filterSql);
			}
		}

		// Always exclude nulls from distinct values
		whereClauses.push(`"${column}" IS NOT NULL`);

		sql += ` WHERE ${whereClauses.join(' AND ')} ORDER BY "${column}"`;

		return { sql, params };
	}

	// =========================================================================
	// Private implementation
	// =========================================================================

	private mapColumn(field: string): string {
		return this.columnMap[field] ?? field;
	}

	private buildFilterExpression(
		filter: FilterExpression,
		nextParam: (value: unknown) => string
	): string {
		if (filter.type === 'condition') {
			return this.buildCondition(filter, nextParam);
		} else {
			return this.buildGroup(filter, nextParam);
		}
	}

	private buildCondition(
		condition: FilterCondition,
		nextParam: (value: unknown) => string
	): string {
		const column = `"${this.mapColumn(condition.field)}"`;
		const ignoreCase = condition.ignoreCase ?? true;

		// For case-insensitive string comparisons
		const columnExpr = ignoreCase ? `LOWER(${column}::text)` : column;
		const valueExpr = (value: unknown) =>
			ignoreCase && typeof value === 'string'
				? nextParam(value.toLowerCase())
				: nextParam(value);

		switch (condition.operator) {
			case 'eq':
				return `${column} = ${nextParam(condition.value)}`;

			case 'neq':
				return `${column} != ${nextParam(condition.value)}`;

			case 'gt':
				return `${column} > ${nextParam(condition.value)}`;

			case 'gte':
				return `${column} >= ${nextParam(condition.value)}`;

			case 'lt':
				return `${column} < ${nextParam(condition.value)}`;

			case 'lte':
				return `${column} <= ${nextParam(condition.value)}`;

			case 'in': {
				const values = condition.value as unknown[];
				const placeholders = values.map((v) => nextParam(v)).join(', ');
				return `${column} IN (${placeholders})`;
			}

			case 'notIn': {
				const values = condition.value as unknown[];
				const placeholders = values.map((v) => nextParam(v)).join(', ');
				return `${column} NOT IN (${placeholders})`;
			}

			case 'between': {
				const [min, max] = condition.value as [unknown, unknown];
				return `${column} BETWEEN ${nextParam(min)} AND ${nextParam(max)}`;
			}

			case 'isNull':
				return `${column} IS NULL`;

			case 'isNotNull':
				return `${column} IS NOT NULL`;

			case 'contains':
				return `${columnExpr} LIKE ${valueExpr(`%${condition.value}%`)}`;

			case 'notContains':
				return `${columnExpr} NOT LIKE ${valueExpr(`%${condition.value}%`)}`;

			case 'startsWith':
				return `${columnExpr} LIKE ${valueExpr(`${condition.value}%`)}`;

			case 'endsWith':
				return `${columnExpr} LIKE ${valueExpr(`%${condition.value}`)}`;

			case 'matches':
				// PostgreSQL regex
				return ignoreCase
					? `${column}::text ~* ${nextParam(condition.value)}`
					: `${column}::text ~ ${nextParam(condition.value)}`;

			default:
				return '1=1';
		}
	}

	private buildGroup(
		group: FilterGroup,
		nextParam: (value: unknown) => string
	): string {
		if (group.conditions.length === 0) {
			return '1=1';
		}

		const conditions = group.conditions
			.map((c) => this.buildFilterExpression(c, nextParam))
			.filter(Boolean);

		if (conditions.length === 0) {
			return '1=1';
		}

		switch (group.operator) {
			case 'and':
				return `(${conditions.join(' AND ')})`;

			case 'or':
				return `(${conditions.join(' OR ')})`;

			case 'not':
				return `NOT (${conditions.join(' OR ')})`;

			default:
				return '1=1';
		}
	}

	private buildSearchClause(
		query: string,
		fields: string[] | undefined,
		nextParam: (value: unknown) => string
	): string {
		const searchFields = fields ?? this.defaultColumns.filter((c) => c !== '*');

		if (searchFields.length === 0) {
			return '';
		}

		const conditions = searchFields.map((field) => {
			const column = this.mapColumn(field);
			return `LOWER("${column}"::text) LIKE ${nextParam(`%${query.toLowerCase()}%`)}`;
		});

		return `(${conditions.join(' OR ')})`;
	}

	private buildOrderBy(sorts: SortSpec[]): string {
		return sorts
			.map((sort) => {
				const column = this.mapColumn(sort.field);
				const direction = sort.direction.toUpperCase();
				const nulls = sort.nulls
					? `NULLS ${sort.nulls.toUpperCase()}`
					: sort.direction === 'asc'
						? 'NULLS LAST'
						: 'NULLS FIRST';

				return `"${column}" ${direction} ${nulls}`;
			})
			.join(', ');
	}

	private buildPagination(
		pagination: GridQueryRequest['pagination'],
		nextParam: (value: unknown) => string
	): { limitSql: string; offsetValue?: number; limitValue?: number } {
		switch (pagination.type) {
			case 'offset':
				return {
					limitSql: `LIMIT ${nextParam(pagination.limit)} OFFSET ${nextParam(pagination.offset)}`,
					offsetValue: pagination.offset,
					limitValue: pagination.limit
				};

			case 'range': {
				const limit = pagination.endRow - pagination.startRow;
				return {
					limitSql: `LIMIT ${nextParam(limit)} OFFSET ${nextParam(pagination.startRow)}`,
					offsetValue: pagination.startRow,
					limitValue: limit
				};
			}

			case 'cursor':
				// For cursor pagination, we'd need additional logic
				// For now, just use limit
				return {
					limitSql: `LIMIT ${nextParam(pagination.limit)}`,
					limitValue: pagination.limit
				};

			default:
				return { limitSql: '' };
		}
	}
}

/**
 * Create a SQL builder for a table.
 */
export function createSqlBuilder(options: SqlBuilderOptions): SqlBuilder {
	return new SqlBuilder(options);
}
