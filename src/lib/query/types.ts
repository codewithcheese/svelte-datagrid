/**
 * Grid Query Model (GQM) - Backend-agnostic query types
 *
 * This module defines the stable contract between the DataGrid and any data source.
 * The grid emits requests using these types; data sources implement responses.
 */

// ============================================================================
// Filter Expression Tree
// ============================================================================

/** Comparison operators for filter conditions */
export type ComparisonOperator =
	| 'eq' // equals
	| 'neq' // not equals
	| 'gt' // greater than
	| 'gte' // greater than or equal
	| 'lt' // less than
	| 'lte' // less than or equal
	| 'in' // in array
	| 'notIn' // not in array
	| 'between' // between two values
	| 'isNull' // is null
	| 'isNotNull'; // is not null

/** String-specific operators */
export type StringOperator =
	| 'contains'
	| 'notContains'
	| 'startsWith'
	| 'endsWith'
	| 'matches'; // regex

/** Logical operators for combining conditions */
export type LogicalOperator = 'and' | 'or' | 'not';

/** A single filter condition */
export interface FilterCondition {
	type: 'condition';
	field: string;
	operator: ComparisonOperator | StringOperator;
	value: unknown;
	/** Case-insensitive string matching (default: true) */
	ignoreCase?: boolean;
}

/** A logical group of filter expressions */
export interface FilterGroup {
	type: 'group';
	operator: LogicalOperator;
	conditions: FilterExpression[];
}

/** A filter expression is either a condition or a group */
export type FilterExpression = FilterCondition | FilterGroup;

// ============================================================================
// Sort Model
// ============================================================================

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Null handling in sort */
export type NullsPosition = 'first' | 'last';

/** A single sort specification */
export interface SortSpec {
	field: string;
	direction: SortDirection;
	/** Where to place nulls (default: 'last' for asc, 'first' for desc) */
	nulls?: NullsPosition;
}

// ============================================================================
// Pagination / Windowing
// ============================================================================

/** Offset-based pagination (traditional) */
export interface OffsetPagination {
	type: 'offset';
	offset: number;
	limit: number;
}

/** Cursor-based pagination (stable for large datasets) */
export interface CursorPagination {
	type: 'cursor';
	cursor?: string;
	limit: number;
	direction?: 'forward' | 'backward';
}

/** Range-based windowing (for virtualization) */
export interface RangeWindow {
	type: 'range';
	startRow: number;
	endRow: number;
}

export type PaginationSpec = OffsetPagination | CursorPagination | RangeWindow;

// ============================================================================
// Query Request
// ============================================================================

/** What metadata the grid needs in the response */
export interface ResponseRequirements {
	/** Include total row count? */
	rowCount?: boolean;
	/** Include group counts? (for grouped data) */
	groupCount?: boolean;
	/** Include distinct values for a field? (for filter dropdowns) */
	distinctValues?: string[];
}

/** The complete query request from the grid */
export interface GridQueryRequest {
	/** Schema version for forward compatibility */
	version: 1;

	/** Unique request ID for cancellation/ordering */
	requestId: string;

	/** Pagination/windowing specification */
	pagination: PaginationSpec;

	/** Sort specifications (ordered by priority) */
	sort?: SortSpec[];

	/** Filter expression tree */
	filter?: FilterExpression;

	/** Fields to include (projection). If omitted, include all. */
	projection?: string[];

	/** What metadata to include in response */
	requires?: ResponseRequirements;

	/** Grouping specification (for grouped grids) */
	groupBy?: string[];

	/** Search query (global text search) */
	search?: {
		query: string;
		fields?: string[];
	};
}

// ============================================================================
// Query Response
// ============================================================================

/** Response metadata */
export interface ResponseMeta {
	/** Time taken by the data source (ms) */
	duration?: number;
	/** Whether results are partial (e.g., timeout) */
	partial?: boolean;
	/** Warnings (e.g., deprecated field) */
	warnings?: string[];
	/** Cache status */
	cached?: boolean;
}

/** The complete query response to the grid */
export interface GridQueryResponse<TRow = Record<string, unknown>> {
	/** The data rows */
	rows: TRow[];

	/** Total row count (if requested) */
	rowCount?: number;

	/** Next cursor (for cursor pagination) */
	nextCursor?: string;

