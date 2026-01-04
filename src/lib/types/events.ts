import type { ColumnDef, SortDirection } from './column.js';

/**
 * Event payload for cell click events.
 */
export interface GridCellClickEvent<TData> {
	row: TData;
	rowIndex: number;
	column: ColumnDef<TData>;
	columnKey: string;
	value: unknown;
	originalEvent: MouseEvent;
}

/**
 * Event payload for row click events.
 */
export interface GridRowClickEvent<TData> {
	row: TData;
	rowIndex: number;
	originalEvent: MouseEvent;
}

/**
 * Event payload for sort change events.
 */
export interface GridSortEvent {
	columnKey: string;
	direction: SortDirection;
	multiSort: boolean;
}

/**
 * Event payload for selection change events.
 */
export interface GridSelectionChangeEvent<TKey = string | number> {
	selected: Set<TKey>;
	added: TKey[];
	removed: TKey[];
}

/**
 * Event payload for cell edit events.
 */
export interface GridCellEditEvent<TData, TValue = unknown> {
	row: TData;
	rowIndex: number;
	rowId: string | number;
	column: ColumnDef<TData>;
	columnKey: string;
	oldValue: TValue;
	newValue: TValue;
}

/**
 * Event payload for column resize events.
 */
export interface GridColumnResizeEvent {
	columnKey: string;
	width: number;
	previousWidth: number;
}

/**
 * Event payload for column reorder events.
 */
export interface GridColumnReorderEvent {
	columnKey: string;
	fromIndex: number;
	toIndex: number;
}

/**
 * Event payload for scroll events.
 */
export interface GridScrollEvent {
	scrollTop: number;
	scrollLeft: number;
	scrollHeight: number;
	scrollWidth: number;
}
