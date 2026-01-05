# Performance Benchmarks

This document describes the performance benchmarks for the DataGrid component, including the features being tested, target performance goals, and how to run them.

## Two Benchmark Systems

The project uses **two complementary benchmark systems** for different purposes:

| System | Command | Purpose | Environment |
|--------|---------|---------|-------------|
| **Playwright** | `pnpm bench:playwright` | User interaction latency | Chromium browser |
| **Vitest** | `pnpm bench` | Algorithm performance | Node.js (V8) |

### When to Use Each

**Use Playwright benchmarks for:**
- End-to-end user interaction timing (click, scroll, keyboard)
- Full UI cycle measurement (event → JS → DOM → paint)
- Regression testing user-perceived performance
- CI/CD performance gates

**Use Vitest benchmarks for:**
- Pure JavaScript algorithm optimization
- Comparing implementation approaches
- Profiling specific functions (virtualizer, sort, filter)
- Development-time performance tuning

> **Note:** Vitest benchmarks run in Node.js only. Since both Node.js and Chromium use the V8 JavaScript engine, algorithm performance is equivalent. Browser-specific performance (DOM, rendering) is measured by Playwright benchmarks.

---

## Playwright Benchmarks (User Interactions)

The Playwright benchmark system measures **real user interactions** in a production build - actual clicks, keyboard events, and mouse operations - not just JavaScript execution time. This captures the full user-perceived latency including:

- Browser event dispatch
- JavaScript execution
- DOM updates and re-renders
- Virtual scrolling calculations

## Benchmarked Features

| Feature | Test | Data Size | Target | Description |
|---------|------|-----------|--------|-------------|
| **Sort** | `sort_10k` | 10K rows | 300ms | Click column header to sort |
| **Sort** | `sort_100k` | 100K rows | 3000ms | Click column header to sort (large dataset) |
| **Selection** | `select_single_100k` | 100K rows | 100ms | Click to select single row |
| **Selection** | `select_range_100k` | 100K rows | 200ms | Shift+click for range selection |
| **Navigation** | `arrow_down_100k` | 100K rows | 100ms | Arrow key navigation |
| **Scroll** | `scroll_100k` | 100K rows | 100ms | Mouse wheel scroll |
| **Column Resize** | `column_resize_100k` | 100K rows | 3000ms | Drag to resize column |

## Performance Targets

From `CLAUDE.md`, the core JavaScript performance targets are:

| Operation | JS Target | User Interaction Target |
|-----------|-----------|------------------------|
| UI updates | <16ms | <100ms (includes render) |
| Sort 100K rows | <100ms | <3000ms (includes full UI cycle) |
| Filter 100K rows | <50ms | <300ms (includes full UI cycle) |
| Scroll frame | <5ms | <100ms (includes render) |

**Note:** User interaction targets are higher than JS targets because they include the full cycle: event dispatch → JavaScript → DOM update → paint.

## Current Performance (as of latest run)

| Benchmark | Median | P95 | Target | Status |
|-----------|--------|-----|--------|--------|
| `sort_10k` | ~100ms | ~160ms | 1000ms | Pass |
| `sort_100k` | ~2400ms | ~2500ms | 6000ms | Pass |
| `select_single_100k` | ~38ms | ~50ms | 100ms | Pass |
| `select_range_100k` | ~47ms | ~49ms | 200ms | Pass |
| `arrow_down_100k` | ~22ms | ~25ms | 100ms | Pass |
| `scroll_100k` | ~52ms | ~61ms | 100ms | Pass |
| `column_resize_100k` | ~2200ms | ~2600ms | 3000ms | Pass |

### Known Performance Issues

1. **Sort 100K** - Takes ~2.4 seconds for full UI cycle in CI (Chromium). User-reported times may vary by browser:
   - The JS sort itself is fast (<100ms)
   - `localeCompare` for string sorting adds overhead
   - Re-render and virtual scroll recalculation add significant time
   - Safari/Firefox may have different performance characteristics

2. **Column Resize 100K** - Takes ~2.2 seconds. Resizing triggers recalculation of all column widths and re-renders visible rows.

### Measurement Methodology

Each benchmark measures the **complete user interaction cycle**:
- Sort: Click header → wait for first visible row to show sorted data
- Selection: Click row → wait for `aria-selected` attribute change
- Scroll: Mouse wheel → wait for new rows to render (different `data-row-index`)
- Resize: Drag handle → wait for actual width change in DOM

