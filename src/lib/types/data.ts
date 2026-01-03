/**
 * Base interface for row identity.
 * Rows should have a unique identifier for selection, virtualization, and keying.
 */
export interface RowIdentifier {
	/** Unique row ID */
	id: string | number;
}

/**
 * Type for data rows, optionally with an id field.
 */
export type DataRow<T = Record<string, unknown>> = T & Partial<RowIdentifier>;

/**
 * Metadata about a row's current state in the grid.
 */
export interface RowMeta {
	/** Index in the processed (filtered/sorted) data array */
	index: number;
	/** Whether the row is currently selected */
	isSelected: boolean;
	/** Whether the row is expanded (for detail panels) */
	isExpanded: boolean;
	/** Whether the row is being edited */
	isEditing: boolean;
	/** Nesting depth for tree/grouped data */
	depth: number;
}

/**
 * Function type for getting a unique row ID.
 */
export type GetRowId<TData> = (row: TData, index: number) => string | number;

/**
 * Default row ID getter.
 * Uses the `id` field if present, otherwise falls back to index.
 */
export function defaultGetRowId<TData>(row: TData, index: number): string | number {
	const rowWithId = row as TData & Partial<RowIdentifier>;
	return rowWithId.id ?? index;
}
