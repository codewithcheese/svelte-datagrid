/**
 * GridEngine - Main orchestrator for the pure TypeScript grid implementation.
 *
 * This class ties together all subsystems:
 * - StateManager: State management and data handling
 * - BodyRenderer: Row/cell rendering with DOM pooling
 * - HeaderRenderer: Header rendering with sort/resize
 * - EventManager: Event delegation
 * - EditorManager: Cell editing lifecycle
 *
 * Benefits:
 * - Single entry point for grid functionality
 * - Framework-agnostic (can be wrapped by any UI framework)
 * - Clean separation of concerns
 */

import type { ColumnDef, GridCellClickEvent, GridRowClickEvent, GridCellEditEvent, FilterOperator, SortState } from '../types/index.js';
import type { DataSource } from '../query/types.js';
import { StateManager, createStateManager } from './state/StateManager.js';
import { BodyRenderer } from './render/BodyRenderer.js';
import { HeaderRenderer } from './render/HeaderRenderer.js';
import { EventManager, createEventManager } from './events/EventManager.js';
import { EditorManager, createEditorManager } from './events/EditorManager.js';

export interface GridEngineOptions<TData extends Record<string, unknown>> {
	// Data
	data?: TData[];
	dataSource?: DataSource<TData>;
	columns: ColumnDef<TData>[];
	getRowId?: (row: TData, index: number) => string | number;

	// Dimensions
	rowHeight?: number;
	headerHeight?: number;
	overscan?: number;

	// Features
	sortable?: boolean;
	filterable?: boolean;
	searchable?: boolean;
	resizable?: boolean;
	reorderable?: boolean;
	selectable?: boolean | 'single' | 'multiple';
	editable?: boolean;

	// Callbacks
	onCellClick?: (event: GridCellClickEvent<TData>) => void;
	onRowClick?: (event: GridRowClickEvent<TData>) => void;
	onSortChange?: (sort: SortState[]) => void;
	onSelectionChange?: (selectedIds: Set<string | number>) => void;
	onCellEdit?: (event: GridCellEditEvent<TData>) => void;
	onCellValidate?: (rowId: string | number, columnKey: string, value: unknown) => string | null;

	// Custom rendering
	cellRenderer?: (context: { row: TData; column: ColumnDef<TData>; value: unknown }) => string;
	headerRenderer?: (column: ColumnDef<TData>) => string;

	// Row styling
	rowClass?: string | ((row: TData, index: number) => string);
}

export class GridEngine<TData extends Record<string, unknown>> {
	private container: HTMLElement;
	private headerContainer: HTMLElement;
	private bodyContainer: HTMLElement;
	private options: GridEngineOptions<TData>;

	private stateManager: StateManager<TData>;
	private bodyRenderer: BodyRenderer<TData>;
	private headerRenderer: HeaderRenderer<TData>;
	private eventManager: EventManager<TData>;
	private editorManager: EditorManager<TData>;

	private resizeObserver: ResizeObserver | null = null;
	private isDestroyed = false;

