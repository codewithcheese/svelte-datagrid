import type { Component, Snippet } from 'svelte';

/** Column alignment options */
export type ColumnAlign = 'left' | 'center' | 'right';

/** Sort direction for column sorting */
export type SortDirection = 'asc' | 'desc' | null;

/** Column pinning position */
export type ColumnPinning = 'left' | 'right' | false;

/** Cell value type for rendering */
export type CellValue = string | number | boolean | Date | null | undefined;

/**
 * Column definition for the DataGrid.
 * @template TData - The type of data rows
 * @template TValue - The type of the cell value for this column
 */
export interface ColumnDef<TData = unknown, TValue = unknown> {
	/** Unique column identifier */
	key: string;

	/** Display header text */
	header: string;

	/** Accessor function or key path for cell value */
	accessor?: keyof TData | ((row: TData) => TValue);

	/** Initial width in pixels */
	width?: number;

	/** Minimum width for resizing */
	minWidth?: number;

	/** Maximum width for resizing */
	maxWidth?: number;

	/** Enable/disable sorting for this column */
	sortable?: boolean;

	/** Custom sort comparator */
	sortFn?: (a: TValue, b: TValue) => number;

	/** Enable/disable filtering */
	filterable?: boolean;

	/** Filter type */
	filterType?: 'text' | 'number' | 'date' | 'select' | 'boolean';

	/** Custom filter function */
	filterFn?: (value: TValue, filterValue: unknown) => boolean;

	/** Cell alignment */
	align?: ColumnAlign;

	/** Pin column to left/right edge */
	pinned?: ColumnPinning;

	/** Enable cell editing */
	editable?: boolean;

	/** Custom cell renderer component */
	cellRenderer?: Component<{ value: TValue; row: TData; column: ColumnDef<TData, TValue> }>;

	/** Value formatter for display */
	formatter?: (value: TValue) => string;

	/** Cell CSS class */
	cellClass?: string | ((row: TData, value: TValue) => string);

	/** Header CSS class */
	headerClass?: string;
}

/**
 * Helper type for creating column definitions with proper typing
 */
export interface ColumnDefHelper<TData> {
	accessor<TKey extends keyof TData>(
		key: TKey,
		options?: Partial<Omit<ColumnDef<TData, TData[TKey]>, 'key' | 'accessor'>>
	): ColumnDef<TData, TData[TKey]>;

	display(key: string, options: Omit<ColumnDef<TData, never>, 'key' | 'accessor'>): ColumnDef<TData, never>;
}

/**
 * Creates a column helper for type-safe column definitions.
 * @template TData - The type of data rows
 */
export function createColumnHelper<TData>(): ColumnDefHelper<TData> {
	return {
		accessor(key, options = {}) {
			return {
				key: String(key),
				header: String(key),
				accessor: key,
				...options
			} as ColumnDef<TData, TData[typeof key]>;
		},
		display(key, options) {
			return { key, ...options } as ColumnDef<TData, never>;
		}
	};
}

/** Internal column state used by the grid */
export interface ColumnState {
	key: string;
	width: number;
	visible: boolean;
	pinned: ColumnPinning;
	order: number;
}
