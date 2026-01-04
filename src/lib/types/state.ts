import type { SortDirection } from './column.js';

/**
 * State for a single column's sort configuration.
 */
export interface SortState {
	columnKey: string;
	direction: SortDirection;
}

/**
 * Filter operators for different filter types.
 */
export type FilterOperator =
	| 'eq' // equals
	| 'neq' // not equals
	| 'gt' // greater than
	| 'lt' // less than
	| 'gte' // greater than or equal
	| 'lte' // less than or equal
	| 'contains' // string contains
	| 'startsWith' // string starts with
	| 'endsWith'; // string ends with

/**
 * State for a single column's filter configuration.
 */
export interface FilterState {
	columnKey: string;
	value: unknown;
	operator: FilterOperator;
}

/**
 * Viewport state for virtualization.
 */
export interface ViewportState {
	scrollTop: number;
	scrollLeft: number;
	visibleStartIndex: number;
	visibleEndIndex: number;
	containerWidth: number;
	containerHeight: number;
}

/**
 * Selection mode options.
 */
export type SelectionMode = 'none' | 'single' | 'multiple';

/**
 * State for row/cell selection.
 */
export interface SelectionState<TKey = string | number> {
	mode: SelectionMode;
	selected: Set<TKey>;
	focusedRowKey: TKey | null;
	focusedColumnKey: string | null;
}

/**
 * Loading states for the grid.
 */
export type LoadingState = 'idle' | 'loading' | 'error';

/**
 * Grid-level state interface.
 */
export interface GridStateSnapshot<TData> {
	/** Current sort configuration */
	sort: SortState[];
	/** Current filter configuration */
	filters: FilterState[];
	/** Selected row IDs */
	selectedIds: Array<string | number>;
	/** Column widths by key */
	columnWidths: Record<string, number>;
	/** Column order (array of column keys) */
	columnOrder: string[];
	/** Hidden column keys */
	hiddenColumns: string[];
	/** Expanded row IDs (for detail panels) */
	expandedRows: Array<string | number>;
}