	constructor(container: HTMLElement, options: GridEngineOptions<TData>) {
		this.container = container;
		this.options = options;

		// Create internal structure
		this.headerContainer = document.createElement('div');
		this.headerContainer.className = 'datagrid-header-container';
		this.bodyContainer = document.createElement('div');
		this.bodyContainer.className = 'datagrid-body-container';
		this.bodyContainer.setAttribute('role', 'rowgroup');
		this.bodyContainer.setAttribute('data-testid', 'datagrid-body');

		container.appendChild(this.headerContainer);
		container.appendChild(this.bodyContainer);

		// Initialize StateManager
		this.stateManager = createStateManager<TData>({
			data: options.data,
			dataSource: options.dataSource,
			columns: options.columns,
			rowHeight: options.rowHeight ?? 40,
			headerHeight: options.headerHeight ?? 48,
			overscan: options.overscan ?? 5,
			getRowId: options.getRowId,
			selectionMode: this.normalizeSelectionMode(options.selectable),
			onSortChange: options.onSortChange,
			onSelectionChange: options.onSelectionChange,
			onCellValidate: options.onCellValidate,
			onCellEdit: (rowId, columnKey, value, originalValue) => {
				if (options.onCellEdit) {
					const row = this.getRowData(rowId);
					const column = this.getColumn(columnKey);
					const rowIndex = this.getRowIndex(rowId);
					if (row && column && rowIndex !== -1) {
						options.onCellEdit({
							row,
							rowId,
							rowIndex,
							columnKey,
							oldValue: originalValue,
							newValue: value,
							column
						});
					}
				}
			}
		});

		// Initialize BodyRenderer
		this.bodyRenderer = new BodyRenderer<TData>(this.bodyContainer, this.stateManager, {
			rowHeight: options.rowHeight ?? 40,
			getRowId: options.getRowId
				? (row: unknown, index: number) => options.getRowId!(row as TData, index)
				: ((_row: unknown, index: number) => index),
			cellRenderer: options.cellRenderer
				? (context) => options.cellRenderer!({
					row: context.row as TData,
					column: context.column as ColumnDef<TData>,
					value: context.value
				})
				: undefined,
			rowClass: options.rowClass
				? (row, index) => {
					if (typeof options.rowClass === 'function') {
						return options.rowClass(row as TData, index);
					}
					return options.rowClass ?? '';
				}
				: undefined
		});

		// Initialize HeaderRenderer
		this.headerRenderer = new HeaderRenderer<TData>(this.headerContainer, this.stateManager, {
			headerHeight: options.headerHeight ?? 48,
			sortable: options.sortable ?? true,
			resizable: options.resizable ?? true,
			reorderable: options.reorderable ?? false
		});

		// Initialize EventManager
		this.eventManager = createEventManager<TData>(this.bodyContainer, {
			stateManager: this.stateManager,
			selectable: options.selectable ?? false,
			editable: options.editable ?? false,
			onCellClick: options.onCellClick,
			onRowClick: options.onRowClick,
			onCellDoubleClick: (rowId, columnKey) => {
				if (options.editable) {
					this.stateManager.startEdit(rowId, columnKey);
				}
			},
			getRowData: (rowId) => this.getRowData(rowId),
			getColumn: (key) => this.getColumn(key)
		});

		// Initialize EditorManager
		this.editorManager = createEditorManager<TData>({
			stateManager: this.stateManager,
			container: this.bodyContainer,
			getRowData: (rowId) => this.getRowData(rowId),
			getColumn: (key) => this.getColumn(key),
			getCellElement: (rowId, columnKey) => this.getCellElement(rowId, columnKey),
			onCellValidate: options.onCellValidate
		});

		// Set up container sizing
		this.setupResizeObserver();

		// Initial data fetch is handled by StateManager constructor
	}

	// ===========================================
	// Helper Methods
	// ===========================================

	private normalizeSelectionMode(selectable?: boolean | 'single' | 'multiple'): 'single' | 'multiple' | undefined {
		if (selectable === true) return 'single';
		if (selectable === 'single' || selectable === 'multiple') return selectable;
		return undefined;
	}

	private getRowData(rowId: string | number): TData | undefined {
		return this.stateManager.rows.find((row, i) => this.stateManager.getRowId(row, i) === rowId);
	}

	private getColumn(key: string): ColumnDef<TData> | undefined {
		return this.options.columns.find((col) => col.key === key);
	}

	private getRowIndex(rowId: string | number): number {
		return this.stateManager.rows.findIndex((row, i) => this.stateManager.getRowId(row, i) === rowId);
	}

	private getCellElement(rowId: string | number, columnKey: string): HTMLElement | null {
		// Find the row element
		const rowEl = this.bodyContainer.querySelector(`[data-row-id="${rowId}"]`);
		if (!rowEl) return null;

		// Find the cell element
		return rowEl.querySelector(`[data-column-key="${columnKey}"]`);
	}

	private setupResizeObserver(): void {
		if (typeof ResizeObserver === 'undefined') return;

		this.resizeObserver = new ResizeObserver((entries) => {
			if (this.isDestroyed) return;

			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				const headerHeight = this.options.headerHeight ?? 48;
				this.stateManager.setContainerSize(height - headerHeight, width);
			}
		});

