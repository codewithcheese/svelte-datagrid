# Performance

This document explains the performance architecture of Svelte DataGrid and the optimizations that make it fast.

## Performance Targets

| Operation | Target | Rationale |
|-----------|--------|-----------|
| UI updates | <16ms | 60fps rendering |
| Sort 100K rows | <100ms | Feels instant |
| Filter 100K rows | <50ms | Responsive typing |
| Scroll frame | <5ms | Smooth scrolling |

## Virtualization

The most important optimization is **row virtualization**. Instead of rendering all rows, we only render those visible in the viewport plus a small overscan buffer.

### How It Works

```
┌────────────────────────────────────────┐
│                                        │  ← Rows above viewport (not rendered)
│         (virtual space)                │
│                                        │
├────────────────────────────────────────┤ ← scrollTop
│  ┌──────────────────────────────────┐  │
│  │ Row 50                           │  │  ← overscan (5 rows)
│  │ Row 51                           │  │
│  │ Row 52                           │  │
│  ├──────────────────────────────────┤  │ ← visible viewport start
│  │ Row 53                           │  │
│  │ Row 54                           │  │
│  │ Row 55                           │  │  ← visible rows
│  │ ...                              │  │
│  │ Row 62                           │  │
│  ├──────────────────────────────────┤  │ ← visible viewport end
│  │ Row 63                           │  │
│  │ Row 64                           │  │  ← overscan (5 rows)
│  └──────────────────────────────────┘  │
│                                        │
│         (virtual space)                │  ← Rows below viewport (not rendered)
│                                        │
└────────────────────────────────────────┘
```

### Implementation

```typescript
const visibleRange = $derived.by(() => {
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / rowHeight) + 2 * overscan;
  const endIndex = Math.min(rows.length - 1, startIndex + visibleCount);
  return { startIndex, endIndex };
});

const visibleRows = $derived(
  rows.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
);
```

### Why Fixed Row Heights?

Fixed row heights enable O(1) scroll position calculation:

```typescript
// With fixed heights: O(1)
const rowIndex = Math.floor(scrollTop / rowHeight);

// With variable heights: O(n) or O(log n) with binary search
const rowIndex = findRowAtPosition(scrollTop, rowHeights);
```

Variable row heights require maintaining a height cache and recalculating positions on resize—significant complexity for a performance-critical path.

## Svelte 5 Runes

The grid uses Svelte 5 runes for fine-grained reactivity:

### $state for Mutable State

```typescript
let scrollTop = $state(0);
let selectedIds = $state<Set<string | number>>(new Set());
```

### $derived for Computed Values

```typescript
const visibleColumns = $derived.by(() => {
  return columnOrder
    .filter(key => !hiddenColumns.has(key))
    .map(key => columns.find(c => c.key === key)!)
    .filter(Boolean);
});
```

Derived values only recompute when their dependencies change.

### $effect for Side Effects

```typescript
$effect(() => {
  // Track dependencies
  sortState;
  filterState;
  globalSearchTerm;

  // Trigger data fetch
  fetchData();
});
```

Effects run when dependencies change, not on every render.

## DataSource as Single Source of Truth

All data operations (sort, filter, paginate) are delegated to the DataSource:

```
Grid State         →  DataSource  →  Sorted/Filtered Data
(what to query)       (processes)    (result)
```

Benefits:
- **No duplicate sorting** - DataSource handles it once
- **Server-side capable** - Same code works for local and remote data
- **Consistent behavior** - LocalDataSource and PostgresDataSource produce identical results

## Request Deduplication

The grid tracks request IDs to ignore stale responses:

```typescript
let currentRequestId = '';

async function fetchData() {
  const requestId = `req_${++counter}`;
  currentRequestId = requestId;

  const result = await dataSource.getRows(request);

  // Ignore if a newer request was made
  if (currentRequestId !== requestId) return;

  rows = result.data.rows;
}
```

This prevents race conditions when the user types quickly in a filter.

## Memory Efficiency

### Minimal DOM Nodes

With 100,000 rows and 10 visible:
- **Without virtualization**: 100,000 × columns DOM nodes
- **With virtualization**: ~20 × columns DOM nodes (visible + overscan)

### Efficient Data Structures

- `Set` for selectedIds - O(1) lookup
- `Map` for columnWidths - O(1) access
- Flat arrays for rows - cache-friendly iteration

## CSS Performance

### GPU-Accelerated Transforms

Row positioning uses transforms for GPU acceleration:

```css
.datagrid-row {
  transform: translateY(var(--row-offset));
}
```

### Minimal Repaints

- Fixed column widths avoid layout thrashing
- Absolute positioning for the body prevents reflow
- CSS containment isolates repaint boundaries

## Benchmarking

The project includes benchmarks to catch performance regressions:

```bash
pnpm bench        # Run benchmarks
pnpm bench:ci     # Run with regression detection
```

Benchmarks test:
- Sort performance at various data sizes
- Filter performance with different operators
- Scroll performance under load
- Selection performance with large selections

## Performance Tips

### For Users

1. **Use `getRowId`** - Provide a stable row ID function for efficient selection tracking
2. **Avoid complex formatters** - Keep formatters fast; they run for every visible cell
3. **Use server-side operations** - For 10K+ rows, delegate sort/filter to the backend
4. **Set reasonable overscan** - Default of 5 is good; more wastes memory, less causes flicker

### For Contributors

1. **Profile before optimizing** - Use browser DevTools Performance tab
2. **Test at scale** - Always test with 100K rows
3. **Measure memory** - Watch for leaks with Chrome's Memory tab
4. **Avoid layout thrashing** - Batch DOM reads and writes

---

## See also

- [Explanation: Virtualization](./virtualization.md)
- [Explanation: State Management](./state-management.md)
