# Architecture Overview

This document explains how Svelte DataGrid is structured and the design decisions behind it.

## Design Goals

The grid was designed with these priorities:

1. **Performance first**: Handle 100K+ rows smoothly
2. **Framework agnostic core**: Pure TypeScript engine, thin Svelte wrapper
3. **Backend agnostic**: Work with any data source
4. **Accessible**: Follow ARIA grid pattern
5. **Composable**: Customizable without forking

## High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│ DataGrid (Svelte Component - thin wrapper)              │
│  └── GridEngine (TypeScript)                            │
│       ├── StateManager (state + data fetching)          │
│       ├── HeaderRenderer (column headers, sort, resize) │
│       ├── BodyRenderer (virtualized rows via DOM pools) │
│       │    ├── RowPool (recycled row elements)          │
│       │    └── CellPool (recycled cell elements)        │
│       ├── EventManager (keyboard, mouse, touch events)  │
│       └── EditorManager (cell editing lifecycle)        │
└─────────────────────────────────────────────────────────┘
```

## Component Breakdown

### DataGrid (Svelte Component)

A thin wrapper around GridEngine. It:
- Creates the container element
- Initializes GridEngine on mount
- Syncs props to engine options
- Provides Svelte-style events and snippets
- Cleans up on destroy

```svelte
<DataGrid {data} {columns} selectable filterable />
```

### GridEngine (TypeScript Class)

The core orchestrator. It:
- Creates and coordinates all subsystems
- Exposes the public API (select, sort, scroll, etc.)
- Manages lifecycle (init, update, destroy)

```typescript
const engine = createGridEngine(container, {
  data,
  columns,
  sortable: true,
  onSortChange: (sort) => console.log(sort)
});
```

### StateManager

The centralized state manager. Uses plain TypeScript with event-based notifications:

```typescript
// State is stored in typed properties
private _rows: TData[] = [];
private _selectedIds = new Set<string | number>();
private _sortState: SortState[] = [];

// Changes trigger events
emit('selection', selectedIds);
emit('sort', sortState);
emit('data', rows);
```

When you provide a `data` array, StateManager creates a `LocalDataSource` internally. When you provide a `dataSource`, it uses that directly. All sorting, filtering, and pagination are delegated to the DataSource.

### HeaderRenderer

Renders the header row with:
- Column headers with sort indicators
- Resize handles (drag to resize)
- Click handlers for sort toggle
- Pinned column support

### BodyRenderer

The virtualized row container using DOM pooling:
- Maintains a pool of reusable row elements (RowPool)
- Rows contain pools of reusable cell elements (CellPool)
- Only renders rows visible in the viewport + overscan
- Recycles DOM elements on scroll instead of creating/destroying

### EventManager

Handles all user interaction via event delegation:
- Single event listener on container (not per-row/cell)
- Keyboard navigation (arrows, Page Up/Down, Home/End)
- Selection (click, Shift+click, Ctrl+click)
- Edit triggering (double-click, F2, Enter)

### EditorManager

Manages cell editing lifecycle:
- Editor pooling (reuses input elements)
- Position tracking relative to cells
- Validation and commit/cancel flow
- Tab navigation between editable cells

## Data Flow

```
User Action → EventManager → StateManager → Event Emission → Renderers Update DOM
     │                            │                               │
     │                            ▼                               │
     │                    DataSource Query                        │
     │                       (if needed)                          │
     │                            │                               │
     │                            ▼                               │
     │                     State Update                           │
     │                            │                               │
     └───────────────────────────────────────────────────────────►│
                                                          DOM Reconciliation
```

### Example: Sorting

1. User clicks column header
2. HeaderRenderer click handler → StateManager.toggleSort()
3. StateManager updates sortState and queries DataSource
4. DataSource returns sorted data
5. StateManager emits 'data' event
6. BodyRenderer receives event and updates visible rows
7. Only affected DOM elements are updated (via pool reconciliation)

### Example: Selection

1. User clicks row
2. EventManager delegates to StateManager.selectRow()
3. StateManager updates selectedIds and emits 'selection' event
4. BodyRenderer updates row's 'selected' CSS class
5. No full re-render; only class toggle on affected elements

## State Management Pattern

We use event-based state notifications:

```typescript
// StateManager holds all state
class StateManager<TData> {
  private listeners = new Map<string, Set<Function>>();