		this.resizeObserver.observe(this.container);
	}

	// ===========================================
	// Public API - Data
	// ===========================================

	get rows(): TData[] {
		return this.stateManager.rows;
	}

	get totalRowCount(): number {
		return this.stateManager.totalRowCount;
	}

	get isLoading(): boolean {
		return this.stateManager.isLoading;
	}

	updateData(data: TData[]): void {
		this.stateManager.updateData(data);
	}

	refresh(): Promise<void> {
		return this.stateManager.refresh();
	}

	// ===========================================
	// Public API - Selection
	// ===========================================

	selectRow(rowId: string | number, mode?: 'toggle' | 'add' | 'remove' | 'set'): void {
		this.stateManager.selectRow(rowId, mode);
	}

	selectRange(targetRowId: string | number): void {
		this.stateManager.selectRange(targetRowId);
	}

	selectAll(): void {
		this.stateManager.selectAll();
	}

	clearSelection(): void {
		this.stateManager.clearSelection();
	}

	get selectedIds(): Set<string | number> {
		return this.stateManager.selectedIds;
	}

	isRowSelected(rowId: string | number): boolean {
		return this.stateManager.isRowSelected(rowId);
	}

	// ===========================================
	// Public API - Navigation
	// ===========================================

	navigateRow(offset: number, select?: boolean, extend?: boolean): void {
		this.stateManager.navigateRow(offset, select, extend);
	}

	navigateToFirst(select?: boolean): void {
		this.stateManager.navigateToFirst(select);
	}

	navigateToLast(select?: boolean): void {
		this.stateManager.navigateToLast(select);
	}

	navigateByPage(direction: 'up' | 'down', select?: boolean): void {
		this.stateManager.navigateByPage(direction, select);
	}

	scrollToRow(index: number): void {
		this.stateManager.scrollToRow(index);
	}

	// ===========================================
	// Public API - Sorting & Filtering
	// ===========================================

	setSort(columnKey: string, direction: 'asc' | 'desc' | null, multi?: boolean): void {
		this.stateManager.setSort(columnKey, direction, multi);
	}

	toggleSort(columnKey: string, multi?: boolean): void {
		this.stateManager.toggleSort(columnKey, multi);
	}

	setFilter(columnKey: string, value: unknown, operator?: FilterOperator): void {
		this.stateManager.setFilter(columnKey, value, operator);
	}

	clearFilters(): void {
		this.stateManager.clearFilters();
	}

	setGlobalSearch(term: string): void {
		this.stateManager.setGlobalSearch(term);
	}

	get sortState() {
		return this.stateManager.sortState;
	}

	get filterState() {
		return this.stateManager.filterState;
	}

	// ===========================================
	// Public API - Columns
	// ===========================================

	setColumnWidth(columnKey: string, width: number): void {
		this.stateManager.setColumnWidth(columnKey, width);
	}

	setColumnVisibility(columnKey: string, visible: boolean): void {
		this.stateManager.setColumnVisibility(columnKey, visible);
	}

	get visibleColumns(): ColumnDef<TData>[] {
		return this.stateManager.visibleColumns;
	}

	get columnWidths(): Map<string, number> {
		return this.stateManager.columnWidths;
	}

	// ===========================================
	// Public API - Editing
	// ===========================================

	startEdit(rowId: string | number, columnKey: string): boolean {
		return this.stateManager.startEdit(rowId, columnKey);
	}

	commitEdit(): Promise<boolean> {
		return this.stateManager.commitEdit();
	}

	cancelEdit(): void {
		this.stateManager.cancelEdit();
	}

	get editState() {
		return this.stateManager.editState;
	}

	// ===========================================
	// Public API - Scroll
	// ===========================================

	setScroll(scrollTop: number, scrollLeft: number): void {
		this.stateManager.setScroll(scrollTop, scrollLeft);
	}

	get scrollTop(): number {
		return this.stateManager.scrollTop;
	}

	get scrollLeft(): number {
		return this.stateManager.scrollLeft;
	}

	// ===========================================
	// Lifecycle
	// ===========================================

	updateOptions(options: Partial<GridEngineOptions<TData>>): void {
		Object.assign(this.options, options);

		// Update subsystems
		if (options.columns) {
			this.stateManager.updateColumns(options.columns);
		}

		if (options.selectable !== undefined) {
			this.eventManager.updateOptions({
				selectable: options.selectable
			});
		}

		if (options.editable !== undefined) {
			this.eventManager.updateOptions({
				editable: options.editable
			});
		}
	}

	destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		this.resizeObserver?.disconnect();
		this.eventManager.destroy();
		this.editorManager.destroy();
		this.bodyRenderer.destroy();
		this.headerRenderer.destroy();

		// Clean up DOM
		this.headerContainer.remove();
		this.bodyContainer.remove();
	}

	// ===========================================
	// State Manager Access (for advanced use)
	// ===========================================

	getStateManager(): StateManager<TData> {
		return this.stateManager;
	}
}

/**
 * Factory function to create a GridEngine instance.
 */
export function createGridEngine<TData extends Record<string, unknown>>(
	container: HTMLElement,
	options: GridEngineOptions<TData>
): GridEngine<TData> {
	return new GridEngine(container, options);
}
