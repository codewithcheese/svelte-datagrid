# Svelte DataGrid

A powerful, high-performance data grid component for Svelte 5.

## Project Requirements

### Performance Standards

- **Zero perceived lag**: All operations expected to be instantaneous must complete without human-perceivable delay (<16ms for UI updates, <100ms for complex operations)
- **Benchmark-driven development**: Every feature must include benchmarks with regression testing
- **Virtualization-first**: Architecture must support virtualization from the ground up

### Quality Standards

- **Test-first development**: Each feature must be thoroughly tested before moving to the next
- **Regression prevention**: Benchmark suite must catch performance regressions as features are added
- **Type safety**: Full TypeScript coverage with strict mode

---

## Feature Roadmap

Features are implemented in order of complexity. Each category must pass all tests and benchmarks before proceeding.

### Phase 1: Baseline Table UX (Low Complexity) ✅

Core behaviors most grids need early.

- [x] Render rows/columns with header + body
- [x] Basic column definitions (field, title, width, align)
- [x] Basic formatting (string/number/date display, null handling)
- [x] Empty/loading/error states
- [x] Row identity (stable keys/IDs), basic row hover/striping
- [x] Row virtualization (high-performance windowing)
- [ ] Simple pagination (client-side)

### Phase 2: Common Interaction Controls (Low → Medium)

Straightforward, but needs careful state handling.

- [x] Sorting (single-column, then multi-column)
- [x] Row selection (single/multi, Ctrl+click, Shift+click range, select all)
- [x] Keyboard navigation (arrow keys, Home/End, Page Up/Down)
- [x] Column show/hide toggle
- [ ] Column reorder (drag/drop) + reset to default
- [x] Column resizing (simple, fixed row heights)
- [ ] Column menus (sort/filter/hide/pin actions)
- [ ] Basic state persistence (save/restore column order/width/sort)

### Phase 3: Filtering, Search, and Navigation (Medium)

UI + data model complexity rises; correctness matters.

- [x] Per-column filters (text/number/date/boolean, operators)
- [x] Global quick search (across columns)
- [ ] Find-in-grid (find next/prev, highlight matches)
- [ ] Programmatic navigation (scrollToRow, scrollToColumn, jump-to-id)
- [ ] URL/state sync

### Phase 4: Editing Workflows (Medium → High)

Where "table" becomes a real "grid." Much more edge-case heavy.

- [ ] Cell editing (custom editors, commit/cancel, validation)
- [ ] Row editing (edit entire row, save/cancel)
- [ ] Batch editing (apply multiple changes, review before commit)
- [ ] Async validation (server validation, error mapping to cells)
- [ ] Dirty-state tracking + change sets (diffs, revert row/cell)
- [ ] Conditional editability (per row/cell permissions or rules)
- [ ] Clipboard copy (cell/range → TSV/CSV)
- [ ] Paste (parse, map to columns, partial failures, validation)
- [ ] Undo/redo (edits + paste + structural changes)

### Phase 5: Layout Power Features (High)

Hard mainly because they interact with scrolling, virtualization, and measurement.

- [ ] Pinned/frozen columns (left/right)
- [ ] Pinned rows (top/bottom, totals rows)
- [ ] Multi-row / grouped headers (column grouping)
- [ ] Auto-size columns (fit content / fit viewport; min/max constraints)
- [ ] Variable row heights (wrap text, auto-height measurement)
- [ ] Row detail panels (expandable row content)
- [ ] Cell/row spanning (merged cells)

### Phase 6: Performance & Scale Architecture (High → Very High)

This is where grids become "high performance."

- [ ] Row virtualization (fixed sizes → variable sizes)
- [ ] Column virtualization (for very wide tables)
- [ ] Smooth scrolling under heavy interaction (selection/editing)
- [ ] Infinite loading / lazy loading (load next blocks)
- [ ] Server-side data operations (sort/filter/paginate on server)
- [ ] Request cancellation + debouncing
- [ ] Caching/windowing + cache invalidation
- [ ] Streaming/live updates

