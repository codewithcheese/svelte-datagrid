# Claude Code Instructions

## Before Committing

**CRITICAL**: Before committing any changes, you MUST:

1. **Run all tests**: `npm run test` - All tests must pass
2. **Run type checking**: `npm run check` - No TypeScript errors
3. **Update documentation** in `docs/` if API changes occur

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
- `PgLiteDataSource` - PostgreSQL via PgLite (for testing)
- See `src/lib/query/` for the query module

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Feature roadmap with complexity ranking |
| `CONTRIBUTING.md` | Development workflow and documentation guide |
| `DEBUGGING.md` | Debugging strategies for common issues |
| `docs/` | Feature documentation |

## Performance Targets

| Operation | Target |
|-----------|--------|
| UI updates | <16ms |
| Sort 100K rows | <100ms |
| Filter 100K rows | <50ms |
| Scroll frame | <5ms |
