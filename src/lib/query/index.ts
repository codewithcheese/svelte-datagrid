/**
 * Query Module - Decoupled data source architecture
 *
 * This module provides a backend-agnostic interface for data fetching.
 * The grid emits standardized query requests; data sources translate
 * them to their specific backend (in-memory, SQL, GraphQL, etc.).
 *
 * @example Local/in-memory data source (no backend needed)
 * ```ts
 * import { createLocalDataSource } from '$lib/query';
 *
 * const dataSource = createLocalDataSource(myData, 'id');
 * ```
 *
 * @example PostgreSQL via PgLite
 * ```ts
 * import { PGlite } from '@electric-sql/pglite';
 * import { createPgLiteDataSource } from '$lib/query';
 *
 * const db = new PGlite();
 * const dataSource = createPgLiteDataSource({ db, table: 'users' });
 * ```
 */

// Types
export type {
	// Filter types
	ComparisonOperator,
	StringOperator,
	LogicalOperator,
	FilterCondition,
	FilterGroup,
	FilterExpression,

	// Sort types
	SortDirection,
	NullsPosition,
	SortSpec,

	// Pagination types
	OffsetPagination,
	CursorPagination,
	RangeWindow,
	PaginationSpec,

	// Request/Response
	ResponseRequirements,
	GridQueryRequest,
	ResponseMeta,
	GridQueryResponse,

	// Data source interface
	DataSourceCapabilities,
	DataSourceError,
	DataSourceResult,
	DataSource,
	DataChangeEvent,
	RowMutation,
	MutableDataSource
} from './types.js';

// Local data source (in-memory)
export {
	LocalDataSource,
	createLocalDataSource,
	type LocalDataSourceOptions
} from './local-data-source.js';

// SQL query builder
export {
	SqlBuilder,
	createSqlBuilder,
	type SqlQuery,
	type SqlBuilderOptions
} from './sql-builder.js';

// PgLite data source
export {
	PgLiteDataSource,
	createPgLiteDataSource,
	initializePgLiteSchema,
	seedPgLiteData,
	type PgLiteDatabase,
	type PgLiteDataSourceOptions
} from './pglite-data-source.js';

// ============================================================================
// Utility functions
// ============================================================================

import type { GridQueryRequest, PaginationSpec } from './types.js';

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a basic query request with defaults.
 */
export function createQueryRequest(
	pagination: PaginationSpec,
	options?: Partial<Omit<GridQueryRequest, 'version' | 'requestId' | 'pagination'>>
): GridQueryRequest {
	return {
		version: 1,
		requestId: generateRequestId(),
		pagination,
		...options
	};
}

/**
 * Create a range pagination spec (for virtualization).
 */
export function rangeWindow(startRow: number, endRow: number): PaginationSpec {
	return { type: 'range', startRow, endRow };
}

/**
 * Create an offset pagination spec.
 */
export function offsetPage(offset: number, limit: number): PaginationSpec {
	return { type: 'offset', offset, limit };
}

/**
 * Create a filter condition helper.
 */
export function filterCondition(
	field: string,
	operator: import('./types.js').ComparisonOperator | import('./types.js').StringOperator,
	value: unknown
): import('./types.js').FilterCondition {
	return { type: 'condition', field, operator, value };
}

/**
 * Create an AND filter group.
 */
export function and(
	...conditions: import('./types.js').FilterExpression[]
): import('./types.js').FilterGroup {
	return { type: 'group', operator: 'and', conditions };
}

/**
 * Create an OR filter group.
 */
export function or(
	...conditions: import('./types.js').FilterExpression[]
): import('./types.js').FilterGroup {
	return { type: 'group', operator: 'or', conditions };
}

/**
 * Create a NOT filter group.
 */
export function not(
	...conditions: import('./types.js').FilterExpression[]
): import('./types.js').FilterGroup {
	return { type: 'group', operator: 'not', conditions };
}
