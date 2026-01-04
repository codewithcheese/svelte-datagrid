# State Management

This document explains how Svelte DataGrid manages reactive state using Svelte 5 runes.

## The Runes Model

Svelte 5 introduced "runes" - a new reactivity system:

- `$state` - Mutable reactive state
- `$derived` - Computed values that update automatically
- `$effect` - Side effects that run when dependencies change

The grid uses all three to create a responsive, efficient state system.

## State Architecture

```
┌─────────────────────────────────────────────────────────┐
│ GridState                                               │
│                                                         │
│  $state (mutable)           $derived (computed)         │
│  ┌─────────────────┐        ┌─────────────────────┐    │
│  │ data            │───────►│ processedData       │    │
│  │ selectedRows    │        │ (sorted, filtered)  │    │
│  │ currentSort     │        └──────────┬──────────┘    │
│  │ filters         │                   │               │
│  │ globalSearchTerm│                   ▼               │
│  │ scrollTop       │        ┌─────────────────────┐    │
│  │ columnWidths    │        │ visibleRows         │    │
│  │ columnVisibility│        │ (virtualized slice) │    │
│  └─────────────────┘        └─────────────────────┘    │
│                                                         │
│  Methods                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ selectRow(), setSort(), setFilter(), etc.       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Mutable State ($state)

These are the "sources of truth" that can be directly modified:

```typescript
// Primary data
let data = $state<TData[]>([]);
let columns = $state<ColumnDef[]>([]);

// Selection
let selectedRows = $state(new Set<string | number>());
let focusedRowId = $state<string | number | null>(null);

// Sorting
let currentSort = $state<SortSpec[]>([]);

// Filtering
let filters = $state(new Map<string, FilterValue>());
let globalSearchTerm = $state('');

// Scroll position
let scrollTop = $state(0);
let scrollLeft = $state(0);

// Column configuration
let columnWidths = $state(new Map<string, number>());
let columnVisibility = $state(new Map<string, boolean>());
```

State is only mutated through methods, never directly by components.

## Derived State ($derived)

Computed values that automatically update when dependencies change:

```typescript
// Apply filters and sorting to data
const processedData = $derived.by(() => {
  let result = [...data];

  // Apply global search
  if (globalSearchTerm.trim()) {
    result = result.filter(row => matchesSearch(row, globalSearchTerm));
  }

  // Apply column filters
  for (const [field, filter] of filters) {
    result = result.filter(row => matchesFilter(row, field, filter));
  }

  // Apply sorting
  if (currentSort.length > 0) {
    result = sortData(result, currentSort);
  }

  return result;
});

// Visible columns only
const visibleColumns = $derived(
  columns.filter(col => columnVisibility.get(col.key) !== false)
);

// Current visible row range
const visibleRange = $derived({
  startIndex: Math.floor(scrollTop / rowHeight),
  endIndex: Math.ceil((scrollTop + viewportHeight) / rowHeight)
});

// Rows actually rendered
const visibleRows = $derived(
  processedData.slice(
    Math.max(0, visibleRange.startIndex - overscan),
    visibleRange.endIndex + overscan
  )
);
```

### Derived Chain

Derived values can depend on other derived values:

```
data ──────────────────►┐
                        │
globalSearchTerm ──────►├──► processedData ──► visibleRange ──► visibleRows
                        │
filters ───────────────►│
                        │
currentSort ───────────►┘
```

When `currentSort` changes, `processedData` recomputes, which causes `visibleRows` to recompute. Svelte handles this automatically.

## Side Effects ($effect)

Used sparingly for DOM synchronization and external updates:

```typescript
// Track scroll position changes
$effect(() => {
  if (scrollTop !== previousScrollTop) {
    // Emit scroll event, update virtualization
    onScroll?.(scrollTop);
  }
});

// Sync selection changes to callback
$effect(() => {
  const selected = new Set(selectedRows);
  if (selectedChanged(selected, previousSelected)) {
    onSelectionChange?.({ selected, added, removed });
  }
});
```

We minimize `$effect` usage because:
- They can cause infinite loops if not careful
- `$derived` is usually sufficient
- Effects are harder to reason about

## State Mutation Pattern

State is only mutated through methods:

```typescript
function selectRow(rowId: string | number, options?: SelectOptions) {
  if (options?.toggle && selectedRows.has(rowId)) {
    selectedRows.delete(rowId);
  } else {
    if (!options?.extend) {
      selectedRows.clear();
    }
    selectedRows.add(rowId);
  }
  // Svelte automatically detects Set mutations
}

function setSort(sort: SortSpec[]) {
  currentSort = sort;
  // Assignment triggers reactive update
}

function setFilter(column: string, filter: FilterValue) {
  filters.set(column, filter);
  // Map mutation triggers reactive update
}
```

This pattern ensures:
- All state changes are traceable
- Business logic lives in one place
- Components remain simple

## Context Distribution

GridState is shared via Svelte context:

```typescript
// In DataGrid.svelte
const gridState = createGridState({ data, columns, ... });
setContext('datagrid', { gridState, options });

// In any child component
const { gridState } = getContext<DataGridContext>('datagrid');

// Components can read and call methods
<Row
  isSelected={gridState.isRowSelected(rowId)}
  onclick={() => gridState.selectRow(rowId)}
/>
```

## Why This Approach?

### Single source of truth

All state lives in GridState. Components never have local state that duplicates grid state. This prevents sync issues.

### Derived over computed in components

Instead of computing in each component:

```svelte
<!-- Bad: computed in component -->
{#each data.filter(x => x.active) as row}
```

We compute in GridState:

```svelte
<!-- Good: use derived from state -->
{#each gridState.processedData as row}
```

This ensures:
- Computation happens once, not per render
- All components see the same processed data
- Easier to optimize and cache

### Methods over direct mutation

Instead of exposing state directly:

```typescript
// Bad: direct state access
gridState.selectedRows.add(id);
```

We expose methods:

```typescript
// Good: method with logic
gridState.selectRow(id, { extend: true });
```

Methods can:
- Validate inputs
- Apply business rules
- Trigger side effects consistently

## Performance Considerations

### Derived memoization

Svelte automatically memoizes derived values. `processedData` only recomputes when its dependencies (`data`, `filters`, `currentSort`) change.

### Granular reactivity

We structure state to minimize unnecessary updates:

```typescript
// Bad: one big object
let state = $state({ data: [], sort: [], selection: new Set() });

// Good: separate state pieces
let data = $state([]);
let sort = $state([]);
let selection = $state(new Set());
```

Changing `sort` doesn't trigger re-renders in components that only read `selection`.

### Batched updates

Multiple state changes in one function automatically batch:

```typescript
function resetGrid() {
  clearSelection();   // selectedRows update
  clearAllFilters();  // filters update
  clearSort();        // currentSort update
  // Svelte batches these into one update cycle
}
```

## See also

- [Architecture Overview](./architecture.md) - Overall structure
- [Performance](./performance.md) - Optimization strategies
- [Reference: Grid State](../reference/grid-state.md) - API documentation
