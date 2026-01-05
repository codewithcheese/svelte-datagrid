# State Management

This document explains how Svelte DataGrid manages state using the StateManager class.

## The Event-Based Model

StateManager uses pure TypeScript with event-based notifications:

- State is stored in typed class properties
- Changes trigger events that renderers subscribe to
- No framework-specific reactivity (no Svelte stores, no React state)

This approach provides:
- Maximum performance (no reactivity overhead)
- Framework independence (same engine works anywhere)
- Explicit control over update timing
- Easy testing and debugging

## State Architecture

```
┌─────────────────────────────────────────────────────────┐
│ StateManager                                            │
│                                                         │
│  Properties (source of truth)    Events (notifications) │
│  ┌─────────────────┐            ┌─────────────────────┐│
│  │ rows            │───────────►│ 'data'              ││
│  │ selectedIds     │───────────►│ 'selection'         ││
│  │ sortState       │───────────►│ 'sort'              ││
│  │ filterState     │───────────►│ 'filter'            ││
│  │ scrollTop/Left  │───────────►│ 'scroll'            ││
│  │ columnWidths    │───────────►│ 'columns'           ││
│  │ focusedRowId    │───────────►│ 'focus'             ││
│  └─────────────────┘            └─────────────────────┘│
│                                                         │
│  Methods                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ selectRow(), setSort(), setFilter(), etc.       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Subscriptions                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ on(event, callback) - subscribe to changes      │   │
│  │ off(event, callback) - unsubscribe              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## State Properties

### Data State

```typescript
// Primary data from DataSource
rows: TData[]              // Current rows (after sort/filter)
totalRowCount: number      // Total rows in DataSource
isLoading: boolean         // Fetch in progress
queryError: string | null  // Last query error

// Visible rows (virtualized slice)
visibleRows: TData[]       // Rows in viewport
startIndex: number         // First visible row index
endIndex: number           // Last visible row index
```

### Column State

```typescript
columns: ColumnDef<TData>[]           // Column definitions
columnWidths: Map<string, number>     // Current widths
columnOrder: string[]                 // Display order
pinnedLeftColumns: ColumnDef[]        // Left-pinned
pinnedRightColumns: ColumnDef[]       // Right-pinned
scrollableColumns: ColumnDef[]        // Non-pinned
```

### Selection State

```typescript
selectedIds: Set<string | number>     // Selected row IDs
focusedRowId: string | number | null  // Currently focused
focusedColumnKey: string | null       // Focused cell column
lastSelectedRowId: string | number | null  // For range selection
```

### Sort & Filter State

```typescript
sortState: SortState[]                // Current sort config
filterState: FilterState[]            // Column filters
globalSearchTerm: string              // Search text
```

### Scroll State

```typescript
scrollTop: number          // Vertical scroll position
scrollLeft: number         // Horizontal scroll position
viewportHeight: number     // Visible area height
viewportWidth: number      // Visible area width
```

## Event System

StateManager uses a simple pub/sub pattern:

```typescript
class StateManager<TData> {
  private listeners = new Map<string, Set<Function>>();

  // Subscribe to an event
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // Unsubscribe from an event
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  // Emit an event (internal)
  private emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}
```

### Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `data` | Row data changes | `TData[]` |
| `selection` | Selection changes | `Set<string\|number>` |
| `sort` | Sort state changes | `SortState[]` |
| `filter` | Filter state changes | `FilterState[]` |
| `scroll` | Scroll position changes | `{ top, left }` |
| `columns` | Column config changes | `ColumnDef[]` |
| `focus` | Focus changes | `{ rowId, columnKey }` |

### Subscribing to Events

Renderers subscribe to relevant events:

```typescript
// BodyRenderer subscribes to data and scroll
stateManager.on('data', () => this.render());
stateManager.on('scroll', () => this.updatePositions());
stateManager.on('selection', () => this.updateSelectionClasses());

// HeaderRenderer subscribes to sort and columns
stateManager.on('sort', () => this.updateSortIndicators());
stateManager.on('columns', () => this.render());
```

## State Mutation Pattern

State is only mutated through methods:

```typescript
selectRow(rowId: string | number, mode?: 'toggle' | 'add' | 'remove' | 'set') {
  const prev = new Set(this._selectedIds);

  switch (mode) {
    case 'toggle':
      if (this._selectedIds.has(rowId)) {
        this._selectedIds.delete(rowId);
      } else {
        this._selectedIds.add(rowId);
      }
      break;
    case 'add':
      this._selectedIds.add(rowId);
      break;
    case 'remove':
      this._selectedIds.delete(rowId);
      break;
    default: // 'set'
      this._selectedIds.clear();
      this._selectedIds.add(rowId);
  }

  // Emit only if changed
  if (!setsEqual(prev, this._selectedIds)) {
    this.emit('selection', this._selectedIds);
  }
}

