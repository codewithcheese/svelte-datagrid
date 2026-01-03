# Claude Code Instructions

## Project Overview

This is a high-performance Svelte 5 data grid component library. The project prioritizes:
- **Performance**: Zero perceived lag (<16ms UI updates, <100ms complex operations)
- **Type Safety**: Comprehensive TypeScript support with generics
- **Testing**: Thorough test coverage before adding new features
- **Benchmarking**: Performance regression testing with each feature addition

## Before Committing

**CRITICAL**: Before committing any changes, you MUST:

1. **Run all tests**:
   ```bash
   npm run test
   ```
   All tests must pass. If tests fail, fix them before committing.

2. **Run benchmarks**:
   ```bash
   npm run bench
   ```
   Review benchmark results for any performance regressions.

3. **Run type checking**:
   ```bash
   npm run check
   ```
   No TypeScript errors should be present.

4. **Update documentation** if:
   - New features are added
   - API changes are made
   - Breaking changes occur

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run bench` | Run performance benchmarks |
| `npm run bench:ci` | Run benchmarks with JSON output |
| `npm run check` | TypeScript type checking |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run e2e:ui` | Run E2E tests with UI |

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   └── datagrid/
│   │       ├── DataGrid.svelte      # Main component
│   │       ├── core/                # Core sub-components
│   │       │   ├── Header.svelte
│   │       │   ├── HeaderCell.svelte
│   │       │   ├── Body.svelte
│   │       │   ├── Row.svelte
│   │       │   └── Cell.svelte
│   │       └── __tests__/           # Component tests
│   ├── core/
│   │   ├── virtualizer.ts           # Virtualization logic
│   │   └── virtualizer.test.ts      # Virtualizer tests
│   ├── state/
│   │   └── grid-state.svelte.ts     # Reactive state management
│   ├── types/                       # TypeScript types
│   │   ├── column.ts
│   │   ├── data.ts
│   │   ├── events.ts
│   │   ├── state.ts
│   │   └── index.ts
│   ├── benchmarks/
│   │   └── datagrid.bench.ts        # Performance benchmarks
│   └── index.ts                     # Public exports
├── routes/
│   └── +page.svelte                 # Demo page
└── e2e/
    └── datagrid.spec.ts             # E2E tests
```

## Architecture Decisions

### Svelte 5 Runes
- Use `$state` for mutable reactive state
- Use `$derived` for computed values
- Use `$effect` for side effects and lifecycle

### Virtualization
- Framework-agnostic virtualizer in `src/lib/core/virtualizer.ts`
- Supports fixed and variable row heights
- Overscan configurable for smoother scrolling

### State Management
- Centralized grid state via `createGridState()`
- Context-based sharing between components
- Getter-based context objects for reactivity

### Testing Strategy
- Unit tests with Vitest for logic (virtualizer, state)
- E2E tests with Playwright for component interactions
- Component tests have limitations in jsdom due to Svelte 5 runes
- **Future**: Consider migrating to Vitest browser mode for component testing
  - See: https://scottspence.com/posts/migrating-from-testing-library-svelte-to-vitest-browser-svelte
  - This allows component testing with real browser APIs and Svelte 5 runes

## Performance Targets

| Operation | Target |
|-----------|--------|
| UI updates | <16ms (60fps) |
| Sort 100K rows | <100ms |
| Filter 100K rows | <50ms |
| Scroll (virtualized) | <5ms per frame |
| Initial render | <50ms |

## Feature Roadmap

Features are implemented in phases, with each phase thoroughly tested before proceeding:

1. **Phase 1**: Baseline table UX (virtualization, basic rendering) ✅
2. **Phase 2**: Sorting, selection, column features
3. **Phase 3**: Advanced sorting, filtering, column groups
4. **Phase 4**: Editing, validation, advanced selection
5. **Phase 5**: Column pinning, search, tree data
6. **Phase 6**: Export, undo/redo, persistence
7. **Phase 7**: Infinite scroll, theming, accessibility
8. **Phase 8**: Master-detail, nested grids, aggregations
9. **Phase 9**: Formula support, copy/paste
10. **Phase 10**: Large dataset optimizations
11. **Phase 11**: Ultra-high performance rendering
