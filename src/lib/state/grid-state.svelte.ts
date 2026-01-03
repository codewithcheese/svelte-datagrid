import type { ColumnDef, SortState, FilterState, SelectionMode, FilterOperator } from '../types/index.js';
import { defaultGetRowId, type GetRowId } from '../types/index.js';

/**
 * Configuration options for creating a grid state instance.
 */
export interface GridOptions<TData> {
	/** Data rows to display */
	data: TData[];
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
	/** Callback when sort changes */
	onSortChange?: (sort: SortState[]) => void;
	/** Callback when selection changes */
	onSelectionChange?: (selected: Set<string | number>) => void;
	/** Callback when cell is edited */
	onCellEdit?: (rowId: string | number, columnKey: string, value: unknown) => void;
}

/**
 * Get the value of a cell from a row using the column definition.
 */
function getColumnValue<TData>(row: TData, column: ColumnDef<TData>): unknown {
	if (typeof column.accessor === 'function') {
		return column.accessor(row);
	}
	if (column.accessor) {
		return row[column.accessor];
	}
	return (row as Record<string, unknown>)[column.key];
}

/**
 * Default comparison function for sorting.
 */
function defaultCompare(a: unknown, b: unknown): number {
	if (a === b) return 0;
	if (a == null) return 1;
	if (b == null) return -1;

	if (typeof a === 'string' && typeof b === 'string') {
		return a.localeCompare(b);
	}

	if (typeof a === 'number' && typeof b === 'number') {
		return a - b;
	}

	if (a instanceof Date && b instanceof Date) {
		return a.getTime() - b.getTime();
	}

	return String(a).localeCompare(String(b));
}

/**
 * Apply a filter to a value based on operator.
 */
function applyFilter(value: unknown, filterValue: unknown, operator: FilterOperator): boolean {
	if (filterValue === null || filterValue === undefined || filterValue === '') {
		return true;
	}

	const strValue = String(value ?? '').toLowerCase();
	const strFilter = String(filterValue).toLowerCase();

	switch (operator) {
		case 'eq':
			return value === filterValue || strValue === strFilter;
		case 'neq':
			return value !== filterValue && strValue !== strFilter;
		case 'gt':
			return Number(value) > Number(filterValue);
		case 'lt':
			return Number(value) < Number(filterValue);
		case 'gte':
			return Number(value) >= Number(filterValue);
		case 'lte':
			return Number(value) <= Number(filterValue);
		case 'contains':
			return strValue.includes(strFilter);
		case 'startsWith':
			return strValue.startsWith(strFilter);
		case 'endsWith':
			return strValue.endsWith(strFilter);
		default:
			return true;
	}
}

/**
 * Creates reactive grid state using Svelte 5 runes.
 * This is a factory function that returns an object with getters for reactive state
 * and methods for state mutations.
 */