setSort(columnKey: string, direction: 'asc' | 'desc' | null, multiSort = false) {
  // Update sort state
  if (!multiSort) {
    this._sortState = [];
  }

  const existing = this._sortState.findIndex(s => s.columnKey === columnKey);
  if (direction === null) {
    if (existing >= 0) this._sortState.splice(existing, 1);
  } else {
    if (existing >= 0) {
      this._sortState[existing].direction = direction;
    } else {
      this._sortState.push({ columnKey, direction });
    }
  }

  this.emit('sort', this._sortState);

  // Fetch new data with updated sort
  this.fetchData();
}
```

This pattern ensures:
- All state changes are traceable
- Business logic lives in one place
- Events only fire when state actually changes
- Renderers don't need to know mutation details

## DataSource Integration

StateManager delegates data operations to DataSource:

```typescript
async fetchData(): Promise<void> {
  this._isLoading = true;
  this.emit('loading', true);

  try {
    const response = await this.dataSource.getRows({
      sort: this._sortState.map(s => ({
        field: s.columnKey,
        direction: s.direction
      })),
      filter: this.buildFilterExpression(),
      pagination: {
        offset: 0,
        limit: Number.MAX_SAFE_INTEGER
      }
    });

    this._rows = response.data;
    this._totalRowCount = response.meta.totalCount ?? response.data.length;
    this.emit('data', this._rows);
  } catch (error) {
    this._queryError = error.message;
    this.emit('error', this._queryError);
  } finally {
    this._isLoading = false;
    this.emit('loading', false);
  }
}
```

### Data Flow

```
User clicks sort header
        │
        ▼
StateManager.toggleSort()
        │
        ▼
Update sortState + emit('sort')
        │
        ▼
Call fetchData()
        │
        ▼
DataSource.getRows({ sort: [...] })
        │
        ▼
Update rows + emit('data')
        │
        ▼
BodyRenderer.render() (via subscription)
```

## Computed Properties

StateManager provides computed getters for derived state:

```typescript
get visibleRows(): TData[] {
  const start = Math.max(0, this.startIndex - this.overscan);
  const end = Math.min(this._rows.length, this.endIndex + this.overscan);
  return this._rows.slice(start, end);
}

get pinnedLeftColumns(): ColumnDef<TData>[] {
  return this._columns.filter(c => c.pinned === 'left');
}

get scrollableColumns(): ColumnDef<TData>[] {
  return this._columns.filter(c => !c.pinned);
}

get totalWidth(): number {
  return this._columns.reduce((sum, col) =>
    sum + (this._columnWidths.get(col.key) ?? col.width ?? 150), 0);
}
```

## Why This Approach?

### No framework reactivity

Instead of Svelte stores or React state:
- Zero reactivity overhead in hot paths
- Same code works in any environment
- Explicit control over when updates happen
- Easy to understand and debug

### Event-based notifications

Instead of automatic re-renders:
- Renderers update only when their data changes
- Fine-grained control over what updates
- No unnecessary DOM operations
- Predictable performance

### Methods over direct mutation

Instead of exposing state directly:
```typescript
// Bad: direct state access
stateManager._selectedIds.add(id);

// Good: method with logic
stateManager.selectRow(id, 'add');
```

Methods can:
- Validate inputs
- Apply business rules
- Emit appropriate events
- Batch related changes

## Performance Considerations

### Selective event emission

Events only emit when state actually changes:

```typescript
setScroll(top: number, left: number) {
  const changed = top !== this._scrollTop || left !== this._scrollLeft;
  if (changed) {
    this._scrollTop = top;
    this._scrollLeft = left;
    this.emit('scroll', { top, left });
  }
}
```

### Batched data fetches

Multiple filter/sort changes don't trigger multiple fetches:

```typescript
// Uses requestAnimationFrame to batch
private scheduleFetch() {
  if (this._fetchScheduled) return;
  this._fetchScheduled = true;
  requestAnimationFrame(() => {
    this._fetchScheduled = false;
    this.fetchData();
  });
}
```

### Lazy computation

Expensive computations are cached until invalidated:

```typescript
private _pinnedLeftCache: ColumnDef[] | null = null;

get pinnedLeftColumns(): ColumnDef[] {
  if (!this._pinnedLeftCache) {
    this._pinnedLeftCache = this._columns.filter(c => c.pinned === 'left');
  }
  return this._pinnedLeftCache;
}

// Cache invalidated when columns change
updateColumns(columns: ColumnDef[]) {
  this._columns = columns;
  this._pinnedLeftCache = null;
  this.emit('columns', columns);
}
```

## See also

- [Architecture Overview](./architecture.md) - Overall structure
- [Performance](./performance.md) - Optimization strategies
- [Reference: GridEngine](../reference/grid-engine.md) - API documentation
