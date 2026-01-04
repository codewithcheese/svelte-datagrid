# Claude Code Instructions

## Before Committing

**CRITICAL**: Before committing any changes, you MUST:

1. **Run all tests**: `npm run test` - All tests must pass
2. **Run type checking**: `npm run check` - No TypeScript errors
3. **Update documentation** following the Diátaxis framework (see below)

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all tests |
| `npm run check` | TypeScript type checking |
| `npm run dev` | Development server |

## Architecture Patterns

### Svelte 5 Runes
- Use `$state` for mutable state
- Use `$derived` for computed values
- Use `$effect` for side effects (track previous values to avoid infinite loops)

### Testing
- Unit tests: `*.test.ts` (Vitest, node environment)
- Browser component tests: `*.svelte.test.ts` (Vitest browser mode, Playwright)
- Type checking for tests uses `tsconfig.test.json`

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
