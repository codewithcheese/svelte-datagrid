# Claude Code Instructions

## Before Committing

**CRITICAL**: Before committing any changes, you MUST:

1. **Run all tests**: `pnpm test` - All tests must pass
2. **Run type checking**: `pnpm check` - No TypeScript errors
3. **Update documentation** following the Diátaxis framework (see below)

> **Important**: Always run tests locally before committing. If Playwright is not installed, run `pnpm exec playwright install chromium` first.

## Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run all tests |
| `pnpm check` | TypeScript type checking + doc link validation |
| `pnpm check:links` | Check documentation links only (requires lychee) |
| `pnpm dev` | Development server |

> **Note**: Link checking requires [lychee](https://github.com/lycheeverse/lychee) to be installed.
> Install via: `brew install lychee` (macOS) or `cargo install lychee` (Rust)

## Architecture Patterns

### Svelte 5 Runes
- Use `$state` for mutable state
- Use `$derived` for computed values
- Use `$effect` for side effects (track previous values to avoid infinite loops)

### Testing Architecture

The project uses a **layered testing strategy** for cross-browser DOM accuracy:

| Layer | Tool | Browsers | Purpose |
|-------|------|----------|---------|
| Unit tests | Vitest (Node) | None | Data sources, virtualizer, utilities |
| Browser component tests | Vitest + Playwright | Chromium | Svelte component DOM behavior |
| E2E tests | Playwright | **Chromium, Firefox, WebKit** | Full integration, cross-browser |
| Visual regression | Playwright | Chromium, Firefox, WebKit | Screenshot comparison |
| Benchmarks | Playwright | Chromium | Performance measurement |

**File patterns:**
- `*.test.ts` - Unit tests (Node environment)
- `*.svelte.test.ts` - Browser component tests (Playwright/Chromium)
- `e2e/*.spec.ts` - E2E tests (all browsers)
- `e2e/visual.spec.ts` - Visual regression tests
- `bench/*.spec.ts` - Performance benchmarks

**Key principle**: E2E and visual tests run against **production build** (preview mode), not dev server.

### Test Commands

```bash
# Core testing (run before every commit)
pnpm test              # Unit + browser component tests
pnpm check             # Type checking

# E2E testing (cross-browser)
pnpm e2e               # All browsers (chromium, firefox, webkit)
pnpm e2e --project=chromium  # Single browser

# Visual regression
pnpm e2e:visual        # Run visual tests
pnpm e2e:visual:update # Update baseline screenshots

# Benchmarks
pnpm bench:playwright  # Performance benchmarks
```

### Cross-Browser Testing in CI

CI runs E2E tests across **Chromium, Firefox, and WebKit** in parallel. On failure, artifacts (screenshots, traces, videos) are uploaded for debugging.

When adding new E2E tests:
1. Use `data-testid` attributes for stable selectors
2. Avoid timing-dependent assertions
3. Test across browsers locally if behavior might differ

### Data Sources
- Grid uses `DataSource` interface for data fetching
- `LocalDataSource` - in-memory, no backend needed
- `PostgresDataSource` - works with any Postgres client (pg, PgLite, Neon, etc.)
- See `src/lib/query/` for the query module

### Grid State
- Selection: `selectRow()`, `selectRange()`, `selectAll()`, `clearSelection()`
- Navigation: `navigateRow()`, `navigateToFirst()`, `navigateToLast()`, `navigateByPage()`
- Column visibility: `setColumnVisibility()`
- See `src/lib/state/grid-state.svelte.ts` for full API

## Documentation (Diátaxis Framework)

Documentation uses the **Diátaxis** framework. When updating docs:

| Change Type | Update These Docs |
|-------------|-------------------|
| New prop/method | `docs/reference/` (required) |
| New user feature | `docs/how-to/` (create guide) |
| API behavior change | `docs/reference/` + affected tutorials |
| Architecture change | `docs/explanation/` |

### Documentation Structure

```
docs/
├── tutorials/     # Learning-oriented lessons (beginner → advanced)
├── how-to/        # Task-oriented guides ("how do I...")
├── reference/     # Technical specifications (props, methods, types)
└── explanation/   # Conceptual discussions ("why does it...")
```

### Documentation Workflow

1. **Reference first**: Always update `docs/reference/` when adding/changing API
2. **How-to if applicable**: Create task guide in `docs/how-to/`
3. **Update tutorials**: If beginner experience changes
4. **Update indexes**: Add new pages to `index.md` files

See `docs/DOCS_MAINTENANCE.md` for complete methodology.

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Feature roadmap with complexity ranking |
| `CONTRIBUTING.md` | Development workflow and documentation guide |
| `DEBUGGING.md` | Debugging strategies for common issues |
| `docs/DOCS_MAINTENANCE.md` | Documentation methodology and standards |
| `docs/` | Feature documentation (Diátaxis structure) |

## Performance Targets

| Operation | Target |
|-----------|--------|
| UI updates | <16ms |
| Sort 100K rows | <100ms |
| Filter 100K rows | <50ms |
| Scroll frame | <5ms |

## Tool Learning Log

**Instruction**: Write a log recording concrete information about tools (not implementation details) as discoveries are made.

### Playwright Benchmarks (`bench/interactions.spec.ts`)
- Run specific benchmark: `pnpm exec playwright test --config playwright.bench.config.ts bench/interactions.spec.ts -g "test name"`
- Run all benchmarks: `pnpm exec playwright test --config playwright.bench.config.ts bench/interactions.spec.ts`
- Uses `preview` mode (production build) - must run `pnpm build` first if testing changes
- `page.waitForFunction()` runs in browser context - parameters must be serializable
- `page.locator().first()` returns first in DOM order, not visual order - use specific selectors when order matters
- `page.evaluate()` results are synchronous within each call but async between calls

### DOM Pooling Quirks
- Row elements in DOM are reused from pool, so DOM order ≠ visual order
- When querying rows, sort by `data-row-index` to get visual order
- `data-row-id` contains the actual data ID, `data-row-index` is the visual position
- Released rows have `display: none` but stay in DOM

### Event Timing in Headless
- `requestAnimationFrame` may not fire reliably in headless Chrome
- Use `setTimeout(0)` as fallback alongside rAF for render scheduling
- Always await `page.evaluate(() => new Promise(r => requestAnimationFrame(r)))` before checking DOM updates
