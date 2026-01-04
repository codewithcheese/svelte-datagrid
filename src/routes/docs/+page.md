---
title: Introduction
---

# Svelte DataGrid

A high-performance, virtualized data grid for Svelte 5.

## Features

- **Virtualized Rendering** - Efficiently handles thousands of rows
- **Svelte 5 Runes** - Built with modern reactive primitives
- **TypeScript** - Full type safety out of the box
- **Flexible Data Sources** - Works with local data, REST APIs, or databases
- **Rich Interactions** - Selection, sorting, filtering, editing, and more

## Quick Start

Install the package:

```bash
npm install svelte-datagrid
```

Create your first grid:

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

<div style="height: 400px;">
  <DataGrid {data} {columns} />
</div>
```

## Documentation Structure

This documentation follows the [Diátaxis](https://diataxis.fr/) framework:

### Tutorials
**Learning-oriented** - Step-by-step lessons for beginners

- [Getting Started](/docs/tutorials/getting-started) - Your first grid in 5 minutes
- [Adding Selection](/docs/tutorials/adding-selection) - Enable row selection
- [Server-Side Data](/docs/tutorials/server-side-data) - Connect to a backend

### How-to Guides
**Task-oriented** - Practical steps to solve specific problems

- [Enable Filtering](/docs/how-to/filtering) - Per-column and global search
- [Cell Editing](/docs/how-to/editing) - Inline cell editing
- [Keyboard Navigation](/docs/how-to/keyboard-navigation) - Navigate with arrow keys
- [Column Resizing](/docs/how-to/column-resizing) - Resize columns by dragging
- [Custom Cells](/docs/how-to/custom-cells) - Render custom content
- [Theming](/docs/how-to/theming) - Customize appearance

### Reference
**Information-oriented** - Technical descriptions and specifications

- [DataGrid Component](/docs/reference/datagrid) - Main component API
- [Column Definition](/docs/reference/column-definition) - Column configuration
- [Grid State](/docs/reference/grid-state) - State management API
- [Data Sources](/docs/reference/data-sources) - DataSource interface
- [Types](/docs/reference/types) - TypeScript type definitions

### Concepts
**Understanding-oriented** - How and why things work

- [Architecture](/docs/explanation/architecture) - How the grid is structured
- [State Management](/docs/explanation/state-management) - Reactive state with Svelte 5
- [Virtualization](/docs/explanation/virtualization) - How row virtualization works
- [Performance](/docs/explanation/performance) - Optimization strategies

## Quick Links

| I want to... | Go to... |
|--------------|----------|
| Get started quickly | [Getting Started Tutorial](/docs/tutorials/getting-started) |
| See all available props | [DataGrid Reference](/docs/reference/datagrid) |
| Add filtering to my grid | [Filtering How-to](/docs/how-to/filtering) |
| Understand the architecture | [Architecture Explanation](/docs/explanation/architecture) |
