/**
 * Engine types - Pure TypeScript interfaces for the grid engine.
 * These mirror the Svelte component types but are framework-agnostic.
 */

import type { ColumnDef, SortState, FilterState, SelectionMode, FilterOperator } from '../types/index.js';
import type { GetRowId } from '../types/index.js';
import type { DataSource } from '../query/types.js';

/**
 * Edit state for a cell being edited.
 */
export interface EditState {
	/** Row ID of the cell being edited */
	rowId: string | number;
	/** Column key of the cell being edited */
	columnKey: string;
	/** Current value in the editor */
	value: unknown;
	/** Original value before editing started */
	originalValue: unknown;
	/** Validation error message, if any */
	error?: string;
	/** Whether the edit is currently being saved to DataSource */
	saving?: boolean;
}

/**
 * Visible range for virtualization
 */
export interface VisibleRange {
	startIndex: number;
	endIndex: number;
	visibleCount: number;
}

/**
 * State change event types emitted by StateManager
 */
export interface StateChangeEvents {
	/** Scroll position changed */
	scroll: { scrollTop: number; scrollLeft: number };
	/** Data was updated (rows changed) */
	data: { rows: unknown[]; totalRowCount: number };
	/** Selection changed */
	selection: { selectedIds: Set<string | number> };
	/** Sort state changed */
	sort: { sortState: SortState[] };
	/** Filter state changed */
	filter: { filterState: FilterState[] };
	/** Global search changed */
	search: { globalSearchTerm: string };
	/** Column configuration changed (order, visibility, widths, pinning) */
	columns: { type: 'order' | 'visibility' | 'width' | 'pinning' | 'update' };
	/** Edit state changed */
	edit: { editState: EditState | null };
	/** Focus changed */
	focus: { rowId: string | number | null; columnKey: string | null };
	/** Container size changed */
	resize: { width: number; height: number };
	/** Loading state changed */
	loading: { isLoading: boolean };
	/** Error state changed */
	error: { queryError: string | null };
}

/**
 * Configuration options for creating a StateManager instance.
 */
export interface StateManagerOptions<TData> {
	/**
	 * Option 1: Provide raw data array (we create LocalDataSource internally)
	 */
	data?: TData[];

	/**
	 * Option 2: Provide your own DataSource (for server-side, custom backends)
	 */
	dataSource?: DataSource<TData>;

	/** Column definitions */
	columns: ColumnDef<TData>[];

	/** Row height in pixels */
	rowHeight?: number;

	/** Header height in pixels */
	headerHeight?: number;

	/** Number of rows to render outside the viewport */
	overscan?: number;

	/** Function to get unique row ID */
	getRowId?: GetRowId<TData>;

	/** Selection mode */
	selectionMode?: SelectionMode;

	/** ID field for LocalDataSource (when using data prop) */
	idField?: keyof TData;

	/** Callback when sort changes */
	onSortChange?: (sort: SortState[]) => void;

	/** Callback when selection changes */
	onSelectionChange?: (selected: Set<string | number>) => void;

	/** Callback when cell edit is committed */
	onCellEdit?: (rowId: string | number, columnKey: string, newValue: unknown, oldValue: unknown) => void;

	/** Callback to validate cell value before commit */
	onCellValidate?: (rowId: string | number, columnKey: string, value: unknown) => string | null;
}

/**
 * Auto-size column options
 */
export interface AutoSizeOptions {
	/** Include header text in width calculation (default: true) */
	includeHeader?: boolean;
	/** Maximum width to apply (respects column.maxWidth if set) */
	maxWidth?: number;
	/** Sample size for large datasets (default: 1000) */
	sampleSize?: number;
}
