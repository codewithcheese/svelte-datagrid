# Contributing to Svelte DataGrid

## Development Setup

```bash
npm install
npm run dev
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Type Checking

```bash
# Check Svelte component types
npm run check

# Check test file types
npx tsc -p tsconfig.test.json --noEmit
```

## Documenting Features

Documentation for each DataGrid feature is stored in the `docs/` directory. As you develop and test features, document them following this process:

### Documentation Workflow

1. **Create a feature doc** when you start implementing a new feature:
   ```
   docs/<feature-name>.md
   ```

2. **Document during development**, not after. Update the doc as you:
   - Define the API (props, events, types)
   - Implement the core functionality
   - Write tests that demonstrate usage
   - Discover edge cases or limitations

3. **Structure each feature doc** with these sections:

   ```markdown
   # Feature Name

   Brief description of what this feature does.

   ## Usage

   Basic example showing how to use the feature.

   ## Props

   | Prop | Type | Default | Description |
   |------|------|---------|-------------|
   | ... | ... | ... | ... |

   ## Events

   | Event | Payload | Description |
   |-------|---------|-------------|
   | ... | ... | ... |

   ## Examples

   ### Example: Common Use Case
   Code example with explanation.

   ### Example: Advanced Use Case
   More complex example.

   ## Notes

   Any limitations, browser compatibility, or performance considerations.
   ```

4. **Link tests to docs**. When writing tests, reference the corresponding documentation:
   ```typescript
   // See docs/sorting.md for full documentation
   describe('sorting', () => {
     // ...
   });
   ```

### Feature Documentation Checklist

Before marking a feature as complete, ensure its documentation includes:

- [ ] Clear description of the feature's purpose
- [ ] All props with types, defaults, and descriptions
- [ ] All events with payload types and descriptions
- [ ] At least one basic usage example
- [ ] At least one advanced example (if applicable)
- [ ] Known limitations or edge cases
- [ ] Performance considerations (if applicable)

### Documentation Files

| Feature | Doc File | Status |
|---------|----------|--------|
| Core Rendering | `docs/core.md` | Complete |
| Virtualization | `docs/virtualization.md` | Complete |
| Sorting | `docs/sorting.md` | Complete |
| Column Resizing | `docs/column-resizing.md` | Complete |
| Selection | `docs/selection.md` | Complete |
| Custom Cells | `docs/custom-cells.md` | Pending |
| Theming | `docs/theming.md` | Complete |

## Code Style

- Use TypeScript for all new code
- Follow Svelte 5 runes patterns (`$state`, `$derived`, `$effect`)
- Write tests for new features
- Keep components focused and composable

## Pull Request Process

1. Create a feature branch
2. Implement the feature with tests
3. Document the feature in `docs/`
4. Ensure all tests pass: `npm run test`
5. Ensure type checking passes: `npm run check`
6. Submit PR with clear description
