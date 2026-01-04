# Contributing to Svelte DataGrid

## Development Setup

```bash
pnpm install
pnpm dev
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui
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

### Reference (`docs/reference/`)

| File | Purpose |
|------|---------|
| `datagrid.md` | DataGrid component API |
| `column-definition.md` | Column configuration |
| `grid-state.md` | State management API |
| `data-sources.md` | DataSource interface |

### Explanation (`docs/explanation/`)

| File | Purpose |
|------|---------|
| `architecture.md` | Overall structure |
| `state-management.md` | Svelte 5 runes usage |
| `virtualization.md` | Row virtualization |