  // Subscribe to state changes
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // Emit state changes
  private emit(event: string, data?: unknown) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Renderers subscribe to relevant events
stateManager.on('data', () => this.render());
stateManager.on('selection', () => this.updateSelectionClasses());
stateManager.on('scroll', () => this.updateVisibleRows());
```

## Virtualization Strategy

We use **DOM pooling with fixed-height rows**:

1. Pre-allocate pool of row/cell elements
2. Calculate visible row indices from scroll position
3. Assign visible data to pooled elements
4. Update element positions via CSS transform
5. Recycle elements when rows scroll out of view

```
Total rows: 10,000
Visible: 20 rows
Pool size: 30 elements (20 + overscan)
DOM operations: Updates only, no create/destroy
```

See [Virtualization](./virtualization.md) for details.

## Data Source Abstraction

The grid uses DataSource as its data layer:

```
┌─────────────┐     GridQueryRequest      ┌──────────────────┐
│ StateManager│ ─────────────────────────►│    DataSource    │
│             │                           │                  │
│ - Sort UI   │ ◄─────────────────────────│ LocalDataSource  │
│ - Filter UI │     GridQueryResponse     │ PostgresDataSource│
│ - Selection │                           │ (or custom)      │
└─────────────┘                           └──────────────────┘
```

**Key design**: When you provide a `data` array, StateManager automatically creates a `LocalDataSource`. When you provide a `dataSource`, it uses that directly. This means:

- **Client-side data**: Just pass `data` prop - sorting/filtering happens in-memory
- **Server-side data**: Pass `dataSource` prop - operations happen on the server
- **Consistent API**: Same grid component, same behavior, different backends
- **Auto-save edits**: If DataSource implements `MutableDataSource`, edits persist automatically

See [Query Module](../query.md) for DataSource API details.

## Why These Choices?

### Why pure TypeScript engine?

- Maximum performance (no framework overhead in hot paths)
- Framework agnostic (can wrap in React, Vue, vanilla JS)
- Direct DOM control for precise updates
- Easier to optimize and profile

### Why DOM pooling?

- Fixed pool size regardless of data size
- Zero allocation during scroll
- Predictable memory usage
- O(1) scroll performance

### Why fixed-height rows?

- O(1) scroll position → row index mapping
- Predictable layout calculations
- No layout thrashing during scroll
- Simpler virtualization logic

### Why event-based state?

- Decouples state from rendering
- Renderers only update when their data changes
- No framework-specific reactivity
- Explicit control over update timing

### Why DataSource abstraction?

- Grids often need server-side data
- Backend requirements vary widely
- Clean separation of concerns
- Easy to test with mock sources

## File Organization

```
src/lib/
├── components/datagrid/
│   ├── DataGrid.svelte        # Main Svelte wrapper
│   └── __tests__/             # Component tests
├── engine/
│   ├── GridEngine.ts          # Main orchestrator
│   ├── state/
│   │   └── StateManager.ts    # Centralized state
│   ├── render/
│   │   ├── BodyRenderer.ts    # Virtualized body
│   │   ├── HeaderRenderer.ts  # Column headers
│   │   ├── RowPool.ts         # Row element pool
│   │   └── CellPool.ts        # Cell element pool
│   ├── events/
│   │   ├── EventManager.ts    # Event delegation
│   │   └── EditorManager.ts   # Cell editing
│   └── __tests__/             # Engine tests
├── query/
│   ├── types.ts               # DataSource types
│   ├── local-data-source.ts   # In-memory source
│   └── postgres-data-source.ts # PostgreSQL source
└── core/
    └── virtualizer.ts         # Virtualization logic
```

## See also

- [State Management](./state-management.md) - Deep dive into StateManager
- [Virtualization](./virtualization.md) - Row virtualization details
- [Performance](./performance.md) - Optimization strategies
- [Query Module](../query.md) - DataSource API and data layer design
