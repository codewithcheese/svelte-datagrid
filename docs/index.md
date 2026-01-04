# Svelte DataGrid Documentation

A high-performance, virtualized data grid for Svelte 5.

## Documentation Structure

This documentation follows the [Diátaxis](https://diataxis.fr/) framework, organized into four distinct types:

### [Tutorials](./tutorials/index.md)
**Learning-oriented** - Step-by-step lessons for beginners

Start here if you're new to Svelte DataGrid. These guided lessons take you from zero to a working grid.

- [Getting Started](./tutorials/getting-started.md) - Your first grid in 5 minutes
- [Adding Selection](./tutorials/adding-selection.md) - Enable row selection
- [Server-Side Data](./tutorials/server-side-data.md) - Connect to a backend

### [How-to Guides](./how-to/index.md)
**Task-oriented** - Practical steps to solve specific problems

Use these when you know what you want to do but need to know how.

- [Enable Filtering](./how-to/filtering.md) - Per-column and global search
- [Keyboard Navigation](./how-to/keyboard-navigation.md) - Navigate with arrow keys
- [Custom Cell Rendering](./how-to/custom-cells.md) - Render custom content
- [Theming](./how-to/theming.md) - Customize appearance
- [Column Resizing](./how-to/column-resizing.md) - Resize columns by dragging

### [Reference](./reference/index.md)
**Information-oriented** - Technical descriptions and specifications

Complete API documentation for every component, prop, and type.

- [DataGrid Component](./reference/datagrid.md) - Main component API
- [Column Definition](./reference/column-definition.md) - Column configuration
- [Grid State](./reference/grid-state.md) - State management API
- [Data Sources](./reference/data-sources.md) - DataSource interface
- [Types](./reference/types.md) - TypeScript type definitions
- [CSS Variables](./reference/css-variables.md) - Theming tokens

### [Explanation](./explanation/index.md)
**Understanding-oriented** - Conceptual discussions and architecture

Read these to understand how and why things work.

- [Architecture Overview](./explanation/architecture.md) - How the grid is structured
- [Virtualization](./explanation/virtualization.md) - How row virtualization works
- [Data Source Architecture](./explanation/data-source-architecture.md) - Decoupled data layer
- [State Management](./explanation/state-management.md) - Reactive state with Svelte 5 runes
- [Performance](./explanation/performance.md) - Optimization strategies

---

## Quick Links

| I want to... | Go to... |
|--------------|----------|
| Get started quickly | [Getting Started Tutorial](./tutorials/getting-started.md) |
| See all available props | [DataGrid Reference](./reference/datagrid.md) |
| Add filtering to my grid | [Filtering How-to](./how-to/filtering.md) |
| Understand the architecture | [Architecture Explanation](./explanation/architecture.md) |

## Installation

```bash
npm install svelte-datagrid
```

## Minimal Example

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  const columns = [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'name', header: 'Name', width: 200 }
  ];

  const data = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
</script>

<DataGrid {data} {columns} />
```