### Phase 7: Analytical / Enterprise Data Features (Very High)

Powerful but expensive: complex state models + UI + server integration.

- [ ] Grouping (expand/collapse, nested grouping)
- [ ] Aggregations (group aggregates, total summaries, custom aggregators)
- [ ] Tree data (hierarchical rows; editable + virtualized)
- [ ] Master-detail / nested grids
- [ ] Pivoting + pivot configuration UI
- [ ] Computed columns / formulas

### Phase 8: Export, Reporting, and Interoperability (Medium → Very High)

- [ ] CSV export
- [ ] Print-friendly view
- [ ] PDF export
- [ ] Excel export (basic)
- [ ] Excel export (high fidelity)
- [ ] Import: CSV/Excel with mapping + validation

### Phase 9: Accessibility, i18n, Security (High → Very High)

Must be designed in early for virtualized grids.

- [x] Accessibility: keyboard model, focus management, ARIA grid patterns (basic)
- [ ] Screen reader robustness with virtualization
- [ ] High contrast / reduced motion support
- [ ] Locale-aware sorting & formatting
- [ ] Timezone correctness
- [ ] RTL support
- [ ] Permissions (row/column/cell visibility + edit)
- [ ] XSS-safe rendering
- [ ] Audit hooks

### Phase 10: Extensibility and Platform APIs (High)

What makes a grid "best-in-class."

- [ ] Plugin/module system
- [ ] Event hooks (before/after edit, before export, selection changed)
- [ ] Imperative API (scrollTo, setFilterModel, getSelectedRows, etc.)
- [ ] State serialization + versioning
- [ ] Interop adapters

---

## Quick Start

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 25 },
    { id: 3, name: 'Charlie', age: 35 },
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'name', header: 'Name' },
    { key: 'age', header: 'Age', width: 100 },
  ];
</script>

<DataGrid {data} {columns} height={400} selectable="multiple" />
```

## Features

### Selection

- **Single selection**: Click a row to select it
- **Multiple selection**: Set `selectable="multiple"`
- **Ctrl+click**: Toggle selection without clearing
- **Shift+click**: Select a range of rows
- **Ctrl+A**: Select all rows (when grid has focus)
- **Escape**: Clear selection

### Keyboard Navigation

- **Arrow Up/Down**: Move focus between rows
- **Shift+Arrow**: Extend selection
- **Page Up/Down**: Navigate by page
- **Ctrl+Home**: Jump to first row
- **Ctrl+End**: Jump to last row

### Column Visibility

```typescript
// In your component
gridState.setColumnVisibility('columnKey', false); // Hide column
gridState.setColumnVisibility('columnKey', true);  // Show column
```

### Sorting

Click column headers to sort. Hold Shift to multi-sort.

### Filtering

Enable per-column filters with `filterable`:

```svelte
<DataGrid {data} {columns} filterable />
```

Supported filter types (set via `column.filterType`):
- **text**: Contains filter (default)
- **number**: Numeric comparison
- **date**: Date picker
- **boolean**: Yes/No/All dropdown
- **select**: Dropdown selection

### Global Search

Enable a search bar that searches across all columns:

```svelte
<DataGrid {data} {columns} searchable />
```

- Debounced input (300ms) for performance
- Press Enter for immediate search
- Press Escape to clear
- Shows result count when active

### Query Module (Data Sources)

The grid includes a backend-agnostic query module for server-side data:

```typescript
import { createLocalDataSource, createPostgresDataSource } from 'svelte-datagrid/query';

// In-memory data source
const localDs = createLocalDataSource(myData, 'id');

// PostgreSQL data source (works with pg, PgLite, Neon, etc.)
const pgDs = createPostgresDataSource({
  connection: pool, // Any client with query(sql, params) method
  table: 'users'
});
```

## Development

```sh
pnpm install
pnpm dev
```

## Testing

```sh
pnpm test        # Run unit tests
pnpm test:e2e    # Run end-to-end tests
```

## Benchmarking

```sh
pnpm bench       # Run performance benchmarks
pnpm bench:ci    # Run benchmarks with regression detection
```
