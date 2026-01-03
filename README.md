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

### Phase 1: Baseline Table UX (Low Complexity)

Core behaviors most grids need early.

- [ ] Render rows/columns with header + body
- [ ] Basic column definitions (field, title, width, align)
- [ ] Basic formatting (string/number/date display, null handling)
- [ ] Empty/loading/error states
- [ ] Row identity (stable keys/IDs), basic row hover/striping
- [ ] Simple pagination (client-side)

### Phase 2: Common Interaction Controls (Low → Medium)

Straightforward, but needs careful state handling.

- [ ] Sorting (single-column, then multi-column)
- [ ] Row selection (single/multi, checkboxes, select all visible)
- [ ] Column show/hide + reorder (drag/drop) + reset to default
- [ ] Column resizing (simple, fixed row heights)
- [ ] Column menus (sort/filter/hide/pin actions)
- [ ] Basic state persistence (save/restore column order/width/sort)

### Phase 3: Filtering, Search, and Navigation (Medium)

UI + data model complexity rises; correctness matters.

- [ ] Per-column filters (text/number/date/boolean, operators)
- [ ] Global quick search (across columns)
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

- [ ] Accessibility: keyboard model, focus management, ARIA grid patterns
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

## Development

```sh
npm install
npm run dev
```

## Testing

```sh
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
```

## Benchmarking

```sh
npm run bench       # Run performance benchmarks
npm run bench:ci    # Run benchmarks with regression detection
```