## Running Benchmarks

### Prerequisites

```bash
# Install Playwright browsers if not already installed
pnpm exec playwright install chromium
```

### Run All Benchmarks

```bash
pnpm bench:playwright
```

This will:
1. Build the app with `BENCH=1` flag (enables instrumentation)
2. Start a preview server
3. Run all Playwright benchmark tests
4. Save results to `bench-results/interactions.json`

### Run Specific Benchmarks

```bash
# Run only sort benchmarks
pnpm exec playwright test --config playwright.bench.config.ts --grep "sort"

# Run only selection benchmarks
pnpm exec playwright test --config playwright.bench.config.ts --grep "select"
```

### View Results

Results are saved to:
- `bench-results/interactions.json` - JSON results with all statistics
- `bench-results/html/` - HTML report (open `index.html`)

## CI Integration

Benchmarks run automatically in CI via GitHub Actions. The workflow:

1. Builds the app with `BENCH=1`
2. Runs all benchmark tests
3. Compares results against baseline targets
4. Fails the build if any benchmark exceeds its target

## Benchmark Configuration

Configuration is in `playwright.bench.config.ts`:

```typescript
{
  workers: 1,           // Single worker for consistent timing
  timeout: 120_000,     // 2 minutes per test
  retries: 0,           // No retries - failures indicate real issues
  trace: 'off',         // Tracing affects performance
}
```

## Adding New Playwright Benchmarks

1. Add test to `bench/interactions.spec.ts`
2. Follow the pattern:
   ```typescript
   test('feature name - data size', async ({ page }) => {
     const ROW_COUNT = 100_000;
     const ITERATIONS = 10;
     const TARGET_MS = 200;
     const samples: number[] = [];

     await setupGrid(page, ROW_COUNT);

     for (let i = 0; i < ITERATIONS; i++) {
       const startTime = Date.now();
       // Perform user action
       // Wait for result
       samples.push(Date.now() - startTime);
     }

     const stats = summarize(samples);
     logStats('feature_name', stats, TARGET_MS);
     expect(stats.median).toBeLessThan(TARGET_MS);
   });
   ```
3. Update this documentation with the new benchmark

## Statistics

Each Playwright benchmark reports:

- **n** - Number of iterations
- **min** - Minimum time
- **median** - 50th percentile (primary metric)
- **p95** - 95th percentile
- **max** - Maximum time
- **target** - Target threshold
- **passed** - Whether median is under target

---

## Vitest Benchmarks (Algorithm Performance)

Vitest benchmarks measure pure JavaScript algorithm performance without browser overhead. These are useful during development to optimize specific functions.

### Running Vitest Benchmarks

```bash
# Run all algorithm benchmarks
pnpm bench

# Run with detailed output
pnpm exec vitest bench --reporter=verbose
```

### Benchmark Suites

| Suite | What it Tests |
|-------|---------------|
| Virtualizer Performance | `createVirtualizer`, `getVirtualItems`, scroll offset calculations |
| Data Generation | Array creation and object allocation at scale |
| Sorting Performance | `Array.sort` with different comparators |
| Filtering Performance | `Array.filter` with string/number predicates |
| Selection Operations | `Set` creation, lookup, and mutation |
| Column Width Calculations | `Map` operations for column management |
| Array Copy Performance | `slice()` vs spread operator at scale |

### Adding New Vitest Benchmarks

1. Add benchmarks to `src/lib/benchmarks/datagrid.bench.ts`
2. Follow the pattern:
   ```typescript
   import { describe, bench } from 'vitest';

   describe('Feature Performance', () => {
     // Setup data outside bench() - not measured
     const testData = generateData(100000);

     bench('operation name', () => {
       // Only code inside bench() is measured
       doSomething(testData);
     });
   });
   ```

### Important Guidelines

**DO use Vitest benchmarks for:**
- Pure JavaScript/TypeScript functions
- Algorithm comparisons (e.g., sort strategies)
- Data structure operations (Array, Set, Map)
- Mathematical calculations

**DO NOT use Vitest benchmarks for:**
- DOM manipulation
- Browser APIs (fetch, localStorage, etc.)
- Component rendering
- User interactions

For browser-specific performance, use Playwright benchmarks instead.
