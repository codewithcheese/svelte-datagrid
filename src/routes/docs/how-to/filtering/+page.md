---
title: Filtering
---

# How to Enable Filtering

This guide shows how to add per-column filters and global search to your grid.

## Per-column filtering

Add the `filterable` prop to enable filter inputs below each column header:

```svelte
<DataGrid
  {data}
  {columns}
  filterable
/>
```

A filter row appears below the header with inputs for each column.

### Filter types

Set `filterType` on each column to control the filter input:

```typescript
const columns = [
  { key: 'name', header: 'Name', filterType: 'text' },      // Text contains
  { key: 'age', header: 'Age', filterType: 'number' },      // Numeric comparison
  { key: 'joinDate', header: 'Joined', filterType: 'date' }, // Date picker
  { key: 'active', header: 'Active', filterType: 'boolean' }, // Yes/No/All
  { key: 'role', header: 'Role', filterType: 'select', filterOptions: ['Admin', 'User', 'Guest'] }
];
```

| Type | Input | Behavior |
|------|-------|----------|
| `text` (default) | Text input | Case-insensitive contains |
| `number` | Number input | Exact match or comparison |
| `date` | Date picker | Date comparison |
| `boolean` | Dropdown | Yes / No / All |
| `select` | Dropdown | Exact match from options |

### Disable filtering for specific columns

```typescript
const columns = [
  { key: 'id', header: 'ID', filterable: false },  // No filter
  { key: 'name', header: 'Name' }  // Has filter
];
```

## Global search

Add the `searchable` prop to show a search bar above the grid:

```svelte
<DataGrid
  {data}
  {columns}
  searchable
/>
```

The search bar searches across all columns (unless `filterable: false`).

### How global search works

1. User types in the search bar
2. After 300ms debounce, search executes
3. Each row is checked: if any column value contains the search term, the row is shown
4. Press Enter for immediate search
5. Press Escape to clear

### Combine filtering and search

Use both together:

```svelte
<DataGrid
  {data}
  {columns}
  filterable
  searchable
/>
```

The search bar appears above the grid, with filter inputs below the header.

## Programmatic filtering

Access the grid state to filter programmatically:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  let gridState;

  function filterByRole(role) {
    gridState.setFilter('role', { operator: 'eq', value: role });
  }

  function clearFilters() {
    gridState.clearAllFilters();
  }
</script>

<button onclick={() => filterByRole('Admin')}>Show Admins</button>
<button onclick={clearFilters}>Clear Filters</button>

<DataGrid
  {data}
  {columns}
  filterable
  bind:gridState
/>
```

### Filter API methods

| Method | Description |
|--------|-------------|
| `setFilter(column, filter)` | Set filter for a column |
| `clearFilter(column)` | Clear filter for a column |
| `clearAllFilters()` | Clear all column filters |
| `setGlobalSearch(term)` | Set global search term |
| `clearGlobalSearch()` | Clear global search |

### Filter operators

When setting filters programmatically, specify the operator:

```typescript
// Text operators
gridState.setFilter('name', { operator: 'contains', value: 'john' });
gridState.setFilter('name', { operator: 'startsWith', value: 'A' });

// Number operators
gridState.setFilter('age', { operator: 'gte', value: 21 });
gridState.setFilter('price', { operator: 'between', value: [10, 50] });

// Equality
gridState.setFilter('status', { operator: 'eq', value: 'active' });
gridState.setFilter('status', { operator: 'in', value: ['active', 'pending'] });
```

## Filter debouncing

Filters are debounced by 300ms to prevent excessive updates while typing. Users can:
- Wait for debounce to complete
- Press Enter for immediate filter
- Press Escape to clear the input

## Styling the filter row

Target the filter row with CSS:

```css
.datagrid-filter-row {
  background: var(--datagrid-filter-bg, #f5f5f5);
}

.datagrid-filter-row input {
  font-size: 0.875rem;
  padding: 4px 8px;
}
```

## Complete example

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', role: 'Admin', active: true, salary: 95000 },
    { id: 2, name: 'Bob', role: 'User', active: true, salary: 75000 },
    { id: 3, name: 'Carol', role: 'User', active: false, salary: 82000 },
    { id: 4, name: 'David', role: 'Guest', active: true, salary: 65000 }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60, filterable: false },
    { key: 'name', header: 'Name', width: 150, filterType: 'text' },
    { key: 'role', header: 'Role', width: 120, filterType: 'select', filterOptions: ['Admin', 'User', 'Guest'] },
    { key: 'active', header: 'Active', width: 100, filterType: 'boolean' },
    { key: 'salary', header: 'Salary', width: 120, filterType: 'number', align: 'right' }
  ];
</script>

<div style="height: 400px;">
  <DataGrid
    {data}
    {columns}
    filterable
    searchable
  />
</div>
```

## See also

- [Reference: Grid State](/docs/reference/grid-state) - Full filter API
- [Reference: Column Definition](/docs/reference/column-definition) - Filter column options
- [Explanation: Performance](/docs/explanation/performance) - Filter performance tips
