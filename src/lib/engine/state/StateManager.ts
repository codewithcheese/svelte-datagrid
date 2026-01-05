/**
 * StateManager - Pure TypeScript state management for the grid engine.
 *
 * This is a port of grid-state.svelte.ts without Svelte runes.
 * Key differences from the Svelte version:
 * - Uses EventEmitter instead of $state/$derived/$effect
 * - Manual cache invalidation instead of reactive tracking
 * - No framework dependencies
 *
 * The public API is identical to createGridState() for compatibility.
 */

import { EventEmitter } from '../EventEmitter.js';
import type {
	EditState,
	VisibleRange,
	StateChangeEvents,
	StateManagerOptions,
	AutoSizeOptions
} from '../types.js';
import type { ColumnDef, SortState, FilterState, FilterOperator } from '../../types/index.js';
import { defaultGetRowId, type GetRowId } from '../../types/index.js';
import type {
	DataSource,
	MutableDataSource,
	GridQueryRequest,
	FilterExpression,
	SortSpec
} from '../../query/types.js';
import { createLocalDataSource, type LocalDataSource } from '../../query/local-data-source.js';

/**
 * Type guard to check if a DataSource implements MutableDataSource
 */
export function isMutableDataSource<TRow>(
	ds: DataSource<TRow> | undefined
): ds is MutableDataSource<TRow> {
	return ds !== undefined && typeof (ds as MutableDataSource<TRow>).mutate === 'function';
}

/**
 * Convert grid filter state to DataSource FilterExpression
 */
