/**
 * Consolidated Grid State v2
 *
 * Key changes from v1:
 * - DataSource is the single source of truth for data
 * - Grid-state only manages presentation concerns
 * - No duplicate filtering/sorting logic
 * - Simpler, more focused responsibilities
 */

import type { ColumnDef, SortState, FilterState, SelectionMode, FilterOperator } from '../types/index.js';
import { defaultGetRowId, type GetRowId } from '../types/index.js';
import type {
	DataSource,
	MutableDataSource,
	GridQueryRequest,
	GridQueryResponse,
	FilterExpression,
	SortSpec
} from '../query/types.js';
import { createLocalDataSource, type LocalDataSource } from '../query/local-data-source.js';

/**
 * Type guard for MutableDataSource
 */
export function isMutableDataSource<TRow>(
	ds: DataSource<TRow> | undefined
): ds is MutableDataSource<TRow> {
	return ds !== undefined && typeof (ds as MutableDataSource<TRow>).mutate === 'function';
}

/**
 * Edit state
 */
export interface EditState {
	rowId: string | number;
	columnKey: string;
	value: unknown;
	originalValue: unknown;
	error?: string;
	saving?: boolean;
}

/**
 * Simplified options - DataSource is always required internally
 */
export interface GridOptionsV2<TData> {
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

	/** Rows to render outside viewport */
	overscan?: number;

	/** Get unique row ID */
	getRowId?: GetRowId<TData>;

	/** Selection mode */
	selectionMode?: SelectionMode;

	/** ID field for LocalDataSource (when using data prop) */
	idField?: keyof TData;

	// Callbacks
	onSortChange?: (sort: SortState[]) => void;
	onSelectionChange?: (selected: Set<string | number>) => void;
	onCellEdit?: (rowId: string | number, columnKey: string, newValue: unknown, oldValue: unknown) => void;
	onCellValidate?: (rowId: string | number, columnKey: string, value: unknown) => string | null;
}

/**
 * Convert grid filter state to DataSource FilterExpression
 */
function toFilterExpression(filters: FilterState[], searchTerm: string, columns: ColumnDef<any>[]): FilterExpression | undefined {
	const conditions: FilterExpression[] = [];

	// Column filters
	for (const filter of filters) {
		if (filter.value === null || filter.value === undefined || filter.value === '') continue;

		conditions.push({
			type: 'condition',
			field: filter.columnKey,
			operator: filter.operator === 'eq' ? 'eq' :
			          filter.operator === 'contains' ? 'contains' :
			          filter.operator === 'startsWith' ? 'startsWith' :
			          filter.operator === 'gt' ? 'gt' :
			          filter.operator === 'lt' ? 'lt' :
			          filter.operator === 'gte' ? 'gte' :
			          filter.operator === 'lte' ? 'lte' : 'contains',
			value: filter.value
		});
	}

	// Global search - creates OR across all filterable columns
	if (searchTerm.trim()) {
		const searchConditions: FilterExpression[] = columns
			.filter(col => col.filterable !== false)
			.map(col => ({
				type: 'condition' as const,
				field: col.key,
				operator: 'contains' as const,
				value: searchTerm.trim()
			}));

		if (searchConditions.length > 0) {
			conditions.push({
				type: 'group',
				operator: 'or',
				conditions: searchConditions
			});
		}
	}

	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];

	return {
		type: 'group',
		operator: 'and',
		conditions
	};
}

/**
 * Convert grid sort state to DataSource SortSpec
 */
function toSortSpec(sorts: SortState[]): SortSpec[] {
	return sorts
		.filter(s => s.direction)
		.map(s => ({
			field: s.columnKey,
			direction: s.direction as 'asc' | 'desc'
		}));
}

/**
 * Creates consolidated grid state
 */
