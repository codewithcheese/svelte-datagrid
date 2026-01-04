# How to Enable Column Resizing

This guide shows how to let users resize columns by dragging.

## Enable column resizing

Add the `resizable` prop to the grid:

```svelte
<DataGrid
  {data}
  {columns}
  resizable
/>
```

A resize handle appears between column headers. Drag to resize.

## Control which columns are resizable

By default, all columns become resizable. Override per-column:

```typescript
const columns = [
  { key: 'id', header: 'ID', width: 60, resizable: false }, // Fixed width
  { key: 'name', header: 'Name', width: 200 },  // Resizable
  { key: 'email', header: 'Email', width: 250 } // Resizable
];
```

## Set min and max widths

Constrain resize limits:

```typescript
const columns = [
  {
    key: 'name',
    header: 'Name',
    width: 200,
    minWidth: 100,  // Can't shrink below 100px
    maxWidth: 400   // Can't grow above 400px
  }
];
```

## Persist column widths

Save and restore column widths:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  const STORAGE_KEY = 'my-grid-columns';

  // Load saved widths
  function loadWidths() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  // Save widths when changed
  function saveWidths(widths) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }

  const defaultColumns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 200 },
    { key: 'email', header: 'Email', width: 250 }
  ];

  // Merge saved widths with defaults
  const savedWidths = loadWidths();
  const columns = defaultColumns.map(col => ({
    ...col,
    width: savedWidths?.[col.key] ?? col.width
  }));

  let gridState;

  function handleResize() {
    // gridState.columnWidths is a Map<string, number>
    const widths = Object.fromEntries(gridState.columnWidths);
    saveWidths(widths);
  }
</script>

<DataGrid
  {data}
  {columns}
  resizable
  bind:gridState
  oncolumnresize={handleResize}
/>
```

## Reset to default widths

Provide a reset button:

```svelte
<script>
  let gridState;

  const defaultWidths = {
    id: 60,
    name: 200,
    email: 250
  };

  function resetWidths() {
    for (const [key, width] of Object.entries(defaultWidths)) {
      gridState.setColumnWidth(key, width);
    }
  }
</script>

<button onclick={resetWidths}>Reset Column Widths</button>

<DataGrid
  {data}
  {columns}
  resizable
  bind:gridState
/>
```

## Style the resize handle

Customize the resize handle appearance:

```css
:global(.datagrid-resize-handle) {
  width: 4px;
  background: transparent;
  cursor: col-resize;
}

:global(.datagrid-resize-handle:hover) {
  background: var(--datagrid-resize-handle-hover, #3b82f6);
}

:global(.datagrid-resize-handle.resizing) {
  background: var(--datagrid-resize-handle-active, #2563eb);
}
```

Or use CSS variables:

```css
.my-grid {
  --datagrid-resize-handle-color: transparent;
  --datagrid-resize-handle-hover: #10b981;
  --datagrid-resize-handle-width: 6px;
}
```

## Programmatic resizing

Set column widths via the grid state API:

```svelte
<script>
  let gridState;

  function makeNarrow() {
    gridState.setColumnWidth('name', 100);
  }

  function makeWide() {
    gridState.setColumnWidth('name', 400);
  }
</script>

<button onclick={makeNarrow}>Narrow</button>
<button onclick={makeWide}>Wide</button>

<DataGrid
  {data}
  {columns}
  resizable
  bind:gridState
/>
```

## Complete example

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User' },
    { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'User' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60, resizable: false },
    { key: 'name', header: 'Name', width: 180, minWidth: 100, maxWidth: 300 },
    { key: 'email', header: 'Email', width: 220, minWidth: 150 },
    { key: 'role', header: 'Role', width: 100, minWidth: 80 }
  ];

  let gridState;

  function resetWidths() {
    gridState.setColumnWidth('name', 180);
    gridState.setColumnWidth('email', 220);
    gridState.setColumnWidth('role', 100);
  }
</script>

<div style="margin-bottom: 8px;">
  <button onclick={resetWidths}>Reset Widths</button>
</div>

<div style="height: 300px;">
  <DataGrid
    {data}
    {columns}
    resizable
    bind:gridState
  />
</div>

<p style="font-size: 0.875rem; color: #666;">
  Drag the borders between column headers to resize.
  The ID column is fixed. Other columns have min/max constraints.
</p>
```

## See also

- [Reference: Column Definition](../reference/column-definition.md) - width, minWidth, maxWidth
- [Reference: Grid State](../reference/grid-state.md) - setColumnWidth API
- [How-to: Theming](./theming.md) - Style the resize handle