function toFilterExpression(
	filters: FilterState[],
	searchTerm: string,
	columns: ColumnDef<any>[]
): FilterExpression | undefined {
	const conditions: FilterExpression[] = [];

	// Column filters
	for (const filter of filters) {
		if (filter.value === null || filter.value === undefined || filter.value === '') continue;

		conditions.push({
			type: 'condition',
			field: filter.columnKey,
			operator:
				filter.operator === 'eq'
					? 'eq'
					: filter.operator === 'contains'
						? 'contains'
						: filter.operator === 'startsWith'
							? 'startsWith'
							: filter.operator === 'gt'
								? 'gt'
								: filter.operator === 'lt'
									? 'lt'
									: filter.operator === 'gte'
										? 'gte'
										: filter.operator === 'lte'
											? 'lte'
											: 'contains',
			value: filter.value
		});
	}

	// Global search - creates OR across all filterable columns
	if (searchTerm.trim()) {
		const searchConditions: FilterExpression[] = columns
			.filter((col) => col.filterable !== false)
			.map((col) => ({
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
	return sorts.filter((s) => s.direction).map((s) => ({
		field: s.columnKey,
		direction: s.direction as 'asc' | 'desc'
	}));
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
 * Helper to format values for display
 */
function formatValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toLocaleDateString();
	return String(value);
}

// Render height clamped to browser-safe maximum
// Browsers struggle with elements > ~15M pixels (varies by browser)
// We use 10M as a safe limit that works across all browsers
const MAX_RENDER_HEIGHT = 10_000_000;

/**
 * StateManager class - manages all grid state without Svelte reactivity.
 */
export class StateManager<TData extends Record<string, unknown>> extends EventEmitter<StateChangeEvents> {
	// ===========================================
	// Configuration (immutable after construction)
	// ===========================================
	readonly rowHeight: number;
	readonly headerHeight: number;
	readonly overscan: number;
	readonly getRowId: GetRowId<TData>;

	private readonly options: StateManagerOptions<TData>;
	private readonly internalDataSource: DataSource<TData>;
	private readonly localDataSource: LocalDataSource<TData> | null = null;

	// ===========================================
	// Mutable State
	// ===========================================

	// Column state
	private _columns: ColumnDef<TData>[];
	private _columnWidths: Map<string, number>;
	private _columnOrder: string[];
	private _hiddenColumns: Set<string>;

	// Query state
	private _sortState: SortState[] = [];
	private _filterState: FilterState[] = [];
	private _globalSearchTerm: string = '';

	// Selection state
	private _selectedIds: Set<string | number> = new Set();
	private _focusedRowId: string | number | null = null;
	private _focusedColumnKey: string | null = null;
	private _focusedRowIndex: number = -1;
	private _lastSelectedRowId: string | number | null = null;

	// Viewport state
	private _scrollTop: number = 0;
	private _scrollLeft: number = 0;
	private _containerHeight: number = 0;
	private _containerWidth: number = 0;

	// Edit state
	private _editState: EditState | null = null;

	// ===========================================
	// Data State (from DataSource)
	// ===========================================

	private _rows: TData[] = [];
	private _totalRowCount: number = 0;
	private _isLoading: boolean = false;
	private _queryError: string | null = null;

	// Request tracking
	private _currentRequestId: string = '';
	private _requestIdCounter: number = 0;
	private _currentFetchPromise: Promise<void> = Promise.resolve();

	// ===========================================
	// Cached Computed Values (invalidated manually)
	// ===========================================

	private _visibleColumnsCache: ColumnDef<TData>[] | null = null;
	private _visibleRangeCache: VisibleRange | null = null;

	// Canvas for text measurement (created lazily)
	private _measureCanvas: HTMLCanvasElement | null = null;

	constructor(options: StateManagerOptions<TData>) {
		super();
		this.options = options;

		// Resolve DataSource - either use provided one or create from data
		if (options.dataSource) {
			this.internalDataSource = options.dataSource;
		} else if (options.data) {
			const lds = createLocalDataSource(options.data, options.idField);
			this.localDataSource = lds;
			this.internalDataSource = lds;
		} else {
			throw new Error('Either data or dataSource must be provided');
		}

		// Configuration
		this.rowHeight = options.rowHeight ?? 40;
		this.headerHeight = options.headerHeight ?? 48;
		this.overscan = options.overscan ?? 5;
		this.getRowId = options.getRowId ?? defaultGetRowId;

		// Initialize column state
		this._columns = options.columns;
		this._columnWidths = new Map(options.columns.map((col) => [col.key, col.width ?? 150]));
		this._columnOrder = options.columns.map((col) => col.key);
		this._hiddenColumns = new Set();

		// Trigger initial data fetch
		this._currentFetchPromise = this.fetchData();
	}

	// ===========================================
	// Getters - Public API
	// ===========================================

	// Data (from DataSource)
	get rows(): TData[] {
		return this._rows;
	}

	get totalRowCount(): number {
		return this._totalRowCount;
	}

	get isLoading(): boolean {
		return this._isLoading;
	}

	get queryError(): string | null {
		return this._queryError;
	}

	// For backwards compat - processedData now comes from DataSource
	get data(): TData[] {
		return this._rows;
	}

	get processedData(): TData[] {
		return this._rows;
	}

	// Column state
	get columns(): ColumnDef<TData>[] {
		return this._columns;
	}

	get visibleColumns(): ColumnDef<TData>[] {
		if (this._visibleColumnsCache === null) {
			this._visibleColumnsCache = this._columnOrder
				.filter((key) => !this._hiddenColumns.has(key))
				.map((key) => this._columns.find((c) => c.key === key)!)
				.filter(Boolean);
		}
		return this._visibleColumnsCache;
	}

	get pinnedLeftColumns(): ColumnDef<TData>[] {
		return this.visibleColumns.filter((col) => col.pinned === 'left');
	}

	get scrollableColumns(): ColumnDef<TData>[] {
		return this.visibleColumns.filter((col) => col.pinned !== 'left' && col.pinned !== 'right');
	}

	get pinnedLeftWidth(): number {
		return this.pinnedLeftColumns.reduce(
			(sum, col) => sum + (this._columnWidths.get(col.key) ?? col.width ?? 150),
			0
		);
	}

	get scrollableWidth(): number {
		return this.scrollableColumns.reduce(
			(sum, col) => sum + (this._columnWidths.get(col.key) ?? col.width ?? 150),
			0
		);
	}

	get totalWidth(): number {
		return this.visibleColumns.reduce(
			(sum, col) => sum + (this._columnWidths.get(col.key) ?? 150),
			0
		);
	}

	get columnWidths(): Map<string, number> {
		return this._columnWidths;
	}

	get columnOrder(): string[] {
		return this._columnOrder;
	}

	get hiddenColumns(): Set<string> {
		return this._hiddenColumns;
	}

	// Viewport state
	get visibleRange(): VisibleRange {
		if (this._visibleRangeCache === null) {
			const startIndex = Math.max(0, Math.floor(this._scrollTop / this.rowHeight) - this.overscan);
			const visibleCount = Math.ceil(this._containerHeight / this.rowHeight) + 2 * this.overscan;
			const endIndex = Math.min(this._rows.length - 1, startIndex + visibleCount);
			this._visibleRangeCache = { startIndex, endIndex, visibleCount };
		}
		return this._visibleRangeCache;
	}

	get visibleRows(): TData[] {
		const range = this.visibleRange;
		return this._rows.slice(range.startIndex, Math.max(0, range.endIndex + 1));
	}

	get totalHeight(): number {
		return this._totalRowCount * this.rowHeight;
	}

	get renderHeight(): number {
		const total = this._totalRowCount * this.rowHeight;
		return Math.min(total, MAX_RENDER_HEIGHT);
	}

	get offsetY(): number {
		return this.visibleRange.startIndex * this.rowHeight;
	}

	get scrollTop(): number {
		return this._scrollTop;
	}

	get scrollLeft(): number {
		return this._scrollLeft;
	}

	get containerHeight(): number {
		return this._containerHeight;
	}

	get containerWidth(): number {
		return this._containerWidth;
	}

	// Query state
	get sortState(): SortState[] {
		return this._sortState;
	}

	get filterState(): FilterState[] {
		return this._filterState;
	}

	get globalSearchTerm(): string {
		return this._globalSearchTerm;
	}

	// Selection state
	get selectedIds(): Set<string | number> {
		return this._selectedIds;
	}

	get focusedRowId(): string | number | null {
		return this._focusedRowId;
	}

	get focusedColumnKey(): string | null {
		return this._focusedColumnKey;
	}

	get focusedRowIndex(): number {
		return this._focusedRowIndex;
	}

	get lastSelectedRowId(): string | number | null {
		return this._lastSelectedRowId;
	}

	// Edit state
	get editState(): EditState | null {
		return this._editState;
	}

	// ===========================================
	// Data Fetching
	// ===========================================

	private async fetchData(): Promise<void> {
		const requestId = `req_${++this._requestIdCounter}`;
		this._currentRequestId = requestId;
		this._isLoading = true;
		this._queryError = null;
		this.emit('loading', { isLoading: true });

		const fetchStart = performance.now();

		try {
			const request: GridQueryRequest = {
				version: 1,
				requestId,
				pagination: {
					type: 'offset',
					offset: 0,
					limit: Number.MAX_SAFE_INTEGER
				},
				sort: toSortSpec(this._sortState),
				filter: toFilterExpression(this._filterState, this._globalSearchTerm, this._columns),
				requires: { rowCount: true }
			};

			const getRowsStart = performance.now();
			const result = await this.internalDataSource.getRows(request);
			const getRowsDuration = performance.now() - getRowsStart;

			// Check if this is still the current request
			if (this._currentRequestId !== requestId) return;

			if (result.success) {
				const assignStart = performance.now();
				this._rows = result.data.rows;
				this._totalRowCount = result.data.rowCount ?? result.data.rows.length;
				const assignDuration = performance.now() - assignStart;

				// Invalidate visible range cache since rows changed
				this._visibleRangeCache = null;

				// Log timing for large datasets
				if (result.data.rows.length > 10000) {
					console.log(`  [StateManager] getRows: ${getRowsDuration.toFixed(0)}ms, assign: ${assignDuration.toFixed(0)}ms`);
				}

				this.emit('data', { rows: this._rows, totalRowCount: this._totalRowCount });
			} else {
				this._queryError = result.error.message;
				this._rows = [];
				this._totalRowCount = 0;
				this._visibleRangeCache = null;
				this.emit('error', { queryError: this._queryError });
			}
		} catch (err) {
			if (this._currentRequestId !== requestId) return;
			this._queryError = err instanceof Error ? err.message : 'Failed to fetch data';
			this._rows = [];
			this._totalRowCount = 0;
			this._visibleRangeCache = null;
			this.emit('error', { queryError: this._queryError });
		} finally {
			if (this._currentRequestId === requestId) {
				this._isLoading = false;
				this.emit('loading', { isLoading: false });
				const totalDuration = performance.now() - fetchStart;
				if (this._totalRowCount > 10000) {
					console.log(`  [StateManager] fetchData total: ${totalDuration.toFixed(0)}ms`);
				}
			}
		}
	}

	/**
	 * Wait for any pending data fetch to complete.
	 * Useful for testing when you need to ensure data is loaded.
	 */
	waitForData(): Promise<void> {
		return this._currentFetchPromise;
	}

	/**
	 * Force refresh data from DataSource
	 */
	refresh(): Promise<void> {
		this._currentFetchPromise = this.fetchData();
		return this._currentFetchPromise;
	}

	// ===========================================
	// Sort Actions
	// ===========================================

	setSort(columnKey: string, direction: SortState['direction'], multiSort = false): void {
		if (!multiSort) {
			this._sortState = direction ? [{ columnKey, direction }] : [];
		} else {
			const existingIndex = this._sortState.findIndex((s) => s.columnKey === columnKey);
			if (existingIndex >= 0) {
				if (direction) {
					const newState = [...this._sortState];
					newState[existingIndex] = { columnKey, direction };
					this._sortState = newState;
				} else {
					this._sortState = this._sortState.filter((_, i) => i !== existingIndex);
				}
			} else if (direction) {
				this._sortState = [...this._sortState, { columnKey, direction }];
			}
		}
		this.options.onSortChange?.(this._sortState);
		this.emit('sort', { sortState: this._sortState });
		this._currentFetchPromise = this.fetchData();
	}

	toggleSort(columnKey: string, multiSort = false): void {
		const existing = this._sortState.find((s) => s.columnKey === columnKey);
		let newDirection: SortState['direction'];

		if (!existing) {
			newDirection = 'asc';
		} else if (existing.direction === 'asc') {
			newDirection = 'desc';
		} else {
			newDirection = null;
		}

		this.setSort(columnKey, newDirection, multiSort);
	}

	// ===========================================
	// Filter Actions
	// ===========================================

	setFilter(columnKey: string, value: unknown, operator: FilterOperator = 'contains'): void {
		const existingIndex = this._filterState.findIndex((f) => f.columnKey === columnKey);
		if (existingIndex >= 0) {
			if (value === null || value === undefined || value === '') {
				this._filterState = this._filterState.filter((_, i) => i !== existingIndex);
			} else {
				const newState = [...this._filterState];
				newState[existingIndex] = { columnKey, value, operator };
				this._filterState = newState;
			}
		} else if (value !== null && value !== undefined && value !== '') {
			this._filterState = [...this._filterState, { columnKey, value, operator }];
		}
		this.emit('filter', { filterState: this._filterState });
		this._currentFetchPromise = this.fetchData();
	}

	clearFilters(): void {
		this._filterState = [];
		this.emit('filter', { filterState: this._filterState });
		this._currentFetchPromise = this.fetchData();
	}

	setGlobalSearch(term: string): void {
		this._globalSearchTerm = term;
		this.emit('search', { globalSearchTerm: term });
		this._currentFetchPromise = this.fetchData();
	}

	clearGlobalSearch(): void {
		this._globalSearchTerm = '';
		this.emit('search', { globalSearchTerm: '' });
		this._currentFetchPromise = this.fetchData();
	}

	// ===========================================
	// Selection Actions
	// ===========================================

	selectRow(rowId: string | number, mode: 'toggle' | 'add' | 'remove' | 'set' = 'toggle'): void {
		const newSelected = new Set(this._selectedIds);

		switch (mode) {
			case 'toggle':
				if (newSelected.has(rowId)) {
					newSelected.delete(rowId);
				} else {
					if (this.options.selectionMode === 'single') newSelected.clear();
					newSelected.add(rowId);
				}
				break;
			case 'add':
				if (this.options.selectionMode === 'single') newSelected.clear();
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

		this._selectedIds = newSelected;
		this._lastSelectedRowId = rowId;

		const idx = this._rows.findIndex((row, i) => this.getRowId(row, i) === rowId);
		if (idx >= 0) {
			this._focusedRowIndex = idx;
			this._focusedRowId = rowId;
		}

		this.options.onSelectionChange?.(this._selectedIds);
		this.emit('selection', { selectedIds: this._selectedIds });
	}

	selectRange(targetRowId: string | number): void {
		if (this.options.selectionMode !== 'multiple') {
			this.selectRow(targetRowId, 'set');
			return;
		}

		const anchorId = this._lastSelectedRowId ?? targetRowId;
		let anchorIndex = -1;
		let targetIndex = -1;

		for (let i = 0; i < this._rows.length; i++) {
			const id = this.getRowId(this._rows[i], i);
			if (id === anchorId) anchorIndex = i;
			if (id === targetRowId) targetIndex = i;
			if (anchorIndex >= 0 && targetIndex >= 0) break;
		}

		if (anchorIndex < 0 || targetIndex < 0) {
			this.selectRow(targetRowId, 'set');
			return;
		}

		const start = Math.min(anchorIndex, targetIndex);
		const end = Math.max(anchorIndex, targetIndex);

		const newSelected = new Set(this._selectedIds);
		for (let i = start; i <= end; i++) {
			newSelected.add(this.getRowId(this._rows[i], i));
		}

		this._selectedIds = newSelected;
		this._focusedRowIndex = targetIndex;
		this._focusedRowId = targetRowId;
		this.options.onSelectionChange?.(this._selectedIds);
		this.emit('selection', { selectedIds: this._selectedIds });
	}

	selectAll(): void {
		if (this.options.selectionMode !== 'multiple') return;
		this._selectedIds = new Set(this._rows.map((row, i) => this.getRowId(row, i)));
		this.options.onSelectionChange?.(this._selectedIds);
		this.emit('selection', { selectedIds: this._selectedIds });
	}

	clearSelection(): void {
		this._selectedIds = new Set();
		this.options.onSelectionChange?.(this._selectedIds);
		this.emit('selection', { selectedIds: this._selectedIds });
	}

	isRowSelected(rowId: string | number): boolean {
		return this._selectedIds.has(rowId);
	}

	// ===========================================
	// Column Actions
	// ===========================================

	setColumnWidth(columnKey: string, width: number): void {
		const column = this._columns.find((c) => c.key === columnKey);
		const minWidth = column?.minWidth ?? 50;
		const maxWidth = column?.maxWidth ?? Infinity;
		const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));

		const newWidths = new Map(this._columnWidths);
		newWidths.set(columnKey, clampedWidth);
		this._columnWidths = newWidths;
		this.emit('columns', { type: 'width' });
	}

	setColumnVisibility(columnKey: string, visible: boolean): void {
		const newHidden = new Set(this._hiddenColumns);
		if (visible) {
			newHidden.delete(columnKey);
		} else {
			newHidden.add(columnKey);
		}
		this._hiddenColumns = newHidden;
		this._visibleColumnsCache = null; // Invalidate cache
		this.emit('columns', { type: 'visibility' });
	}

	setColumnPinned(columnKey: string, pinned: 'left' | 'right' | false): void {
		const idx = this._columns.findIndex((c) => c.key === columnKey);
		if (idx < 0) return;

		// Update column definition
		this._columns = this._columns.map((c, i) => (i === idx ? { ...c, pinned } : c));
		this._visibleColumnsCache = null; // Invalidate cache

		// Reorder: pinned left columns go first, then scrollable, then pinned right
		const newOrder = [
			...this._columnOrder.filter((key) => {
				const col = this._columns.find((c) => c.key === key);
				return col?.pinned === 'left';
			}),
			...this._columnOrder.filter((key) => {
				const col = this._columns.find((c) => c.key === key);
				return col?.pinned !== 'left' && col?.pinned !== 'right';
			}),
			...this._columnOrder.filter((key) => {
				const col = this._columns.find((c) => c.key === key);
				return col?.pinned === 'right';
			})
		];
		this._columnOrder = newOrder;
		this.emit('columns', { type: 'pinning' });
	}

	reorderColumn(columnKey: string, targetIndex: number): boolean {
		const currentIndex = this._columnOrder.indexOf(columnKey);
		if (currentIndex < 0 || targetIndex < 0 || targetIndex >= this._columnOrder.length) {
			return false;
		}

		if (currentIndex === targetIndex) {
			return true;
		}

		// Check pinning boundaries - can't move pinned column to non-pinned area and vice versa
		const column = this._columns.find((c) => c.key === columnKey);
		const targetColumn = this._columns.find((c) => c.key === this._columnOrder[targetIndex]);

		if (column?.pinned !== targetColumn?.pinned) {
			return false; // Respect pinning boundaries
		}

		// Perform the reorder
		const newOrder = [...this._columnOrder];
		newOrder.splice(currentIndex, 1);
		newOrder.splice(targetIndex, 0, columnKey);
		this._columnOrder = newOrder;
		this._visibleColumnsCache = null; // Invalidate cache

		this.emit('columns', { type: 'order' });
		return true;
	}

	private measureTextWidth(text: string, font: string): number {
		if (typeof document === 'undefined') {
			// Fallback for SSR/node - rough estimate based on character count
			return text.length * 8;
		}
		if (!this._measureCanvas) {
			this._measureCanvas = document.createElement('canvas');
		}
		const ctx = this._measureCanvas.getContext('2d')!;
		ctx.font = font;
		return ctx.measureText(text).width;
	}

	autoSizeColumn(columnKey: string, options: AutoSizeOptions = {}): void {
		const column = this._columns.find((c) => c.key === columnKey);
		if (!column) return;

		const { includeHeader = true, maxWidth, sampleSize = 1000 } = options;

		// Font settings (should match CSS)
		const cellFont = '14px system-ui, -apple-system, sans-serif';
		const headerFont = '600 14px system-ui, -apple-system, sans-serif';
		const padding = 24; // Cell padding (12px each side)
		const sortIconWidth = 20; // Space for sort indicator

		let maxContentWidth = 0;

		// Measure header
		if (includeHeader) {
			const headerWidth = this.measureTextWidth(column.header, headerFont) + sortIconWidth;
			maxContentWidth = Math.max(maxContentWidth, headerWidth);
		}

		// Sample rows for large datasets
		let rowsToMeasure = this._rows;
		if (this._rows.length > sampleSize) {
			// Sample evenly across the dataset
			const step = Math.floor(this._rows.length / sampleSize);
			rowsToMeasure = [];
			for (let i = 0; i < this._rows.length && rowsToMeasure.length < sampleSize; i += step) {
				rowsToMeasure.push(this._rows[i]);
			}
		}

		// Measure each row's cell value
		for (const row of rowsToMeasure) {
			const value = getColumnValue(row, column);
			const displayValue = column.formatter ? column.formatter(value as never) : formatValue(value);
			const width = this.measureTextWidth(displayValue, cellFont);
			maxContentWidth = Math.max(maxContentWidth, width);
		}

		// Apply width with constraints
		let newWidth = maxContentWidth + padding;
		const minWidth = column.minWidth ?? 50;
		const effectiveMaxWidth = Math.min(maxWidth ?? Infinity, column.maxWidth ?? Infinity);

		newWidth = Math.max(minWidth, Math.min(effectiveMaxWidth, newWidth));
		this.setColumnWidth(columnKey, newWidth);
	}

	autoSizeAllColumns(options: AutoSizeOptions = {}): void {
		for (const column of this._columns) {
			if (!this._hiddenColumns.has(column.key)) {
				this.autoSizeColumn(column.key, options);
			}
		}
	}

	// ===========================================
	// Viewport Actions
	// ===========================================

	setScroll(top: number, left: number): void {
		// Compute totals - scrollLeft only applies to scrollable (non-pinned) columns
		const computedTotalHeight = this._totalRowCount * this.rowHeight;
		const computedScrollableWidth = this.scrollableWidth;
		const availableScrollWidth = this._containerWidth - this.pinnedLeftWidth;

		const newScrollTop = Math.max(0, Math.min(top, Math.max(0, computedTotalHeight - this._containerHeight)));
		const newScrollLeft = Math.max(0, Math.min(left, Math.max(0, computedScrollableWidth - availableScrollWidth)));

		const changed = this._scrollTop !== newScrollTop || this._scrollLeft !== newScrollLeft;
		if (!changed) return;

		this._scrollTop = newScrollTop;
		this._scrollLeft = newScrollLeft;
		this._visibleRangeCache = null; // Invalidate cache

		this.emit('scroll', { scrollTop: newScrollTop, scrollLeft: newScrollLeft });
	}

	setContainerSize(width: number, height: number): void {
		const changed = this._containerWidth !== width || this._containerHeight !== height;
		if (!changed) return;

		this._containerWidth = width;
		this._containerHeight = height;
		this._visibleRangeCache = null; // Invalidate cache

		this.emit('resize', { width, height });
	}

	scrollToRow(index: number, align: 'start' | 'center' | 'end' | 'nearest' = 'start'): void {
		if (index < 0 || index >= this._rows.length) return;

		const rowTop = index * this.rowHeight;
		const rowBottom = rowTop + this.rowHeight;
		const viewportTop = this._scrollTop;
		const viewportBottom = this._scrollTop + this._containerHeight;

		let targetScrollTop: number;

		switch (align) {
			case 'center':
				targetScrollTop = index * this.rowHeight - this._containerHeight / 2 + this.rowHeight / 2;
				break;
			case 'end':
				targetScrollTop = index * this.rowHeight - this._containerHeight + this.rowHeight;
				break;
			case 'nearest':
				if (rowTop < viewportTop) {
					targetScrollTop = rowTop;
				} else if (rowBottom > viewportBottom) {
					targetScrollTop = rowBottom - this._containerHeight;
				} else {
					return;
				}
				break;
			default:
				targetScrollTop = index * this.rowHeight;
		}

		this.setScroll(targetScrollTop, this._scrollLeft);
	}

	// ===========================================
	// Navigation
	// ===========================================

	navigateRow(offset: number, select = false, extendSelection = false): string | number | null {
		const currentIndex = this._focusedRowIndex >= 0 ? this._focusedRowIndex : 0;
		const newIndex = Math.max(0, Math.min(this._rows.length - 1, currentIndex + offset));

		if (newIndex === currentIndex && this._focusedRowIndex >= 0) return this._focusedRowId;
		if (this._rows.length === 0) return null;

		const newRow = this._rows[newIndex];
		const newRowId = this.getRowId(newRow, newIndex);

		this._focusedRowIndex = newIndex;
		this._focusedRowId = newRowId;

		if (select) {
			if (extendSelection && this.options.selectionMode === 'multiple') {
				this.selectRange(newRowId);
			} else {
				this.selectRow(newRowId, 'set');
			}
		}

		this.scrollToRow(newIndex, 'nearest');
		this.emit('focus', { rowId: newRowId, columnKey: this._focusedColumnKey });
		return newRowId;
	}

	navigateToFirst(select = false): string | number | null {
		if (this._rows.length === 0) return null;
		this._focusedRowIndex = 0;
		this._focusedRowId = this.getRowId(this._rows[0], 0);
		if (select) this.selectRow(this._focusedRowId, 'set');
		this.scrollToRow(0, 'start');
		this.emit('focus', { rowId: this._focusedRowId, columnKey: this._focusedColumnKey });
		return this._focusedRowId;
	}

	navigateToLast(select = false): string | number | null {
		if (this._rows.length === 0) return null;
		const lastIndex = this._rows.length - 1;
		this._focusedRowIndex = lastIndex;
		this._focusedRowId = this.getRowId(this._rows[lastIndex], lastIndex);
		if (select) this.selectRow(this._focusedRowId, 'set');
		this.scrollToRow(lastIndex, 'end');
		this.emit('focus', { rowId: this._focusedRowId, columnKey: this._focusedColumnKey });
		return this._focusedRowId;
	}

	navigateByPage(direction: 'up' | 'down', select = false): string | number | null {
		const visibleRowCount = Math.floor(this._containerHeight / this.rowHeight);
		const offset = direction === 'down' ? visibleRowCount : -visibleRowCount;
		return this.navigateRow(offset, select);
	}

	setFocus(rowId: string | number | null, columnKey: string | null): void {
		this._focusedRowId = rowId;
		this._focusedColumnKey = columnKey;
		if (rowId !== null) {
			const idx = this._rows.findIndex((row, i) => this.getRowId(row, i) === rowId);
			if (idx >= 0) this._focusedRowIndex = idx;
		}
		this.emit('focus', { rowId, columnKey });
	}

	// ===========================================
	// Edit Actions
	// ===========================================

	startEdit(rowId: string | number, columnKey: string): boolean {
		const column = this._columns.find((c) => c.key === columnKey);
		if (!column || column.editable === false) return false;

		const rowIndex = this._rows.findIndex((row, i) => this.getRowId(row, i) === rowId);
		if (rowIndex < 0) return false;

		const row = this._rows[rowIndex];
		const value = getColumnValue(row, column);

		this._editState = {
			rowId,
			columnKey,
			value,
			originalValue: value,
			error: undefined
		};

		this._focusedRowId = rowId;
		this._focusedColumnKey = columnKey;
		this._focusedRowIndex = rowIndex;

		this.emit('edit', { editState: this._editState });
		return true;
	}

	setEditValue(value: unknown): void {
		if (!this._editState) return;
		const error = this.options.onCellValidate?.(this._editState.rowId, this._editState.columnKey, value) ?? undefined;
		this._editState = { ...this._editState, value, error };
		this.emit('edit', { editState: this._editState });
	}

	async commitEdit(): Promise<boolean> {
		if (!this._editState) return false;
		if (this._editState.saving) return false;

		const error = this.options.onCellValidate?.(this._editState.rowId, this._editState.columnKey, this._editState.value);
		if (error) {
			this._editState = { ...this._editState, error };
			this.emit('edit', { editState: this._editState });
			return false;
		}

		const { rowId, columnKey, value, originalValue } = this._editState;

		if (value === originalValue) {
			this._editState = null;
			this.emit('edit', { editState: null });
			return true;
		}

		// Always try to use DataSource for persistence
		if (isMutableDataSource(this.internalDataSource)) {
			this._editState = { ...this._editState, saving: true, error: undefined };
			this.emit('edit', { editState: this._editState });

			try {
				const result = await this.internalDataSource.mutate([
					{
						type: 'update',
						rowId,
						data: { [columnKey]: value } as Partial<TData>
					}
				]);

				if (!result.success) {
					this._editState = { ...this._editState, saving: false, error: result.error.message };
					this.emit('edit', { editState: this._editState });
					return false;
				}

				// Refresh data from DataSource
				await this.fetchData();
			} catch (err) {
				this._editState = { ...this._editState, saving: false, error: err instanceof Error ? err.message : 'Save failed' };
				this.emit('edit', { editState: this._editState });
				return false;
			}
		}

		// Notify callback
		this.options.onCellEdit?.(rowId, columnKey, value, originalValue);

		this._editState = null;
		this.emit('edit', { editState: null });
		return true;
	}

	cancelEdit(): void {
		if (this._editState?.saving) return;
		this._editState = null;
		this.emit('edit', { editState: null });
	}

	isEditing(rowId: string | number, columnKey: string): boolean {
		return this._editState?.rowId === rowId && this._editState?.columnKey === columnKey;
	}

	hasActiveEdit(): boolean {
		return this._editState !== null;
	}

	// ===========================================
	// Data Management
	// ===========================================

	/**
	 * Update source data (only works when using data prop, not external DataSource)
	 */
	updateData(newData: TData[]): void {
		if (this.localDataSource) {
			// Clear current rows first to help GC release memory before new allocation
			this._rows = [];
			this._totalRowCount = 0;
			this._visibleRangeCache = null;
			this.localDataSource.setData(newData);
			this._currentFetchPromise = this.fetchData();
		}
	}

	updateColumns(newColumns: ColumnDef<TData>[]): void {
		this._columns = newColumns;
		this._visibleColumnsCache = null; // Invalidate cache

		const newOrder = [...this._columnOrder];
		for (const col of newColumns) {
			if (!newOrder.includes(col.key)) newOrder.push(col.key);
		}
		this._columnOrder = newOrder.filter((key) => newColumns.some((c) => c.key === key));

		this.emit('columns', { type: 'update' });
	}
}

/**
 * Factory function to create a StateManager instance.
 * This matches the createGridState() API for compatibility.
 */
export function createStateManager<TData extends Record<string, unknown>>(
	options: StateManagerOptions<TData>
): StateManager<TData> {
	return new StateManager(options);
}