	/** Previous cursor (for backward navigation) */
	prevCursor?: string;

	/** Distinct values (if requested) */
	distinctValues?: Record<string, unknown[]>;

	/** Group counts (if requested) */
	groupCounts?: Record<string, number>;

	/** Response metadata */
	meta?: ResponseMeta;
}

// ============================================================================
// Data Source Capabilities
// ============================================================================

/** What the data source can do server-side */
export interface DataSourceCapabilities {
	/** Pagination styles supported */
	pagination: {
		offset?: boolean;
		cursor?: boolean;
		range?: boolean;
	};

	/** Sorting capabilities */
	sort: {
		enabled: boolean;
		multiColumn?: boolean;
		nullsPosition?: boolean;
	};

	/** Filtering capabilities */
	filter: {
		enabled: boolean;
		operators?: (ComparisonOperator | StringOperator)[];
		logicalOperators?: LogicalOperator[];
		nestedGroups?: boolean;
	};

	/** Grouping/aggregation capabilities */
	grouping: {
		enabled: boolean;
		aggregations?: ('sum' | 'avg' | 'min' | 'max' | 'count')[];
		nestedGroups?: boolean;
	};

	/** Search capabilities */
	search: {
		enabled: boolean;
		fullText?: boolean;
	};

	/** Whether row count can be provided efficiently */
	rowCount: boolean;

	/** Whether the source supports request cancellation */
	cancellation: boolean;

	/** Whether the source supports streaming/live updates */
	streaming: boolean;
}

// ============================================================================
// Data Source Interface
// ============================================================================

/** Error from data source operations */
export interface DataSourceError {
	code: string;
	message: string;
	details?: unknown;
	retryable?: boolean;
}

/** Result type for data source operations */
export type DataSourceResult<T> =
	| { success: true; data: T }
	| { success: false; error: DataSourceError };

/** The main data source interface - implement this to connect to any backend */
export interface DataSource<TRow = Record<string, unknown>> {
	/** Human-readable name for debugging */
	readonly name: string;

	/** What this data source can do */
	readonly capabilities: DataSourceCapabilities;

	/**
	 * Fetch rows matching the query.
	 * This is the primary method grids call.
	 */
	getRows(
		request: GridQueryRequest,
		signal?: AbortSignal
	): Promise<DataSourceResult<GridQueryResponse<TRow>>>;

	/**
	 * Get distinct values for a field (for filter dropdowns).
	 * Optional - grid will fall back to local extraction if not implemented.
	 */
	getDistinctValues?(
		field: string,
		filter?: FilterExpression,
		signal?: AbortSignal
	): Promise<DataSourceResult<unknown[]>>;

	/**
	 * Subscribe to data changes (for live updates).
	 * Optional - only implement if capabilities.streaming is true.
	 */
	subscribe?(
		callback: (event: DataChangeEvent<TRow>) => void
	): () => void;

	/**
	 * Dispose of any resources.
	 */
	destroy?(): void;
}

// ============================================================================
// Data Change Events (for live updates)
// ============================================================================

export type DataChangeEvent<TRow> =
	| { type: 'insert'; rows: TRow[] }
	| { type: 'update'; rows: TRow[] }
	| { type: 'delete'; rowIds: (string | number)[] }
	| { type: 'refresh' }; // Full refresh needed

// ============================================================================
// Mutation Types (for editable grids)
// ============================================================================

export interface RowMutation<TRow = Record<string, unknown>> {
	type: 'insert' | 'update' | 'delete';
	/** Row ID for update/delete */
	rowId?: string | number;
	/** Row data for insert/update */
	data?: Partial<TRow>;
}

/** Mutable data source interface */
export interface MutableDataSource<TRow = Record<string, unknown>>
	extends DataSource<TRow> {
	/**
	 * Apply mutations to the data source.
	 * Returns affected row IDs.
	 */
	mutate(
		mutations: RowMutation<TRow>[],
		signal?: AbortSignal
	): Promise<DataSourceResult<(string | number)[]>>;

	/**
	 * Validate mutations before applying.
	 * Returns validation errors keyed by mutation index.
	 */
	validate?(
		mutations: RowMutation<TRow>[]
	): Promise<DataSourceResult<Record<number, string[]>>>;
}
