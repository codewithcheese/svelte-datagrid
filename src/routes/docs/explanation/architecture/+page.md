---
title: Architecture Overview
---

# Architecture Overview

This document explains how Svelte DataGrid is structured and the design decisions behind it.

## Design Goals

The grid was designed with these priorities:

1. **Performance first**: Handle 100K+ rows smoothly
2. **Svelte 5 native**: Use runes, not legacy stores
3. **Backend agnostic**: Work with any data source
4. **Accessible**: Follow ARIA grid pattern
5. **Composable**: Customizable without forking

## High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│ DataGrid (Main Component)                               │
│  ├── SearchBar (optional)                               │
│  ├── Header                                             │
│  │    ├── HeaderRow (column headers, sort indicators)  │
│  │    └── FilterRow (optional, per-column filters)     │
│  └── Body (virtualized rows)                            │
│       └── Row × visibleCount                            │
│            └── Cell × columns                           │
└─────────────────────────────────────────────────────────┘
```

## Component Breakdown

### DataGrid.svelte

The main orchestrator. It:
- Accepts props (data, columns, options)
- Creates and provides GridState via context
- Computes layout dimensions
- Renders child components

```svelte
<DataGrid {data} {columns} selectable filterable />
```

### GridState (grid-state.svelte.ts)

The reactive state manager. Uses Svelte 5 runes and delegates data operations to a DataSource:

```typescript
// DataSource is the single source of truth for data
// Grid-state only manages presentation concerns

// Query state (what to ask DataSource)
let sortState = $state<SortState[]>([]);
let filterState = $state<FilterState[]>([]);
let globalSearchTerm = $state<string>('');

// Selection state
let selectedIds = $state<Set<string | number>>(new Set());

// Data from DataSource queries
let rows = $state<TData[]>([]);
let isLoading = $state<boolean>(false);

// Derived (computed from DataSource results)
const visibleRows = $derived(rows.slice(startIndex, endIndex));
```

When you provide a `data` array, GridState creates a `LocalDataSource` internally. When you provide a `dataSource`, it uses that directly. All sorting, filtering, and pagination are delegated to the DataSource.

## Data Flow

```
User Action → Event Handler → GridState Update → Derived Recompute → DOM Update
     │                              │                    │
     │                              ▼                    │
     │                        $state mutation            │
     │                              │                    │
     │                              ▼                    │
     │                        $derived recalc           │
     │                              │                    │
     │                              ▼                    │
     └──────────────────────────────────────────────────┘
                            Svelte renders
```

### Example: Sorting

1. User clicks column header
2. HeaderRow calls `gridState.setSort([{ field, direction }])`
3. `currentSort` state updates
4. DataSource is queried with new sort
5. `rows` updates with sorted data
6. Svelte re-renders affected rows

### Example: Selection

1. User clicks row
2. Row calls `gridState.selectRow(rowId)`
3. `selectedRows` state updates
4. `isRowSelected(id)` returns new value
5. Row component gets new `isSelected` prop
6. Svelte updates row's CSS class

## DataSource Abstraction

The grid uses DataSource as its data layer:

```
┌─────────────┐     GridQueryRequest      ┌──────────────────┐
│  GridState  │ ─────────────────────────►│    DataSource    │
│             │                           │                  │
│ - Sort UI   │ ◄─────────────────────────│ LocalDataSource  │
│ - Filter UI │     GridQueryResponse     │ PostgresDataSource│
│ - Selection │                           │ (or custom)      │
└─────────────┘                           └──────────────────┘
```

**Key design**: When you provide a `data` array, GridState automatically creates a `LocalDataSource`. When you provide a `dataSource`, it uses that directly. This means:

- **Client-side data**: Just pass `data` prop - sorting/filtering happens in-memory
- **Server-side data**: Pass `dataSource` prop - operations happen on the server
- **Consistent API**: Same grid component, same behavior, different backends
- **Auto-save edits**: If DataSource implements `MutableDataSource`, edits persist automatically

## Virtualization Strategy

We use **fixed-height row virtualization**:

1. Calculate visible row indices from scroll position
2. Render only those rows plus overscan buffer
3. Use CSS transform to position rows correctly
4. Maintain stable row keys for efficient updates

```
Total rows: 10,000
Visible: 20 rows
Rendered: 30 rows (20 + 10 overscan)
DOM nodes: ~30 rows × columns
```

See [Virtualization](/docs/explanation/virtualization) for details.

## Context Usage

We use Svelte context to pass shared state:

```typescript
// DataGrid.svelte
setContext('datagrid', {
  gridState,
  options: { selectable, filterable, ... }
});

// Any child component
const { gridState, options } = getContext('datagrid');
```

This avoids deep prop drilling while keeping components decoupled.

## Why These Choices?

### Why Svelte 5 runes over stores?

- Runes are the future of Svelte
- `$derived` is more intuitive than derived stores
- Better TypeScript integration
- Simpler mental model

### Why fixed-height rows?

- Predictable layout calculations
- O(1) scroll position → row index mapping
- No layout thrashing during scroll
- Variable heights are possible but complex (future)

### Why context over global state?

- Multiple grids on one page work independently
- No global singleton issues
- Clear ownership of state
- Follows Svelte patterns

### Why DataSource abstraction?

- Grids often need server-side data
- Backend requirements vary widely
- Clean separation of concerns
- Easy to test with mock sources

## File Organization

```
src/lib/
├── components/datagrid/
│   ├── DataGrid.svelte       # Main component
│   ├── core/
│   │   ├── Header.svelte     # Header container
│   │   ├── HeaderRow.svelte  # Column headers
│   │   ├── FilterRow.svelte  # Filter inputs
│   │   ├── SearchBar.svelte  # Global search
│   │   ├── Body.svelte       # Virtualized body
│   │   ├── Row.svelte        # Data row
│   │   └── Cell.svelte       # Data cell
│   └── __tests__/            # Component tests
├── state/
│   ├── grid-state.svelte.ts  # State manager
│   └── __tests__/            # State tests
├── query/
│   ├── types.ts              # DataSource types
│   ├── local-data-source.ts  # In-memory source
│   └── postgres-data-source.ts # PostgreSQL source
└── core/
    └── virtualizer.ts        # Virtualization logic
```

## See also

- [State Management](/docs/explanation/state-management) - Deep dive into reactivity
- [Virtualization](/docs/explanation/virtualization) - Row virtualization details
- [Data Source Architecture](/docs/explanation/data-source-architecture) - DataSource API design