export function createGridState<TData>(options: GridOptions<TData>) {
	// Core data state
	let data = $state<TData[]>(options.data);
	let columns = $state<ColumnDef<TData>[]>(options.columns);

	// Configuration
	const rowHeight = options.rowHeight ?? 40;
	const headerHeight = options.headerHeight ?? 48;
	const overscan = options.overscan ?? 5;
	const getRowId = options.getRowId ?? defaultGetRowId;

	// Sort state
	let sortState = $state<SortState[]>([]);

	// Filter state
	let filterState = $state<FilterState[]>([]);

	// Selection state
	let selectedIds = $state<Set<string | number>>(new Set());
	let focusedRowId = $state<string | number | null>(null);
	let focusedColumnKey = $state<string | null>(null);

	// Viewport state
	let scrollTop = $state(0);
	let scrollLeft = $state(0);
	let containerHeight = $state(0);
	let containerWidth = $state(0);

	// Column state
	let columnWidths = $state<Map<string, number>>(new Map(columns.map((col) => [col.key, col.width ?? 150])));
	let columnOrder = $state<string[]>(columns.map((col) => col.key));
	let hiddenColumns = $state<Set<string>>(new Set());

	// Derived: Visible columns (respecting order and visibility)
	const visibleColumns = $derived.by(() => {
		return columnOrder.filter((key) => !hiddenColumns.has(key)).map((key) => columns.find((c) => c.key === key)!);
	});

	// Derived: Processed data (filtered, sorted)
	const processedData = $derived.by(() => {
		let result = [...data];

		// Apply filters
		for (const filter of filterState) {
			const column = columns.find((c) => c.key === filter.columnKey);
			if (!column) continue;

			result = result.filter((row) => {
				const value = getColumnValue(row, column);
				if (column.filterFn) {
					return column.filterFn(value as never, filter.value);
				}
				return applyFilter(value, filter.value, filter.operator);
			});
		}

		// Apply sorting
		if (sortState.length > 0) {
			result.sort((a, b) => {
				for (const sort of sortState) {
					const column = columns.find((c) => c.key === sort.columnKey);
					if (!column) continue;

					const aVal = getColumnValue(a, column);
					const bVal = getColumnValue(b, column);

					const compareFn = column.sortFn ?? defaultCompare;
					const comparison = compareFn(aVal as never, bVal as never);

					if (comparison !== 0) {
						return sort.direction === 'asc' ? comparison : -comparison;
					}
				}
				return 0;
			});
		}

		return result;
	});

	// Derived: Virtualization calculations
	const visibleRange = $derived.by(() => {
		const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
		const visibleCount = Math.ceil(containerHeight / rowHeight) + 2 * overscan;
		const endIndex = Math.min(processedData.length - 1, startIndex + visibleCount);

		return { startIndex, endIndex, visibleCount };
	});

	// Derived: Visible rows (sliced from processed data)
	const visibleRows = $derived(processedData.slice(visibleRange.startIndex, Math.max(0, visibleRange.endIndex + 1)));

	// Derived: Total scroll height
	const totalHeight = $derived(processedData.length * rowHeight);

	// Derived: Y offset for positioning visible rows
	const offsetY = $derived(visibleRange.startIndex * rowHeight);

	// Derived: Total width calculation
	const totalWidth = $derived(
		visibleColumns.reduce((sum, col) => sum + (columnWidths.get(col.key) ?? 150), 0)
	);

	// Actions
	function setSort(columnKey: string, direction: SortState['direction'], multiSort = false) {
		if (!multiSort) {
			sortState = direction ? [{ columnKey, direction }] : [];
		} else {
			const existingIndex = sortState.findIndex((s) => s.columnKey === columnKey);
			if (existingIndex >= 0) {
				if (direction) {
					const newState = [...sortState];
					newState[existingIndex] = { columnKey, direction };
					sortState = newState;
				} else {
					sortState = sortState.filter((_, i) => i !== existingIndex);
				}
			} else if (direction) {
				sortState = [...sortState, { columnKey, direction }];
			}
		}
		options.onSortChange?.(sortState);
	}

	function toggleSort(columnKey: string, multiSort = false) {
		const existing = sortState.find((s) => s.columnKey === columnKey);
		let newDirection: SortState['direction'];

		if (!existing) {
			newDirection = 'asc';
		} else if (existing.direction === 'asc') {
			newDirection = 'desc';
		} else {
			newDirection = null;
		}

		setSort(columnKey, newDirection, multiSort);
	}

	function setFilter(columnKey: string, value: unknown, operator: FilterOperator = 'contains') {
		const existingIndex = filterState.findIndex((f) => f.columnKey === columnKey);
		if (existingIndex >= 0) {
			if (value === null || value === undefined || value === '') {
				filterState = filterState.filter((_, i) => i !== existingIndex);
			} else {
				const newState = [...filterState];
				newState[existingIndex] = { columnKey, value, operator };
				filterState = newState;
			}
		} else if (value !== null && value !== undefined && value !== '') {
			filterState = [...filterState, { columnKey, value, operator }];
		}
	}

	function clearFilters() {
		filterState = [];
	}

	function selectRow(rowId: string | number, mode: 'toggle' | 'add' | 'remove' | 'set' = 'toggle') {
		const newSelected = new Set(selectedIds);

		switch (mode) {
			case 'toggle':
				if (newSelected.has(rowId)) {
					newSelected.delete(rowId);
				} else {
					if (options.selectionMode === 'single') {
						newSelected.clear();
					}
					newSelected.add(rowId);
				}
				break;
			case 'add':
				if (options.selectionMode === 'single') {
					newSelected.clear();
				}
				newSelected.add(rowId);
				break;
			case 'remove':
				newSelected.delete(rowId);
				break;
			case 'set':
				newSelected.clear();
				newSelected.add(rowId);
				break;
		}

		selectedIds = newSelected;
		options.onSelectionChange?.(selectedIds);
	}

	function selectAll() {
		if (options.selectionMode !== 'multiple') return;
		selectedIds = new Set(processedData.map((row, i) => getRowId(row, i)));
		options.onSelectionChange?.(selectedIds);
	}

	function clearSelection() {
		selectedIds = new Set();
		options.onSelectionChange?.(selectedIds);
	}

	function isRowSelected(rowId: string | number): boolean {
		return selectedIds.has(rowId);
	}

	function setColumnWidth(columnKey: string, width: number) {
		const column = columns.find((c) => c.key === columnKey);
		const minWidth = column?.minWidth ?? 50;
		const maxWidth = column?.maxWidth ?? Infinity;
		const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));

		const newWidths = new Map(columnWidths);
		newWidths.set(columnKey, clampedWidth);
		columnWidths = newWidths;
	}

	function setColumnVisibility(columnKey: string, visible: boolean) {
		const newHidden = new Set(hiddenColumns);
		if (visible) {
			newHidden.delete(columnKey);
		} else {
			newHidden.add(columnKey);
		}
		hiddenColumns = newHidden;
	}

	function setScroll(top: number, left: number) {
		scrollTop = Math.max(0, Math.min(top, Math.max(0, totalHeight - containerHeight)));
		scrollLeft = Math.max(0, Math.min(left, Math.max(0, totalWidth - containerWidth)));
	}

	function setContainerSize(width: number, height: number) {
		containerWidth = width;
		containerHeight = height;
	}

	function updateData(newData: TData[]) {
		data = newData;
	}

	function updateColumns(newColumns: ColumnDef<TData>[]) {
		columns = newColumns;
		// Update column order to include new columns
		const newOrder = [...columnOrder];
		for (const col of newColumns) {
			if (!newOrder.includes(col.key)) {
				newOrder.push(col.key);
			}
		}
		columnOrder = newOrder.filter((key) => newColumns.some((c) => c.key === key));
	}

	function scrollToRow(index: number, align: 'start' | 'center' | 'end' = 'start') {
		const row = index;
		if (row < 0 || row >= processedData.length) return;

		let targetScrollTop: number;

		switch (align) {
			case 'center':
				targetScrollTop = row * rowHeight - containerHeight / 2 + rowHeight / 2;
				break;
			case 'end':
				targetScrollTop = row * rowHeight - containerHeight + rowHeight;
				break;
			default:
				targetScrollTop = row * rowHeight;
		}

		setScroll(targetScrollTop, scrollLeft);
	}

	function setFocus(rowId: string | number | null, columnKey: string | null) {
		focusedRowId = rowId;
		focusedColumnKey = columnKey;
	}

	// Return public API
	return {
		// Reactive getters
		get data() {
			return data;
		},
		get columns() {
			return columns;
		},
		get visibleColumns() {
			return visibleColumns;
		},
		get processedData() {
			return processedData;
		},
		get visibleRows() {
			return visibleRows;
		},
		get visibleRange() {
			return visibleRange;
		},
		get totalHeight() {
			return totalHeight;
		},
		get totalWidth() {
			return totalWidth;
		},
		get offsetY() {
			return offsetY;
		},
		get scrollTop() {
			return scrollTop;
		},
		get scrollLeft() {
			return scrollLeft;
		},
		get containerHeight() {
			return containerHeight;
		},
		get containerWidth() {
			return containerWidth;
		},
		get sortState() {
			return sortState;
		},
		get filterState() {
			return filterState;
		},
		get selectedIds() {
			return selectedIds;
		},
		get focusedRowId() {
			return focusedRowId;
		},
		get focusedColumnKey() {
			return focusedColumnKey;
		},
		get columnWidths() {
			return columnWidths;
		},
		get columnOrder() {
			return columnOrder;
		},
		get hiddenColumns() {
			return hiddenColumns;
		},

		// Config (non-reactive)
		rowHeight,
		headerHeight,
		overscan,
		getRowId,

		// Actions
		setSort,
		toggleSort,
		setFilter,
		clearFilters,
		selectRow,
		selectAll,
		clearSelection,
		isRowSelected,
		setColumnWidth,
		setColumnVisibility,
		setScroll,
		setContainerSize,
		updateData,
		updateColumns,
		scrollToRow,
		setFocus
	};
}

export type GridStateInstance<TData> = ReturnType<typeof createGridState<TData>>;
