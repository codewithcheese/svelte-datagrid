// Components
export { DataGrid } from './components/datagrid/index.js';
export type { DataGridProps } from './components/datagrid/index.js';

// Types
export * from './types/index.js';

// State
export { createGridState } from './state/grid-state.svelte.js';
export type { GridStateInstance, GridOptions } from './state/grid-state.svelte.js';

// Core utilities
export { createVirtualizer } from './core/virtualizer.js';
export type { Virtualizer, VirtualItem, VirtualizerOptions, VirtualizerResult } from './core/virtualizer.js';

// Query / Data Source
// Note: SortDirection is already exported from types (includes null for "no sort")
// Query module uses its own SortDirection internally ('asc' | 'desc' only)
export {
	// Classes
	LocalDataSource,
	createLocalDataSource,
	SqlBuilder,
	createSqlBuilder,
	PgLiteDataSource,
	createPgLiteDataSource,
	initializePgLiteSchema,
	seedPgLiteData,
	// Utility functions
	generateRequestId,
	createQueryRequest,
	rangeWindow,
	offsetPage,
	filterCondition,
	and,
	or,
	not
} from './query/index.js';

// Query types (excluding SortDirection to avoid conflict)
export type {
	ComparisonOperator,
	StringOperator,
	LogicalOperator,
	FilterCondition,
	FilterGroup,
	FilterExpression,
	NullsPosition,
	SortSpec,
	OffsetPagination,
	CursorPagination,
	RangeWindow,
	PaginationSpec,
	ResponseRequirements,
	GridQueryRequest,
	ResponseMeta,
	GridQueryResponse,
	DataSourceCapabilities,
	DataSourceError,
	DataSourceResult,
	DataSource,
	DataChangeEvent,
	RowMutation,
	MutableDataSource,
	LocalDataSourceOptions,
	SqlQuery,
	SqlBuilderOptions,
	PgLiteDatabase,
	PgLiteDataSourceOptions
} from './query/index.js';
