---
title: Performance
---

# Performance

This document explains the performance characteristics and optimization strategies of Svelte DataGrid.

## Performance Targets

| Operation | Target |
|-----------|--------|
| UI updates | &lt;16ms (60fps) |
| Sort 100K rows | &lt;100ms |
| Filter 100K rows | &lt;50ms |
| Scroll frame | &lt;5ms |

## Key Optimizations

### 1. Row Virtualization

Only visible rows are rendered. See [Virtualization](/docs/explanation/virtualization).

```
10,000 rows → ~25 DOM nodes
100,000 rows → ~25 DOM nodes
```

DOM complexity stays constant regardless of data size.

### 2. Derived Memoization

Svelte 5's `$derived` automatically memoizes computed values:

```typescript
const sortedData = $derived(
  sortData(data, currentSort)
);
```

- Only recomputes when `data` or `currentSort` changes
- Cached between renders
- No manual memoization needed

### 3. Granular Reactivity

State is split into independent pieces:

```typescript
let selectedRows = $state(new Set());
let currentSort = $state([]);
let filters = $state(new Map());
```

Changing selection doesn't trigger sort recomputation.

### 4. Batched Updates

Multiple state changes are batched:

```typescript
function resetFilters() {
  filters.clear();
  globalSearchTerm = '';
  // Svelte batches into single update
}
```

### 5. Efficient Array Operations

We use efficient algorithms:

```typescript
// O(n log n) sort with stable comparison
const sorted = [...data].sort(compareFn);

// O(n) filter with early termination
const filtered = data.filter(predicateFn);
```

## Measuring Performance

### Browser DevTools

```javascript
// Measure sort time
console.time('sort');
gridState.setSort([{ field: 'name', direction: 'asc' }]);
await gridState.waitForData();
console.timeEnd('sort');
```

### Performance API

```javascript
const start = performance.now();
// operation
const end = performance.now();
console.log(`Operation took ${end - start}ms`);
```

## Best Practices

### 1. Provide getRowId

Always provide `getRowId` for stable row identification:

```svelte
<DataGrid
  {data}
  {columns}
  getRowId={(row) => row.id}
/>
```

Without it, selection breaks when data is sorted/filtered.

### 2. Avoid Heavy Render Functions

Keep cell render functions simple:

```typescript
// Good: simple formatting
render: (value) => `$${value.toFixed(2)}`

// Bad: complex computation
render: (value, row) => expensiveCalculation(row)
```

### 3. Use Appropriate DataSource

- **Under 10K rows**: LocalDataSource is fine
- **10K-100K rows**: Consider server-side pagination
- **Over 100K rows**: Use server-side operations

```svelte
<!-- For large datasets -->
<DataGrid
  dataSource={serverDataSource}
  {columns}
/>
```

### 4. Limit Visible Columns

More columns = more cells to render:

```typescript
const columns = [
  // Show only essential columns
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  // Hide less important columns initially
  { key: 'details', header: 'Details', visible: false }
];
```

### 5. Debounce User Input

Filters and search are debounced by default (300ms). For custom inputs:

```typescript
import { debounce } from '$lib/utils';

const debouncedFilter = debounce((value) => {
  gridState.setFilter('name', value);
}, 300);
```

## Common Performance Issues

### Slow Initial Render

**Cause**: Too many columns or complex cell renderers.

**Fix**:
- Reduce visible columns
- Simplify render functions
- Use virtualization (enabled by default)

### Janky Scrolling

**Cause**: Too few overscan rows or expensive cell renders.

**Fix**:
- Increase `overscan` prop (default: 5)
- Simplify cell content
- Use CSS instead of inline styles

### Slow Sorting

**Cause**: Large dataset with client-side sort.

**Fix**:
- Use server-side sorting
- Implement pagination
- Consider indexing data

### Memory Usage

**Cause**: Storing full dataset in memory.

**Fix**:
- Use pagination with server-side data
- Implement lazy loading
- Consider windowing for very large datasets

## Benchmarks

Tested on MacBook Pro M1, Chrome 120:

| Operation | 1K rows | 10K rows | 100K rows |
|-----------|---------|----------|-----------|
| Initial render | 8ms | 12ms | 15ms |
| Sort (client) | 2ms | 18ms | 85ms |
| Filter (client) | 1ms | 8ms | 42ms |
| Scroll frame | 2ms | 2ms | 2ms |
| Select all | 3ms | 25ms | 240ms |

Key insight: scroll performance is constant because of virtualization.

## Profiling Tips

### React DevTools (Svelte 5)

Use browser profiler to identify slow components:

1. Open DevTools → Performance tab
2. Start recording
3. Perform action (sort, filter, scroll)
4. Stop recording
5. Look for long tasks

### Identify Re-renders

Add logging to track renders:

```svelte
<script>
  $effect(() => {
    console.log('Component re-rendered');
  });
</script>
```

## See also

- [Virtualization](/docs/explanation/virtualization) - Row virtualization details
- [State Management](/docs/explanation/state-management) - Reactive state optimization
- [Reference: DataGrid](/docs/reference/datagrid) - Performance-related props
