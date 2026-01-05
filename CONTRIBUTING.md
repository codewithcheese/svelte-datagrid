# Contributing to Svelte DataGrid

## Development Setup

```bash
pnpm install
pnpm dev
```

### Optional: Link Checker

To validate documentation links, install [lychee](https://github.com/lycheeverse/lychee):

```bash
# macOS
brew install lychee

# Rust/Cargo
cargo install lychee

# Then run
pnpm check:links
```

## Testing

### Test Architecture

The project uses a **layered testing strategy** for cross-browser DOM accuracy:

```
┌─────────────────────────────────────────────────────────────────┐
│  Unit Tests (Vitest/Node)                                       │
│  Fast, no browser needed - data sources, virtualizer, utilities │
├─────────────────────────────────────────────────────────────────┤
│  Browser Component Tests (Vitest + Playwright/Chromium)         │
│  Svelte component DOM behavior with real browser                │
├─────────────────────────────────────────────────────────────────┤
│  E2E Tests (Playwright - Chromium, Firefox, WebKit)             │
│  Full integration testing across all major browsers             │
├─────────────────────────────────────────────────────────────────┤
│  Visual Regression (Playwright - all browsers)                  │
│  Screenshot comparison to catch visual changes                  │
├─────────────────────────────────────────────────────────────────┤
│  Benchmarks (Playwright/Chromium)                               │
│  Performance measurement against targets                        │
└─────────────────────────────────────────────────────────────────┘
```

### Running Tests

```bash
# Core testing (required before every commit)
pnpm test              # Unit + browser component tests (Chromium)
pnpm check             # TypeScript type checking

# E2E testing (cross-browser)
pnpm e2e               # Run on all browsers (chromium, firefox, webkit)
pnpm e2e --project=chromium   # Run on single browser
pnpm e2e:ui            # Interactive UI mode

# Visual regression testing
pnpm e2e:visual        # Run visual tests against baselines
pnpm e2e:visual:update # Update baseline screenshots

# Performance benchmarks
pnpm bench:playwright  # Run interaction benchmarks
```

### Test File Locations

| Pattern | Type | Environment |
|---------|------|-------------|
| `src/**/*.test.ts` | Unit tests | Node.js |
| `src/**/*.svelte.test.ts` | Component tests | Chromium |
| `e2e/*.spec.ts` | E2E tests | All browsers |
| `e2e/visual.spec.ts` | Visual regression | All browsers |
| `bench/*.spec.ts` | Benchmarks | Chromium |

### Cross-Browser Testing

E2E tests run against **production builds** (not dev server) across:
- **Chromium** (Chrome/Edge)
- **Firefox** (Gecko)
- **WebKit** (Safari)

CI runs all three browsers in parallel. On failure, artifacts are uploaded:
- Screenshots (on failure)
- Video recordings (on retry)
- Trace files (on retry)

### Writing Cross-Browser Safe Tests

```typescript
// ✅ Good: Use data-testid for stable selectors
const row = page.getByTestId('datagrid-row').first();

// ✅ Good: Wait for state, not arbitrary timeouts
await expect(row).toHaveAttribute('aria-selected', 'true');

// ❌ Bad: Arbitrary timeouts
await page.waitForTimeout(500);

// ❌ Bad: Browser-specific selectors
const row = page.locator('.webkit-specific-class');
```

### Visual Regression Testing

Baseline screenshots are stored in `e2e/__screenshots__/{browser}/` and committed to the repository.

To update baselines after intentional UI changes:
```bash
pnpm e2e:visual:update
git add e2e/__screenshots__/
git commit -m "Update visual regression baselines"
```

## Type Checking

```bash
# Check Svelte component types
pnpm check

# Check test file types
pnpm exec tsc -p tsconfig.test.json --noEmit
```

---

## Documentation System

Documentation follows the **Diátaxis** framework, organized into four types:

| Type | Purpose | Location |
|------|---------|----------|
| **Tutorials** | Learning-oriented lessons | `docs/tutorials/` |
| **How-to Guides** | Task-oriented recipes | `docs/how-to/` |
| **Reference** | Technical specifications | `docs/reference/` |
| **Explanation** | Conceptual discussions | `docs/explanation/` |

For detailed guidelines, see [Documentation Maintenance](docs/DOCS_MAINTENANCE.md).

### Quick Reference

```
                    PRACTICAL                      THEORETICAL
               ┌─────────────────────────────────────────────────┐
   LEARNING    │   TUTORIALS          │     EXPLANATION          │
               │   "Teach me"         │     "Why does it..."     │
               ├──────────────────────┼──────────────────────────┤
   WORKING     │   HOW-TO             │     REFERENCE            │
               │   "How do I..."      │     "What is the API..." │
               └─────────────────────────────────────────────────┘
```

### Documentation Workflow

When implementing a feature:

1. **Reference first**: Add props/methods to `docs/reference/`
2. **How-to if applicable**: Create guide in `docs/how-to/`
3. **Update tutorials**: If beginner journey changes
4. **Update explanation**: If architecture changes

### Documentation Checklist

Before marking a feature complete:

- [ ] Reference documentation updated (props, methods, types)
- [ ] How-to guide created (if user-facing task)
- [ ] Code examples tested and working
- [ ] Cross-links added to related docs
- [ ] Index files updated for new pages

---

## Code Style

- Use TypeScript for all new code
- Follow Svelte 5 runes patterns (`$state`, `$derived`, `$effect`)
- Write tests for new features
- Keep components focused and composable

---

## Pull Request Process

1. Create a feature branch
2. Implement the feature with tests
3. Update documentation following Diátaxis framework
4. Ensure all tests pass: `pnpm test`
5. Ensure type checking passes: `pnpm check`
6. Submit PR with clear description

---

## Documentation Files Overview

### Tutorials (`docs/tutorials/`)

| File | Purpose |
|------|---------|
| `getting-started.md` | First grid in 5 minutes |
| `adding-selection.md` | Row selection tutorial |
| `server-side-data.md` | DataSource tutorial |

### How-to Guides (`docs/how-to/`)

| File | Purpose |
|------|---------|
| `filtering.md` | Enable per-column and global search |
| `keyboard-navigation.md` | Arrow key navigation |
| `theming.md` | Customize appearance |
| `column-resizing.md` | Resize columns |
| `custom-cells.md` | Render custom cell content |
| `editing.md` | Enable inline cell editing |

### Reference (`docs/reference/`)

| File | Purpose |
|------|---------|
| `datagrid.md` | DataGrid component API |
| `column-definition.md` | Column configuration |
| `grid-state.md` | State management API |
| `data-sources.md` | DataSource interface |
| `types.md` | TypeScript type definitions |
| `css-variables.md` | Theming tokens |
| `filter-operators.md` | Filter operators |

### Explanation (`docs/explanation/`)

| File | Purpose |
|------|---------|
| `architecture.md` | Overall structure |
| `state-management.md` | Svelte 5 runes usage |
| `virtualization.md` | Row virtualization |
| `data-source-architecture.md` | Data layer design |
| `performance.md` | Performance optimizations |
