---
title: Row Styling
---

# How to Style Rows Conditionally

This guide shows how to apply dynamic styles to rows based on data.

## Using rowClass prop

The `rowClass` prop accepts a string or a function that returns a class name:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', status: 'active' },
    { id: 2, name: 'Bob', status: 'inactive' },
    { id: 3, name: 'Carol', status: 'pending' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'status', header: 'Status', width: 100 }
  ];

  function getRowClass(row, index) {
    return `row-${row.status}`;
  }
</script>

<DataGrid {data} {columns} rowClass={getRowClass} />

<style>
  :global(.row-active) {
    background-color: #dcfce7 !important;
  }

  :global(.row-inactive) {
    background-color: #fee2e2 !important;
    color: #991b1b;
  }

  :global(.row-pending) {
    background-color: #fef3c7 !important;
  }
</style>
```

## Striped rows

Apply alternating row colors:

```svelte
<script>
  function getRowClass(row, index) {
    return index % 2 === 0 ? 'row-even' : 'row-odd';
  }
</script>

<DataGrid {data} {columns} rowClass={getRowClass} />

<style>
  :global(.row-even) {
    background-color: #f9fafb;
  }

  :global(.row-odd) {
    background-color: #ffffff;
  }
</style>
```

## Highlight specific rows

Highlight rows based on conditions:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', amount: 500 },
    { id: 2, name: 'Bob', amount: 1500 },
    { id: 3, name: 'Carol', amount: 2500 }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'amount', header: 'Amount', width: 100, align: 'right' }
  ];

  function getRowClass(row) {
    if (row.amount >= 2000) return 'row-high-value';
    if (row.amount >= 1000) return 'row-medium-value';
    return '';
  }
</script>

<DataGrid {data} {columns} rowClass={getRowClass} />

<style>
  :global(.row-high-value) {
    background-color: #dcfce7 !important;
    border-left: 3px solid #22c55e;
  }

  :global(.row-medium-value) {
    background-color: #dbeafe !important;
    border-left: 3px solid #3b82f6;
  }
</style>
```

## Error and warning rows

Show error or warning states:

```svelte
<script lang="ts">
  const data = [
    { id: 1, name: 'Order 1', hasError: false, hasWarning: false },
    { id: 2, name: 'Order 2', hasError: true, hasWarning: false },
    { id: 3, name: 'Order 3', hasError: false, hasWarning: true }
  ];

  function getRowClass(row) {
    if (row.hasError) return 'row-error';
    if (row.hasWarning) return 'row-warning';
    return '';
  }
</script>

<DataGrid {data} {columns} rowClass={getRowClass} />

<style>
  :global(.row-error) {
    background-color: #fef2f2 !important;
    border-left: 4px solid #ef4444;
  }

  :global(.row-error:hover) {
    background-color: #fee2e2 !important;
  }

  :global(.row-warning) {
    background-color: #fffbeb !important;
    border-left: 4px solid #f59e0b;
  }

  :global(.row-warning:hover) {
    background-color: #fef3c7 !important;
  }
</style>
```

## Multiple classes

Return multiple classes:

```svelte
<script>
  function getRowClass(row, index) {
    const classes = [];

    // Add stripe class
    if (index % 2 === 0) classes.push('row-striped');

    // Add status class
    classes.push(`status-${row.status}`);

    // Add priority class
    if (row.priority === 'high') classes.push('priority-high');

    return classes.join(' ');
  }
</script>
```

## Complete example

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Task A', status: 'completed', priority: 'low', dueDate: '2024-01-10' },
    { id: 2, name: 'Task B', status: 'in_progress', priority: 'high', dueDate: '2024-01-05' },
    { id: 3, name: 'Task C', status: 'pending', priority: 'medium', dueDate: '2024-01-15' },
    { id: 4, name: 'Task D', status: 'overdue', priority: 'high', dueDate: '2024-01-01' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Task', width: 150 },
    { key: 'status', header: 'Status', width: 120 },
    { key: 'priority', header: 'Priority', width: 100 },
    { key: 'dueDate', header: 'Due Date', width: 120 }
  ];

  function getRowClass(row, index) {
    const classes = [];

    // Status-based styling
    if (row.status === 'overdue') {
      classes.push('row-overdue');
    } else if (row.status === 'completed') {
      classes.push('row-completed');
    }

    // Priority indicator
    if (row.priority === 'high') {
      classes.push('row-priority-high');
    }

    return classes.join(' ');
  }
</script>

<div style="height: 300px;">
  <DataGrid
    {data}
    {columns}
    selectable
    getRowId={(row) => row.id}
    rowClass={getRowClass}
  />
</div>

<style>
  :global(.row-overdue) {
    background-color: #fef2f2 !important;
  }

  :global(.row-overdue:hover) {
    background-color: #fee2e2 !important;
  }

  :global(.row-completed) {
    color: #6b7280;
    text-decoration: line-through;
  }

  :global(.row-priority-high) {
    border-left: 4px solid #ef4444;
  }
</style>
```

## See also

- [Reference: DataGrid](/docs/reference/datagrid) - rowClass prop
- [How-to: Theming](/docs/how-to/theming) - CSS custom properties
- [How-to: Custom Cells](/docs/how-to/custom-cells) - Custom cell content
