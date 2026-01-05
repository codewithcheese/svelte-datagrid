# Performance Benchmarks

This document describes the performance benchmarks for the DataGrid component, including the features being tested, target performance goals, and how to run them.

## Overview

The benchmark system measures **real user interactions** in a production build - actual clicks, keyboard events, and mouse operations - not just JavaScript execution time. This captures the full user-perceived latency including:

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
| `sort_10k` | ~130ms | ~180ms | 300ms | Pass |
| `sort_100k` | ~2400ms | ~2500ms | 3000ms | Pass |
| `select_single_100k` | ~40ms | ~50ms | 100ms | Pass |
| `select_range_100k` | ~50ms | ~65ms | 200ms | Pass |
| `arrow_down_100k` | ~35ms | ~50ms | 100ms | Pass |
| `scroll_100k` | ~60ms | ~80ms | 100ms | Pass |
| `column_resize_100k` | ~2200ms | ~2500ms | 3000ms | Pass |

### Known Performance Issues

1. **Sort 100K** - Takes ~2.4 seconds for full UI cycle. The JS sort is fast (<100ms) but the re-render and virtual scroll recalculation add significant overhead.

2. **Column Resize 100K** - Takes ~2.2 seconds. Resizing triggers recalculation of all column widths and re-renders visible rows.

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

## Adding New Benchmarks

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

Each benchmark reports:

- **n** - Number of iterations
- **min** - Minimum time
- **median** - 50th percentile (primary metric)
- **p95** - 95th percentile
- **max** - Maximum time
- **target** - Target threshold
- **passed** - Whether median is under target
