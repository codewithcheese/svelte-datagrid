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

The reactive state manager. Uses Svelte 5 runes:

```typescript
// State (mutable)
let data = $state<TData[]>([]);
let selectedRows = $state(new Set<string | number>());
let currentSort = $state<SortSpec[]>([]);

// Derived (computed)
const processedData = $derived(applySort(applyFilter(data)));
const visibleRows = $derived(processedData.slice(start, end));
```

GridState is created once per grid instance and passed via Svelte context.

### Header Components

**Header.svelte**: Container that manages header layout and column positioning.

**HeaderRow**: Renders column headers with sort indicators. Handles click-to-sort.

**FilterRow**: Renders per-column filter inputs when `filterable=true`.

**SearchBar**: Global search input when `searchable=true`.

### Body.svelte

The virtualized row container. It:
- Listens to scroll events
- Calculates visible row range
- Renders only visible rows
- Applies vertical offset transform

### Row.svelte

A single data row. Handles:
- Row selection state (selected class)
- Row click events
- Renders cells for each column

### Cell.svelte

A single cell. Handles:
- Value extraction from row
- Custom render functions
- Cell click events
- Alignment and styling

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
4. `processedData` derived recomputes (applies sort)
5. `visibleRows` derived recomputes
6. Svelte re-renders affected rows

### Example: Selection

1. User clicks row
2. Row calls `gridState.selectRow(rowId)`
3. `selectedRows` state updates
4. `isRowSelected(id)` returns new value
5. Row component gets new `isSelected` prop
6. Svelte updates row's CSS class

## State Management Pattern

We use a "single source of truth" pattern:

```typescript
// All state lives in GridState
const gridState = createGridState({ data, columns, ... });

// Components read from state
const { visibleRows, selectedRows } = gridState;

// Components mutate via methods
gridState.selectRow(id);
gridState.setSort(sort);
```

This avoids prop drilling and keeps state changes predictable.

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

See [Virtualization](./virtualization.md) for details.

## Data Source Abstraction

The grid doesn't fetch data directly. Instead:

```
DataGrid ──query──► DataSource ──fetch──► Backend
         ◄──rows──             ◄──data──
```

This allows:
- Client-side data (LocalDataSource)
- Server-side data (PostgresDataSource, REST, GraphQL)
- Consistent API regardless of backend
- Server-side sort/filter/pagination

See [Data Source Architecture](./data-source-architecture.md) for details.

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

- [State Management](./state-management.md) - Deep dive into reactivity
- [Virtualization](./virtualization.md) - Row virtualization details
- [Data Source Architecture](./data-source-architecture.md) - Data layer design
