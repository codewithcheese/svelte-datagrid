# Datagrid Refactoring Plan: Raw JavaScript Renderer

## Executive Summary

This plan outlines the refactoring of svelte-datagrid from a Svelte-component-based renderer to a **raw JavaScript rendering engine** with a thin Svelte wrapper. This architecture mirrors high-performance grids like AG Grid and Handsontable.

**Goal**: Eliminate Svelte reactivity overhead during rendering while maintaining the developer-friendly Svelte API.

---

## Table of Contents

1. [Problem Analysis](#1-problem-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Grid Engine Design](#3-grid-engine-design)
4. [DOM Pooling Strategy](#4-dom-pooling-strategy)
5. [Svelte Wrapper Interface](#5-svelte-wrapper-interface)
6. [Migration Strategy](#6-migration-strategy)
7. [Testing Strategy](#7-testing-strategy)
8. [Risk Analysis](#8-risk-analysis)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Problem Analysis

### Current Architecture Issues

#### 1.1 Reactive Overhead Per Cell

Current implementation creates reactive bindings for every visible cell:

```svelte
<!-- Cell.svelte - executed for EACH cell -->
const value = $derived.by(() => { /* accessor logic */ });
const displayValue = $derived.by(() => { /* formatting logic */ });
const isEditingThis = $derived(gridState.isEditing(rowId, column.key));
const isCellEditable = $derived(editable && column.editable !== false);
```

**Impact**: With 50 visible rows × 10 columns = 500 cells, each scroll creates/destroys:
- 500+ `$derived` subscriptions
- 500+ component instances
- 500+ context lookups

#### 1.2 Component Lifecycle During Scroll

Each scroll that changes visible rows triggers:
1. Svelte destroys old Row/Cell components
2. Svelte creates new Row/Cell components
3. Each component runs setup code (`$derived`, `$effect`)
4. Context is looked up for each component
5. DOM elements are created/destroyed

#### 1.3 Reactive Graph Complexity

State changes flow through Svelte's reactive graph:
```
sortState change
  → $effect triggers fetchData()
  → rows updates
  → visibleRows recomputes
  → Each Row component re-renders
  → Each Cell component re-renders
```

This cascading effect adds latency to user interactions.

#### 1.4 Memory Churn

Constant component creation/destruction during scrolling causes:
- Garbage collection pressure
- Memory fragmentation
- Unpredictable frame timing

### Performance Targets (from CLAUDE.md)

| Operation | Target | Current Risk |
|-----------|--------|--------------|
| UI updates | <16ms | ⚠️ At risk during scroll |
| Scroll frame | <5ms | ⚠️ Component overhead |
| Sort 100K rows | <100ms | ✅ Handled by DataSource |
| Filter 100K rows | <50ms | ✅ Handled by DataSource |

---

## 2. Proposed Architecture

### 2.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Svelte Application                            │
├─────────────────────────────────────────────────────────────────┤
│  <DataGrid>  ← Svelte wrapper component                         │
│    - Accepts props (data, columns, etc.)                        │
│    - Provides Svelte events (oncellclick, onsortchange, etc.)   │
│    - Exposes gridState for external control                     │
│    - Mounts GridEngine to container element                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ mount(element, options)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GridEngine (Pure JS/TS)                       │
├─────────────────────────────────────────────────────────────────┤
│  State Manager                                                   │
│    - All grid state (sort, filter, selection, scroll, etc.)    │
│    - Computed values (visibleRows, columnWidths, etc.)          │
│    - Event emitter for state changes                            │
├─────────────────────────────────────────────────────────────────┤
│  Renderer                                                        │
│    - DOM element pool (rows, cells)                             │
│    - Direct DOM manipulation                                     │
│    - CSS class toggling                                          │
│    - Batched updates via requestAnimationFrame                  │
├─────────────────────────────────────────────────────────────────┤
│  Event Handler                                                   │
│    - Delegated event listeners on container                     │
│    - Keyboard navigation                                         │
│    - Mouse interactions (click, drag, resize)                   │
├─────────────────────────────────────────────────────────────────┤
│  Editor Manager                                                  │
│    - Inline editing lifecycle                                    │
│    - Editor element pooling                                      │
│    - Validation integration                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Action (scroll, click, type)
         │
         ▼
┌─────────────────┐
│  Event Handler  │ ← Delegated events on container
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  State Manager  │ ← Updates internal state
└────────┬────────┘
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐
│    Renderer     │      │  Svelte Callbacks   │
│  (DOM updates)  │      │  (event forwarding) │
└─────────────────┘      └─────────────────────┘
```

### 2.3 Key Principles

1. **No Svelte inside the grid viewport** - All visible rows/cells rendered by JS
2. **DOM pooling** - Reuse DOM elements instead of create/destroy
3. **Batched updates** - Coalesce DOM changes into single rAF
4. **Event delegation** - Single listener per event type on container
5. **Computed caching** - Manual invalidation of derived values
6. **Zero-copy where possible** - Pass references, not clones

---

## 3. Grid Engine Design

### 3.1 Module Structure

```
src/lib/engine/
├── index.ts                 # Public API exports
├── GridEngine.ts            # Main orchestrator
├── state/
│   ├── StateManager.ts      # Central state management
│   ├── SelectionState.ts    # Selection logic
│   ├── EditState.ts         # Editing logic
│   ├── ScrollState.ts       # Viewport calculations
│   └── ColumnState.ts       # Column management
├── render/
│   ├── Renderer.ts          # Main render orchestrator
│   ├── RowPool.ts           # Row element pool
│   ├── CellPool.ts          # Cell element pool
│   ├── HeaderRenderer.ts    # Header rendering
│   ├── BodyRenderer.ts      # Body/rows rendering
│   └── StyleManager.ts      # Dynamic styles
├── events/
│   ├── EventManager.ts      # Event delegation
│   ├── KeyboardHandler.ts   # Keyboard navigation
│   ├── MouseHandler.ts      # Click, drag, resize
│   └── TouchHandler.ts      # Mobile support
├── editors/
│   ├── EditorManager.ts     # Editor lifecycle
│   ├── TextEditor.ts        # Text input
│   ├── NumberEditor.ts      # Number input
│   └── EditorPool.ts        # Editor element reuse
└── types.ts                 # TypeScript interfaces
```

### 3.2 GridEngine Class

```typescript
// src/lib/engine/GridEngine.ts

export interface GridEngineOptions<TData> {
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
  selectable?: boolean | SelectionMode;
  editable?: boolean;

  // Callbacks
  onCellClick?: (event: GridCellClickEvent<TData>) => void;
  onRowClick?: (event: GridRowClickEvent<TData>) => void;
  onSortChange?: (event: GridSortEvent) => void;
  onSelectionChange?: (event: GridSelectionChangeEvent) => void;
  onCellEdit?: (event: GridCellEditEvent<TData>) => void;
  onCellValidate?: (rowId: string | number, columnKey: string, value: unknown) => string | null;

  // Custom rendering
  cellRenderer?: (cell: CellRenderContext<TData>) => string | HTMLElement;
  headerRenderer?: (column: ColumnDef<TData>) => string | HTMLElement;
}

export class GridEngine<TData = unknown> {
  private container: HTMLElement;
  private options: Required<GridEngineOptions<TData>>;

  private stateManager: StateManager<TData>;
  private renderer: Renderer<TData>;
  private eventManager: EventManager<TData>;
  private editorManager: EditorManager<TData>;

  constructor(container: HTMLElement, options: GridEngineOptions<TData>) {
    this.container = container;
    this.options = this.normalizeOptions(options);

    // Initialize subsystems
    this.stateManager = new StateManager(this.options);
    this.renderer = new Renderer(container, this.stateManager, this.options);
    this.eventManager = new EventManager(container, this.stateManager, this.options);
    this.editorManager = new EditorManager(container, this.stateManager, this.options);

    // Wire up internal events
    this.stateManager.on('stateChange', this.handleStateChange.bind(this));

    // Initial render
    this.renderer.render();
  }

  // === Public API (mirrors current gridState) ===

  // Data
  get rows(): TData[] { return this.stateManager.rows; }
  get totalRowCount(): number { return this.stateManager.totalRowCount; }
  get isLoading(): boolean { return this.stateManager.isLoading; }
  updateData(data: TData[]): void { this.stateManager.updateData(data); }
  refresh(): Promise<void> { return this.stateManager.refresh(); }

  // Selection
  selectRow(rowId: string | number, mode?: SelectionMode): void { ... }
  selectRange(targetRowId: string | number): void { ... }
  selectAll(): void { ... }
  clearSelection(): void { ... }
  get selectedIds(): Set<string | number> { ... }

  // Navigation
  navigateRow(offset: number, select?: boolean, extend?: boolean): void { ... }
  navigateToFirst(select?: boolean): void { ... }
  navigateToLast(select?: boolean): void { ... }
  navigateByPage(direction: 'up' | 'down', select?: boolean): void { ... }
  scrollToRow(index: number, align?: ScrollAlignment): void { ... }

  // Sorting & Filtering
  setSort(columnKey: string, direction: SortDirection | null, multi?: boolean): void { ... }
  toggleSort(columnKey: string, multi?: boolean): void { ... }
  setFilter(columnKey: string, value: unknown, operator?: FilterOperator): void { ... }
  clearFilters(): void { ... }
  setGlobalSearch(term: string): void { ... }

  // Columns
  setColumnWidth(columnKey: string, width: number): void { ... }
  setColumnVisibility(columnKey: string, visible: boolean): void { ... }
  setColumnPinned(columnKey: string, pinned: 'left' | 'right' | false): void { ... }
  reorderColumn(columnKey: string, targetIndex: number): void { ... }
  autoSizeColumn(columnKey: string): void { ... }

  // Editing
  startEdit(rowId: string | number, columnKey: string): boolean { ... }
  commitEdit(): Promise<boolean> { ... }
  cancelEdit(): void { ... }

  // Lifecycle
  destroy(): void {
    this.eventManager.destroy();
    this.renderer.destroy();
    this.editorManager.destroy();
  }

  // Options update
  updateOptions(options: Partial<GridEngineOptions<TData>>): void { ... }
}
```

### 3.3 StateManager Class

```typescript
// src/lib/engine/state/StateManager.ts

export class StateManager<TData> extends EventEmitter {
  // === Mutable State ===
  private _sortState: SortState[] = [];
  private _filterState: FilterState[] = [];
  private _globalSearchTerm: string = '';
  private _selectedIds: Set<string | number> = new Set();
  private _focusedRowId: string | number | null = null;
  private _focusedColumnKey: string | null = null;
  private _focusedRowIndex: number = -1;
  private _lastSelectedRowId: string | number | null = null;
  private _scrollTop: number = 0;
  private _scrollLeft: number = 0;
  private _containerHeight: number = 0;
  private _containerWidth: number = 0;
  private _columnWidths: Map<string, number> = new Map();
  private _columnOrder: string[] = [];
  private _hiddenColumns: Set<string> = new Set();
  private _editState: EditState | null = null;
  private _columns: ColumnDef<TData>[] = [];

  // === Data State ===
  private _rows: TData[] = [];
  private _totalRowCount: number = 0;
  private _isLoading: boolean = false;
  private _queryError: string | null = null;

  // === Cached Computed Values ===
  private _visibleColumnsCache: ColumnDef<TData>[] | null = null;
  private _visibleRangeCache: VisibleRange | null = null;
  private _visibleRowsCache: TData[] | null = null;

  // === Invalidation Flags ===
  private _dirtyFlags = {
    visibleColumns: true,
    visibleRange: true,
    visibleRows: true,
    totalWidth: true,
    pinnedWidths: true,
  };

  // === Getters with Caching ===

  get visibleColumns(): ColumnDef<TData>[] {
    if (this._dirtyFlags.visibleColumns || !this._visibleColumnsCache) {
      this._visibleColumnsCache = this._columnOrder
        .filter(key => !this._hiddenColumns.has(key))
        .map(key => this._columns.find(c => c.key === key)!)
        .filter(Boolean);
      this._dirtyFlags.visibleColumns = false;
    }
    return this._visibleColumnsCache;
  }

  get visibleRange(): VisibleRange {
    if (this._dirtyFlags.visibleRange || !this._visibleRangeCache) {
      const startIndex = Math.max(0, Math.floor(this._scrollTop / this.rowHeight) - this.overscan);
      const visibleCount = Math.ceil(this._containerHeight / this.rowHeight) + 2 * this.overscan;
      const endIndex = Math.min(this._rows.length, startIndex + visibleCount);

      this._visibleRangeCache = { startIndex, endIndex, visibleCount };
      this._dirtyFlags.visibleRange = false;
    }
    return this._visibleRangeCache;
  }

  get visibleRows(): TData[] {
    if (this._dirtyFlags.visibleRows || !this._visibleRowsCache) {
      const { startIndex, endIndex } = this.visibleRange;
      this._visibleRowsCache = this._rows.slice(startIndex, endIndex);
      this._dirtyFlags.visibleRows = false;
    }
    return this._visibleRowsCache;
  }

  // === Setters with Invalidation ===

  setScroll(top: number, left: number): void {
    const changed = this._scrollTop !== top || this._scrollLeft !== left;
    if (!changed) return;

    this._scrollTop = top;
    this._scrollLeft = left;
    this._dirtyFlags.visibleRange = true;
    this._dirtyFlags.visibleRows = true;

    this.emit('stateChange', { type: 'scroll', scrollTop: top, scrollLeft: left });
  }

  setColumnOrder(order: string[]): void {
    this._columnOrder = order;
    this._dirtyFlags.visibleColumns = true;
    this.emit('stateChange', { type: 'columns' });
  }

  // ... similar pattern for all setters
}
```

---

## 4. DOM Pooling Strategy

### 4.1 Row Pool

```typescript
// src/lib/engine/render/RowPool.ts

interface PooledRow {
  element: HTMLDivElement;
  cells: Map<string, PooledCell>;
  rowId: string | number | null;
  inUse: boolean;
}

export class RowPool {
  private pool: PooledRow[] = [];
  private activeRows: Map<string | number, PooledRow> = new Map();
  private container: HTMLElement;

  constructor(container: HTMLElement, private options: PoolOptions) {
    this.container = container;
  }

  /**
   * Pre-allocate row elements for smooth scrolling
   */
  warmup(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.createRow());
    }
  }

  /**
   * Get or create a row element for the given rowId
   */
  acquire(rowId: string | number): PooledRow {
    // Check if already active
    const existing = this.activeRows.get(rowId);
    if (existing) return existing;

    // Find unused row in pool
    let row = this.pool.find(r => !r.inUse);

    // Create new if pool exhausted
    if (!row) {
      row = this.createRow();
      this.pool.push(row);
    }

    row.inUse = true;
    row.rowId = rowId;
    this.activeRows.set(rowId, row);

    return row;
  }

  /**
   * Release a row back to the pool
   */
  release(rowId: string | number): void {
    const row = this.activeRows.get(rowId);
    if (!row) return;

    row.inUse = false;
    row.rowId = null;
    this.activeRows.delete(rowId);

    // Reset state but keep in DOM (hidden)
    row.element.style.display = 'none';
    row.element.classList.remove('selected', 'focused', 'editing');
  }

  /**
   * Release all rows not in the keep set
   */
  releaseExcept(keepIds: Set<string | number>): void {
    for (const [rowId, row] of this.activeRows) {
      if (!keepIds.has(rowId)) {
        this.release(rowId);
      }
    }
  }

  private createRow(): PooledRow {
    const element = document.createElement('div');
    element.className = 'datagrid-row';
    element.setAttribute('role', 'row');
    element.style.display = 'none';
    this.container.appendChild(element);

    return {
      element,
      cells: new Map(),
      rowId: null,
      inUse: false,
    };
  }

  destroy(): void {
    for (const row of this.pool) {
      row.element.remove();
    }
    this.pool = [];
    this.activeRows.clear();
  }
}
```

### 4.2 Cell Pool (within Row)

```typescript
// src/lib/engine/render/CellPool.ts

interface PooledCell {
  element: HTMLDivElement;
  contentEl: HTMLSpanElement;
  columnKey: string | null;
  inUse: boolean;
}

export class CellPool {
  private pool: PooledCell[] = [];
  private activeCells: Map<string, PooledCell> = new Map();

  constructor(private rowElement: HTMLElement) {}

  acquire(columnKey: string): PooledCell {
    const existing = this.activeCells.get(columnKey);
    if (existing) return existing;

    let cell = this.pool.find(c => !c.inUse);

    if (!cell) {
      cell = this.createCell();
      this.pool.push(cell);
    }

    cell.inUse = true;
    cell.columnKey = columnKey;
    this.activeCells.set(columnKey, cell);

    return cell;
  }

  private createCell(): PooledCell {
    const element = document.createElement('div');
    element.className = 'datagrid-cell';
    element.setAttribute('role', 'gridcell');

    const contentEl = document.createElement('span');
    contentEl.className = 'datagrid-cell-content';
    element.appendChild(contentEl);

    this.rowElement.appendChild(element);

    return {
      element,
      contentEl,
      columnKey: null,
      inUse: false,
    };
  }
}
```

### 4.3 Render Cycle

```typescript
// src/lib/engine/render/BodyRenderer.ts

export class BodyRenderer<TData> {
  private rowPool: RowPool;
  private pendingUpdate: number | null = null;

  constructor(
    private container: HTMLElement,
    private state: StateManager<TData>,
    private options: RenderOptions
  ) {
    this.rowPool = new RowPool(container, { initialSize: 50 });
    this.rowPool.warmup(50); // Pre-allocate for smooth initial scroll
  }

  /**
   * Schedule a render on next animation frame
   */
  scheduleRender(): void {
    if (this.pendingUpdate !== null) return;

    this.pendingUpdate = requestAnimationFrame(() => {
      this.pendingUpdate = null;
      this.render();
    });
  }

  /**
   * Immediate render (call sparingly)
   */
  render(): void {
    const { visibleRows, visibleRange } = this.state;
    const { startIndex } = visibleRange;

    // Track which rows we need
    const neededRowIds = new Set<string | number>();

    // Update container transform
    const offsetY = startIndex * this.options.rowHeight;
    this.container.style.transform = `translateY(${offsetY}px)`;

    // Render each visible row
    visibleRows.forEach((row, i) => {
      const rowIndex = startIndex + i;
      const rowId = this.options.getRowId(row, rowIndex);
      neededRowIds.add(rowId);

      this.renderRow(row, rowId, rowIndex);
    });

    // Release unused rows back to pool
    this.rowPool.releaseExcept(neededRowIds);
  }

  private renderRow(row: TData, rowId: string | number, rowIndex: number): void {
    const pooledRow = this.rowPool.acquire(rowId);
    const { element } = pooledRow;

    // Show and position
    element.style.display = '';
    element.style.height = `${this.options.rowHeight}px`;

    // Update classes
    const isSelected = this.state.selectedIds.has(rowId);
    const isEven = rowIndex % 2 === 0;
    element.classList.toggle('selected', isSelected);
    element.classList.toggle('even', isEven);
    element.classList.toggle('odd', !isEven);

    // Update data attribute for event delegation
    element.dataset.rowId = String(rowId);
    element.dataset.rowIndex = String(rowIndex);

    // Render cells
    this.renderCells(pooledRow, row, rowId);
  }

  private renderCells(
    pooledRow: PooledRow,
    row: TData,
    rowId: string | number
  ): void {
    const { visibleColumns, columnWidths, scrollLeft } = this.state;

    let x = 0;
    for (const column of visibleColumns) {
      const width = columnWidths.get(column.key) ?? column.width ?? 150;
      const cell = pooledRow.cells.get(column.key) ?? this.createCellInRow(pooledRow, column.key);

      // Position
      cell.element.style.width = `${width}px`;
      cell.element.style.transform = column.pinned ? '' : `translateX(${-scrollLeft}px)`;

      // Content
      const value = this.getCellValue(row, column);
      const displayValue = this.formatValue(value, column);

      // Only update if changed (avoid layout thrashing)
      if (cell.contentEl.textContent !== displayValue) {
        cell.contentEl.textContent = displayValue;
      }

      // Classes
      cell.element.classList.toggle('align-right', column.align === 'right');
      cell.element.classList.toggle('align-center', column.align === 'center');

      x += width;
    }
  }

  private getCellValue(row: TData, column: ColumnDef<TData>): unknown {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    if (column.accessor) {
      return (row as Record<string, unknown>)[column.accessor as string];
    }
    return (row as Record<string, unknown>)[column.key];
  }

  private formatValue(value: unknown, column: ColumnDef<TData>): string {
    if (column.formatter) return column.formatter(value);
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  }
}
```

---

## 5. Svelte Wrapper Interface

### 5.1 DataGrid.svelte (New)

```svelte
<!-- src/lib/components/datagrid/DataGrid.svelte -->
<script lang="ts" generics="TData">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { GridEngine, type GridEngineOptions } from '$lib/engine';
  import type { ColumnDef, DataSource } from '$lib/types';

  // === Props (same as current API) ===
  interface Props {
    data?: TData[];
    dataSource?: DataSource<TData>;
    columns: ColumnDef<TData>[];
    height?: number | string;
    width?: number | string;
    rowHeight?: number;
    headerHeight?: number;
    sortable?: boolean;
    filterable?: boolean;
    searchable?: boolean;
    resizable?: boolean;
    reorderable?: boolean;
    selectable?: boolean | SelectionMode;
    editable?: boolean;
    overscan?: number;
    getRowId?: (row: TData, index: number) => string | number;
    class?: string;
    rowClass?: string | ((row: TData, index: number) => string);
    loading?: boolean;
    emptyMessage?: string;
    errorMessage?: string;

    // Callbacks (Svelte 5 style)
    oncellclick?: (event: GridCellClickEvent<TData>) => void;
    onrowclick?: (event: GridRowClickEvent<TData>) => void;
    onsortchange?: (event: GridSortEvent) => void;
    onselectionchange?: (event: GridSelectionChangeEvent) => void;
    oncelledit?: (event: GridCellEditEvent<TData>) => void;
    oncellvalidate?: (rowId: string | number, columnKey: string, value: unknown) => string | null;
  }

  let {
    data,
    dataSource,
    columns,
    height = 400,
    width = '100%',
    rowHeight = 40,
    headerHeight = 48,
    sortable = true,
    filterable = false,
    searchable = false,
    resizable = true,
    reorderable = false,
    selectable = false,
    editable = false,
    overscan = 5,
    getRowId,
    class: className = '',
    rowClass,
    loading,
    emptyMessage = 'No data to display',
    errorMessage,
    oncellclick,
    onrowclick,
    onsortchange,
    onselectionchange,
    oncelledit,
    oncellvalidate,
  }: Props = $props();

  // === Internal State ===
  let containerEl: HTMLDivElement;
  let engine: GridEngine<TData> | null = null;

  // === Computed Styles ===
  const containerStyle = $derived(
    `height: ${typeof height === 'number' ? `${height}px` : height}; ` +
    `width: ${typeof width === 'number' ? `${width}px` : width};`
  );

  // === Lifecycle ===
  onMount(() => {
    engine = new GridEngine(containerEl, {
      data,
      dataSource,
      columns,
      rowHeight,
      headerHeight,
      sortable,
      filterable,
      searchable,
      resizable,
      reorderable,
      selectable,
      editable,
      overscan,
      getRowId,
      rowClass,

      // Wire up callbacks to Svelte events
      onCellClick: oncellclick,
      onRowClick: onrowclick,
      onSortChange: onsortchange,
      onSelectionChange: onselectionchange,
      onCellEdit: oncelledit,
      onCellValidate: oncellvalidate,
    });
  });

  onDestroy(() => {
    engine?.destroy();
  });

  // === React to prop changes ===
  $effect(() => {
    if (!engine) return;

    // Update data when prop changes
    if (data !== undefined) {
      engine.updateData(data);
    }
  });

  $effect(() => {
    if (!engine) return;
    engine.updateOptions({ columns });
  });

  // === Expose engine methods via bindable ===
  export function getEngine(): GridEngine<TData> | null {
    return engine;
  }

  // === Convenience methods that delegate to engine ===
  export function selectRow(rowId: string | number, mode?: SelectionMode) {
    engine?.selectRow(rowId, mode);
  }

  export function selectAll() {
    engine?.selectAll();
  }

  export function clearSelection() {
    engine?.clearSelection();
  }

  export function scrollToRow(index: number, align?: ScrollAlignment) {
    engine?.scrollToRow(index, align);
  }

  export function refresh(): Promise<void> {
    return engine?.refresh() ?? Promise.resolve();
  }
</script>

<div
  bind:this={containerEl}
  class="datagrid {className}"
  style={containerStyle}
  role="grid"
  data-testid="datagrid"
>
  <!-- GridEngine will render inside this container -->
  <!-- No Svelte children needed for the actual grid content -->
</div>

<style>
  .datagrid {
    position: relative;
    overflow: hidden;
    font-family: var(--datagrid-font-family, system-ui, -apple-system, sans-serif);
    font-size: var(--datagrid-font-size, 14px);
    border: 1px solid var(--datagrid-border-color, #e0e0e0);
    border-radius: var(--datagrid-border-radius, 4px);
    background: var(--datagrid-bg, #fff);
    color: var(--datagrid-color, #333);
  }
</style>
```

### 5.2 API Compatibility Layer

The Svelte wrapper maintains **100% API compatibility** with the current implementation:

| Current API | New Implementation |
|-------------|-------------------|
| `<DataGrid {data} {columns} />` | Same - wrapper accepts identical props |
| `oncellclick` callback | Forwarded to engine, engine calls back |
| `gridState.selectRow()` | `engine.selectRow()` via exported method |
| `$state` reactivity | `$effect` watches props, calls engine methods |
| Context-based access | Use `getEngine()` export instead |

---

## 6. Migration Strategy

### 6.1 Phased Approach

```
Phase 1: Foundation (Non-Breaking)
├── Create engine/ directory structure
├── Implement StateManager (port from grid-state.svelte.ts)
├── Implement basic Renderer with DOM pooling
├── Unit tests for engine components
│
Phase 2: Core Rendering (Non-Breaking)
├── Implement RowPool and CellPool
├── Implement BodyRenderer
├── Implement HeaderRenderer
├── Performance benchmarks
│
Phase 3: Interactivity (Non-Breaking)
├── Implement EventManager (delegation)
├── Implement KeyboardHandler
├── Implement MouseHandler (resize, reorder)
├── Implement EditorManager
│
Phase 4: Integration (Breaking)
├── Create new DataGrid.svelte wrapper
├── Deprecate old Svelte components
├── Update documentation
├── Migration guide for users
│
Phase 5: Cleanup
├── Remove old components (Body.svelte, Row.svelte, Cell.svelte, etc.)
├── Update all tests
├── Performance validation
├── Release v2.0
```

### 6.2 File-by-File Migration

| Old File | Action | New Location |
|----------|--------|--------------|
| `grid-state.svelte.ts` | Port to pure TS | `engine/state/StateManager.ts` |
| `Body.svelte` | Replace | `engine/render/BodyRenderer.ts` |
| `Row.svelte` | Replace | `engine/render/RowPool.ts` |
| `Cell.svelte` | Replace | `engine/render/CellPool.ts` |
| `Header.svelte` | Replace | `engine/render/HeaderRenderer.ts` |
| `HeaderCell.svelte` | Replace | `engine/render/HeaderRenderer.ts` |
| `FilterRow.svelte` | Replace | `engine/render/FilterRenderer.ts` |
| `FilterInput.svelte` | Replace | `engine/render/FilterRenderer.ts` |
| `SearchBar.svelte` | Replace | `engine/render/SearchRenderer.ts` |
| `CellEditor.svelte` | Replace | `engine/editors/EditorManager.ts` |
| `TextEditor.svelte` | Replace | `engine/editors/TextEditor.ts` |
| `NumberEditor.svelte` | Replace | `engine/editors/NumberEditor.ts` |
| `DataGrid.svelte` | Rewrite | Keep path, new implementation |
| `virtualizer.ts` | Keep | Already pure TS, reuse |

### 6.3 Backward Compatibility

During migration, maintain both implementations:

```typescript
// src/lib/index.ts

// New engine-based (default export for v2)
export { DataGrid } from './components/datagrid/DataGrid.svelte';
export { GridEngine } from './engine';

// Legacy Svelte-based (deprecated, remove in v3)
export { DataGrid as DataGridLegacy } from './components/datagrid-legacy/DataGrid.svelte';
```

---

## 7. Testing Strategy

### 7.1 Test Categories

```
tests/
├── unit/                          # Node.js, no DOM
│   ├── engine/
│   │   ├── StateManager.test.ts   # Port existing grid-state tests
│   │   ├── SelectionState.test.ts
│   │   ├── EditState.test.ts
│   │   └── ...
│   └── ...
│
├── browser/                       # Playwright browser
│   ├── engine/
│   │   ├── RowPool.test.ts        # DOM pooling tests
│   │   ├── Renderer.test.ts       # Render output tests
│   │   └── EventManager.test.ts   # Event delegation tests
│   ├── integration/
│   │   ├── DataGrid.svelte.test.ts  # Full component tests
│   │   └── ...
│   └── ...
│
└── perf/                          # Performance benchmarks
    ├── scroll.bench.ts            # Scroll FPS
    ├── render.bench.ts            # Initial render time
    ├── pool.bench.ts              # Pool efficiency
    └── ...
```

### 7.2 Performance Test Suite

```typescript
// tests/perf/scroll.bench.ts

describe('Scroll Performance', () => {
  it('maintains 60fps during continuous scroll with 100K rows', async () => {
    const engine = new GridEngine(container, {
      data: generateData(100_000),
      columns: testColumns,
    });

    const frameTimes: number[] = [];
    let lastTime = performance.now();

    // Simulate continuous scroll
    for (let scrollTop = 0; scrollTop < 10000; scrollTop += 100) {
      const start = performance.now();
      engine.setScroll(scrollTop, 0);
      await waitForRender();
      frameTimes.push(performance.now() - start);
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    const p95FrameTime = frameTimes.sort((a, b) => a - b)[Math.floor(frameTimes.length * 0.95)];

    expect(avgFrameTime).toBeLessThan(16); // 60fps average
    expect(p95FrameTime).toBeLessThan(33); // 30fps minimum
  });

  it('reuses DOM elements during scroll (no createElement)', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    const engine = new GridEngine(container, {
      data: generateData(10_000),
      columns: testColumns,
    });

    const initialCalls = createElementSpy.mock.calls.length;

    // Scroll through entire dataset
    for (let scrollTop = 0; scrollTop < 5000; scrollTop += 500) {
      engine.setScroll(scrollTop, 0);
      await waitForRender();
    }

    const scrollCalls = createElementSpy.mock.calls.length - initialCalls;

    // Should create very few new elements (only if pool exhausted)
    expect(scrollCalls).toBeLessThan(10);
  });
});
```

### 7.3 Compatibility Tests

```typescript
// tests/integration/api-compatibility.test.ts

describe('API Compatibility', () => {
  it('supports all existing props', () => {
    // Verify TypeScript compilation with all props
    const grid = render(DataGrid, {
      data: testData,
      columns: testColumns,
      height: 400,
      width: '100%',
      rowHeight: 40,
      headerHeight: 48,
      sortable: true,
      filterable: true,
      searchable: true,
      resizable: true,
      reorderable: true,
      selectable: 'multiple',
      editable: true,
      overscan: 5,
      getRowId: (row) => row.id,
      class: 'custom-class',
      rowClass: (row) => row.status,
      loading: false,
      emptyMessage: 'No data',
      errorMessage: 'Error',
      oncellclick: () => {},
      onrowclick: () => {},
      onsortchange: () => {},
      onselectionchange: () => {},
      oncelledit: () => {},
      oncellvalidate: () => null,
    });

    expect(grid).toBeTruthy();
  });

  it('emits all existing events', async () => {
    const handlers = {
      oncellclick: vi.fn(),
      onrowclick: vi.fn(),
      onsortchange: vi.fn(),
      onselectionchange: vi.fn(),
      oncelledit: vi.fn(),
    };

    render(DataGrid, { ...defaultProps, ...handlers });

    // Trigger events...
    await userEvent.click(page.getByRole('gridcell').first());
    expect(handlers.oncellclick).toHaveBeenCalled();

    // ... test all events
  });
});
```

---

## 8. Risk Analysis

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance regression | Medium | High | Comprehensive benchmarks before/after |
| API breaking changes | Low | High | TypeScript ensures compatibility |
| Browser compatibility | Low | Medium | Test on Chrome, Firefox, Safari, Edge |
| Memory leaks in pooling | Medium | Medium | Leak detection in tests |
| Custom renderer breakage | Medium | High | Clear migration guide |
| Accessibility regression | Medium | High | ARIA tests, screen reader testing |

### 8.2 Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | Medium | Strict phase boundaries |
| Incomplete migration | Medium | High | Feature flags for rollback |
| Documentation lag | High | Medium | Update docs with each phase |
| User confusion | Medium | Medium | Clear changelog, migration guide |

### 8.3 Rollback Plan

Each phase maintains the ability to rollback:

1. **Phase 1-3**: Engine exists alongside Svelte components, no breaking changes
2. **Phase 4**: Feature flag `useEngine: boolean` prop (default: true in v2)
3. **Phase 5**: Keep legacy components available as `@svelte-datagrid/legacy`

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Core engine infrastructure without breaking existing code

**Tasks**:
- [ ] Create `src/lib/engine/` directory structure
- [ ] Port `grid-state.svelte.ts` to `StateManager.ts` (remove Svelte runes)
- [ ] Implement `EventEmitter` for state change notifications
- [ ] Create `GridEngine` class shell
- [ ] Port existing state tests to new StateManager
- [ ] Ensure all existing tests still pass

**Files Created**:
```
src/lib/engine/
├── index.ts
├── GridEngine.ts
├── types.ts
└── state/
    ├── StateManager.ts
    ├── SelectionState.ts (extracted from StateManager)
    └── EditState.ts (extracted from StateManager)
```

**Success Criteria**:
- All 100+ grid-state tests pass against new StateManager
- No changes to existing Svelte components
- TypeScript compiles without errors

---

### Phase 2: Core Rendering (Week 3-4)

**Goal**: DOM pooling and basic rendering without events

**Tasks**:
- [ ] Implement `RowPool` with warmup and recycling
- [ ] Implement `CellPool` for cell reuse within rows
- [ ] Implement `BodyRenderer` with pooled rendering
- [ ] Implement `HeaderRenderer` (static, no interactions yet)
- [ ] Create render benchmarks
- [ ] Verify DOM element reuse during scroll

**Files Created**:
```
src/lib/engine/render/
├── Renderer.ts
├── BodyRenderer.ts
├── HeaderRenderer.ts
├── RowPool.ts
├── CellPool.ts
└── StyleManager.ts
```

**Success Criteria**:
- Scroll benchmark: <5ms per frame with 100K rows
- createElement calls during scroll: <10 for full dataset scroll
- Visual output matches current implementation

---

### Phase 3: Interactivity (Week 5-6)

**Goal**: Full feature parity with event handling

**Tasks**:
- [ ] Implement `EventManager` with delegation
- [ ] Implement `KeyboardHandler` (navigation, selection)
- [ ] Implement `MouseHandler` (click, resize, reorder, drag)
- [ ] Implement `TouchHandler` (mobile scroll)
- [ ] Implement `EditorManager` with editor pooling
- [ ] Implement `TextEditor` and `NumberEditor`
- [ ] Implement `FilterRenderer` and `SearchRenderer`
- [ ] Full interaction tests

**Files Created**:
```
src/lib/engine/events/
├── EventManager.ts
├── KeyboardHandler.ts
├── MouseHandler.ts
└── TouchHandler.ts

src/lib/engine/editors/
├── EditorManager.ts
├── TextEditor.ts
├── NumberEditor.ts
└── EditorPool.ts

src/lib/engine/render/
├── FilterRenderer.ts
└── SearchRenderer.ts
```

**Success Criteria**:
- All keyboard shortcuts work identically
- Column resize/reorder works
- Cell editing works with validation
- Selection (single, multiple, range) works

---

### Phase 4: Integration (Week 7-8)

**Goal**: New Svelte wrapper, deprecate old components

**Tasks**:
- [ ] Rewrite `DataGrid.svelte` to use `GridEngine`
- [ ] Implement prop reactivity (`$effect` watching props)
- [ ] Export engine methods from component
- [ ] Move old components to `datagrid-legacy/`
- [ ] Update all imports in tests
- [ ] Write migration guide
- [ ] Update documentation

**File Changes**:
```
src/lib/components/
├── datagrid/
│   └── DataGrid.svelte          # NEW (engine-based)
└── datagrid-legacy/             # OLD (moved here)
    ├── DataGrid.svelte
    ├── core/
    │   ├── Body.svelte
    │   ├── Row.svelte
    │   └── ...
    └── ...
```

**Success Criteria**:
- All existing tests pass with new implementation
- No TypeScript errors
- Documentation updated
- Migration guide complete

---

### Phase 5: Cleanup (Week 9-10)

**Goal**: Remove legacy code, final optimizations, release

**Tasks**:
- [ ] Remove `datagrid-legacy/` directory
- [ ] Final performance optimization pass
- [ ] Memory leak testing
- [ ] Accessibility audit
- [ ] Update CHANGELOG for v2.0
- [ ] Update README
- [ ] Tag v2.0.0 release

**Success Criteria**:
- Performance targets met (from CLAUDE.md)
- No memory leaks in 24-hour soak test
- WCAG 2.1 AA compliance
- All documentation current
- Clean v2.0.0 release

---

## Appendix A: Performance Comparison Targets

| Metric | Current (Svelte) | Target (Engine) | Improvement |
|--------|------------------|-----------------|-------------|
| Initial render (1K rows) | ~200ms | <100ms | 2x |
| Initial render (100K rows) | ~800ms | <200ms | 4x |
| Scroll frame time | ~8ms | <3ms | 2.5x |
| Memory during scroll | Growing | Stable | N/A |
| DOM elements (100K rows) | ~500 | ~100 (pooled) | 5x fewer |

## Appendix B: Custom Renderer Migration

**Current (Svelte Component)**:
```svelte
<!-- StatusBadge.svelte -->
<script>
  let { value, row, column } = $props();
</script>
<span class="badge">{value}</span>
```

**New (Function or HTML String)**:
```typescript
// Option 1: Return HTML string
cellRenderer: ({ value }) => `<span class="badge">${value}</span>`

// Option 2: Return DOM element
cellRenderer: ({ value }) => {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = value;
  return span;
}

// Option 3: Keep Svelte component (engine mounts it)
cellRenderer: StatusBadge // Engine calls new StatusBadge({ target, props })
```

## Appendix C: Glossary

- **DOM Pooling**: Reusing DOM elements instead of creating/destroying
- **Event Delegation**: Single event listener on container, not per-element
- **rAF**: `requestAnimationFrame` - browser's render timing API
- **Virtualization**: Only rendering visible rows in viewport
- **Overscan**: Extra rows rendered above/below viewport for smooth scroll