export function createGridStateV2<TData extends Record<string, unknown>>(options: GridOptionsV2<TData>) {
	// Resolve DataSource - either use provided one or create from data
	let internalDataSource: DataSource<TData>;
	let localDataSource: LocalDataSource<TData> | null = null;

	if (options.dataSource) {
		internalDataSource = options.dataSource;
	} else if (options.data) {
		localDataSource = createLocalDataSource(options.data, options.idField);
		internalDataSource = localDataSource;
	} else {
		throw new Error('Either data or dataSource must be provided');
	}

	// Configuration
	const rowHeight = options.rowHeight ?? 40;
	const headerHeight = options.headerHeight ?? 48;
	const overscan = options.overscan ?? 5;
	const getRowId = options.getRowId ?? defaultGetRowId;

	// ===========================================
	// Presentation State (grid-state owns these)
	// ===========================================

	let columns = $state<ColumnDef<TData>[]>(options.columns);

	// Query state (what to ask DataSource)
	let sortState = $state<SortState[]>([]);
	let filterState = $state<FilterState[]>([]);
	let globalSearchTerm = $state<string>('');

	// Selection state
	let selectedIds = $state<Set<string | number>>(new Set());
	let focusedRowId = $state<string | number | null>(null);
	let focusedColumnKey = $state<string | null>(null);
	let focusedRowIndex = $state<number>(-1);
	let lastSelectedRowId = $state<string | number | null>(null);

	// Viewport state
	let scrollTop = $state(0);
	let scrollLeft = $state(0);
	let containerHeight = $state(0);
	let containerWidth = $state(0);

	// Column state
	let columnWidths = $state<Map<string, number>>(new Map(columns.map(col => [col.key, col.width ?? 150])));
	let columnOrder = $state<string[]>(columns.map(col => col.key));
	let hiddenColumns = $state<Set<string>>(new Set());

	// Edit state
	let editState = $state<EditState | null>(null);

	// ===========================================
	// Data State (from DataSource queries)
	// ===========================================

	let rows = $state<TData[]>([]);
	let totalRowCount = $state<number>(0);
	let isLoading = $state<boolean>(false);
	let queryError = $state<string | null>(null);

	// Request tracking
	let currentRequestId = $state<string>('');

	// ===========================================
	// Derived State
	// ===========================================

	const visibleColumns = $derived.by(() => {
		return columnOrder
			.filter(key => !hiddenColumns.has(key))
			.map(key => columns.find(c => c.key === key)!)
			.filter(Boolean);
	});

	const visibleRange = $derived.by(() => {
		const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
		const visibleCount = Math.ceil(containerHeight / rowHeight) + 2 * overscan;
		const endIndex = Math.min(rows.length - 1, startIndex + visibleCount);
		return { startIndex, endIndex, visibleCount };
	});

	const visibleRows = $derived(rows.slice(visibleRange.startIndex, Math.max(0, visibleRange.endIndex + 1)));

	const totalHeight = $derived(totalRowCount * rowHeight);

	const offsetY = $derived(visibleRange.startIndex * rowHeight);

	const totalWidth = $derived(
		visibleColumns.reduce((sum, col) => sum + (columnWidths.get(col.key) ?? 150), 0)
	);

	// ===========================================
	// Data Fetching (delegate to DataSource)
	// ===========================================

	let requestIdCounter = 0;

	async function fetchData() {
		const requestId = `req_${++requestIdCounter}`;
		currentRequestId = requestId;
		isLoading = true;
		queryError = null;

		try {
			const request: GridQueryRequest = {
				version: 1,
				requestId,
				pagination: {
					type: 'range',
					startRow: 0,
					endRow: 10000 // For now, fetch all. Can optimize with windowing later.
				},
				sort: toSortSpec(sortState),
				filter: toFilterExpression(filterState, globalSearchTerm, columns),
				requires: { rowCount: true }
			};

			const result = await internalDataSource.getRows(request);

			// Check if this is still the current request
			if (currentRequestId !== requestId) return;

			if (result.success) {
				rows = result.data.rows;
				totalRowCount = result.data.rowCount ?? result.data.rows.length;
			} else {
				queryError = result.error.message;
				rows = [];
				totalRowCount = 0;
			}
		} catch (err) {
			if (currentRequestId !== requestId) return;
			queryError = err instanceof Error ? err.message : 'Failed to fetch data';
			rows = [];
			totalRowCount = 0;
		} finally {
			if (currentRequestId === requestId) {
				isLoading = false;
			}
		}
	}

	// Fetch data when query state changes
	$effect(() => {
		// Track dependencies
		sortState;
		filterState;
		globalSearchTerm;

		fetchData();
	});

	// ===========================================
	// Actions
	// ===========================================

	function setSort(columnKey: string, direction: SortState['direction'], multiSort = false) {
		if (!multiSort) {
			sortState = direction ? [{ columnKey, direction }] : [];
		} else {
			const existingIndex = sortState.findIndex(s => s.columnKey === columnKey);
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
		const existing = sortState.find(s => s.columnKey === columnKey);
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
		const existingIndex = filterState.findIndex(f => f.columnKey === columnKey);
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

	function setGlobalSearch(term: string) {
		globalSearchTerm = term;
	}

	function clearGlobalSearch() {
		globalSearchTerm = '';
	}

	// Selection actions (same as before)
	function selectRow(rowId: string | number, mode: 'toggle' | 'add' | 'remove' | 'set' = 'toggle') {
		const newSelected = new Set(selectedIds);

		switch (mode) {
			case 'toggle':
				if (newSelected.has(rowId)) {
					newSelected.delete(rowId);
				} else {
					if (options.selectionMode === 'single') newSelected.clear();
					newSelected.add(rowId);
				}
				break;
			case 'add':
				if (options.selectionMode === 'single') newSelected.clear();
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
		lastSelectedRowId = rowId;

		const idx = rows.findIndex((row, i) => getRowId(row, i) === rowId);
		if (idx >= 0) {
			focusedRowIndex = idx;
			focusedRowId = rowId;
		}

		options.onSelectionChange?.(selectedIds);
	}

	function selectRange(targetRowId: string | number) {
		if (options.selectionMode !== 'multiple') {
			selectRow(targetRowId, 'set');
			return;
		}

		const anchorId = lastSelectedRowId ?? targetRowId;
		let anchorIndex = -1;
		let targetIndex = -1;

		for (let i = 0; i < rows.length; i++) {
			const id = getRowId(rows[i], i);
			if (id === anchorId) anchorIndex = i;
			if (id === targetRowId) targetIndex = i;
			if (anchorIndex >= 0 && targetIndex >= 0) break;
		}

		if (anchorIndex < 0 || targetIndex < 0) {
			selectRow(targetRowId, 'set');
			return;
		}

		const start = Math.min(anchorIndex, targetIndex);
		const end = Math.max(anchorIndex, targetIndex);

		const newSelected = new Set(selectedIds);
		for (let i = start; i <= end; i++) {
			newSelected.add(getRowId(rows[i], i));
		}

		selectedIds = newSelected;
		focusedRowIndex = targetIndex;
		focusedRowId = targetRowId;
		options.onSelectionChange?.(selectedIds);
	}

	function selectAll() {
		if (options.selectionMode !== 'multiple') return;
		selectedIds = new Set(rows.map((row, i) => getRowId(row, i)));
		options.onSelectionChange?.(selectedIds);
	}

	function clearSelection() {
		selectedIds = new Set();
		options.onSelectionChange?.(selectedIds);
	}

	function isRowSelected(rowId: string | number): boolean {
		return selectedIds.has(rowId);
	}

	// Column actions
	function setColumnWidth(columnKey: string, width: number) {
		const column = columns.find(c => c.key === columnKey);
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

	// Viewport actions
	function setScroll(top: number, left: number) {
		scrollTop = Math.max(0, Math.min(top, Math.max(0, totalHeight - containerHeight)));
		scrollLeft = Math.max(0, Math.min(left, Math.max(0, totalWidth - containerWidth)));
	}

	function setContainerSize(width: number, height: number) {
		containerWidth = width;
		containerHeight = height;
	}

	function scrollToRow(index: number, align: 'start' | 'center' | 'end' | 'nearest' = 'start') {
		if (index < 0 || index >= rows.length) return;

		const rowTop = index * rowHeight;
		const rowBottom = rowTop + rowHeight;
		const viewportTop = scrollTop;
		const viewportBottom = scrollTop + containerHeight;

		let targetScrollTop: number;

		switch (align) {
			case 'center':
				targetScrollTop = index * rowHeight - containerHeight / 2 + rowHeight / 2;
				break;
			case 'end':
				targetScrollTop = index * rowHeight - containerHeight + rowHeight;
				break;
			case 'nearest':
				if (rowTop < viewportTop) {
					targetScrollTop = rowTop;
				} else if (rowBottom > viewportBottom) {
					targetScrollTop = rowBottom - containerHeight;
				} else {
					return;
				}
				break;
			default:
				targetScrollTop = index * rowHeight;
		}

		setScroll(targetScrollTop, scrollLeft);
	}

	// Navigation
	function navigateRow(offset: number, select = false, extendSelection = false): string | number | null {
		const currentIndex = focusedRowIndex >= 0 ? focusedRowIndex : 0;
		const newIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + offset));

		if (newIndex === currentIndex && focusedRowIndex >= 0) return focusedRowId;
		if (rows.length === 0) return null;

		const newRow = rows[newIndex];
		const newRowId = getRowId(newRow, newIndex);

		focusedRowIndex = newIndex;
		focusedRowId = newRowId;

		if (select) {
			if (extendSelection && options.selectionMode === 'multiple') {
				selectRange(newRowId);
			} else {
				selectRow(newRowId, 'set');
			}
		}

		scrollToRow(newIndex, 'nearest');
		return newRowId;
	}

	function navigateToFirst(select = false): string | number | null {
		if (rows.length === 0) return null;
		focusedRowIndex = 0;
		focusedRowId = getRowId(rows[0], 0);
		if (select) selectRow(focusedRowId, 'set');
		scrollToRow(0, 'start');
		return focusedRowId;
	}

	function navigateToLast(select = false): string | number | null {
		if (rows.length === 0) return null;
		const lastIndex = rows.length - 1;
		focusedRowIndex = lastIndex;
		focusedRowId = getRowId(rows[lastIndex], lastIndex);
		if (select) selectRow(focusedRowId, 'set');
		scrollToRow(lastIndex, 'end');
		return focusedRowId;
	}

	function navigateByPage(direction: 'up' | 'down', select = false): string | number | null {
		const visibleRowCount = Math.floor(containerHeight / rowHeight);
		const offset = direction === 'down' ? visibleRowCount : -visibleRowCount;
		return navigateRow(offset, select);
	}

	function setFocus(rowId: string | number | null, columnKey: string | null) {
		focusedRowId = rowId;
		focusedColumnKey = columnKey;
		if (rowId !== null) {
			const idx = rows.findIndex((row, i) => getRowId(row, i) === rowId);
			if (idx >= 0) focusedRowIndex = idx;
		}
	}

	// ===========================================
	// Edit Actions (always via DataSource)
	// ===========================================

	function getColumnValue(row: TData, column: ColumnDef<TData>): unknown {
		if (typeof column.accessor === 'function') return column.accessor(row);
		if (column.accessor) return row[column.accessor];
		return row[column.key];
	}

	function startEdit(rowId: string | number, columnKey: string): boolean {
		const column = columns.find(c => c.key === columnKey);
		if (!column || column.editable === false) return false;

		const rowIndex = rows.findIndex((row, i) => getRowId(row, i) === rowId);
		if (rowIndex < 0) return false;

		const row = rows[rowIndex];
		const value = getColumnValue(row, column);

		editState = {
			rowId,
			columnKey,
			value,
			originalValue: value,
			error: undefined
		};

		focusedRowId = rowId;
		focusedColumnKey = columnKey;
		focusedRowIndex = rowIndex;

		return true;
	}

	function setEditValue(value: unknown): void {
		if (!editState) return;
		const error = options.onCellValidate?.(editState.rowId, editState.columnKey, value) ?? undefined;
		editState = { ...editState, value, error };
	}

	async function commitEdit(): Promise<boolean> {
		if (!editState) return false;
		if (editState.saving) return false;

		const error = options.onCellValidate?.(editState.rowId, editState.columnKey, editState.value);
		if (error) {
			editState = { ...editState, error };
			return false;
		}

		const { rowId, columnKey, value, originalValue } = editState;

		if (value === originalValue) {
			editState = null;
			return true;
		}

		// Always try to use DataSource for persistence
		if (isMutableDataSource(internalDataSource)) {
			editState = { ...editState, saving: true, error: undefined };

			try {
				const result = await internalDataSource.mutate([{
					type: 'update',
					rowId,
					data: { [columnKey]: value } as Partial<TData>
				}]);

				if (!result.success) {
					editState = { ...editState, saving: false, error: result.error.message };
					return false;
				}

				// Refresh data from DataSource
				await fetchData();
			} catch (err) {
				editState = { ...editState, saving: false, error: err instanceof Error ? err.message : 'Save failed' };
				return false;
			}
		}

		// Notify callback
		options.onCellEdit?.(rowId, columnKey, value, originalValue);

		editState = null;
		return true;
	}

	function cancelEdit(): void {
		if (editState?.saving) return;
		editState = null;
	}

	function isEditing(rowId: string | number, columnKey: string): boolean {
		return editState?.rowId === rowId && editState?.columnKey === columnKey;
	}

	function hasActiveEdit(): boolean {
		return editState !== null;
	}

	// ===========================================
	// Data Management
	// ===========================================

	/**
	 * Update source data (only works when using data prop, not external DataSource)
	 */
	function updateData(newData: TData[]): void {
		if (localDataSource) {
			localDataSource.setData(newData);
			fetchData(); // Refresh
		}
	}

	function updateColumns(newColumns: ColumnDef<TData>[]): void {
		columns = newColumns;
		const newOrder = [...columnOrder];
		for (const col of newColumns) {
			if (!newOrder.includes(col.key)) newOrder.push(col.key);
		}
		columnOrder = newOrder.filter(key => newColumns.some(c => c.key === key));
	}

	/**
	 * Force refresh data from DataSource
	 */
	function refresh(): void {
		fetchData();
	}

	// ===========================================
	// Public API
	// ===========================================

	return {
		// Data (from DataSource)
		get rows() { return rows; },
		get totalRowCount() { return totalRowCount; },
		get isLoading() { return isLoading; },
		get queryError() { return queryError; },

		// For backwards compat
		get data() { return rows; },
		get processedData() { return rows; },

		// Presentation state
		get columns() { return columns; },
		get visibleColumns() { return visibleColumns; },
		get visibleRows() { return visibleRows; },
		get visibleRange() { return visibleRange; },
		get totalHeight() { return totalHeight; },
		get totalWidth() { return totalWidth; },
		get offsetY() { return offsetY; },
		get scrollTop() { return scrollTop; },
		get scrollLeft() { return scrollLeft; },
		get containerHeight() { return containerHeight; },
		get containerWidth() { return containerWidth; },
		get sortState() { return sortState; },
		get filterState() { return filterState; },
		get globalSearchTerm() { return globalSearchTerm; },
		get selectedIds() { return selectedIds; },
		get focusedRowId() { return focusedRowId; },
		get focusedColumnKey() { return focusedColumnKey; },
		get focusedRowIndex() { return focusedRowIndex; },
		get lastSelectedRowId() { return lastSelectedRowId; },
		get columnWidths() { return columnWidths; },
		get columnOrder() { return columnOrder; },
		get hiddenColumns() { return hiddenColumns; },
		get editState() { return editState; },

		// Config
		rowHeight,
		headerHeight,
		overscan,
		getRowId,

		// Actions
		setSort,
		toggleSort,
		setFilter,
		clearFilters,
		setGlobalSearch,
		clearGlobalSearch,
		selectRow,
		selectRange,
		selectAll,
		clearSelection,
		isRowSelected,
		setColumnWidth,
		setColumnVisibility,
		setScroll,
		setContainerSize,
		scrollToRow,
		setFocus,
		navigateRow,
		navigateToFirst,
		navigateToLast,
		navigateByPage,

		// Edit
		startEdit,
		setEditValue,
		commitEdit,
		cancelEdit,
		isEditing,
		hasActiveEdit,

		// Data management
		updateData,
		updateColumns,
		refresh
	};
}

export type GridStateInstanceV2<TData> = ReturnType<typeof createGridStateV2<TData>>;
