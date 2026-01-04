# Adding Selection

In this tutorial, you'll add row selection to your grid. You'll learn single and multi-select modes, keyboard shortcuts, and how to work with selected rows.

**Time**: 10 minutes
**Prerequisites**: Completed [Getting Started](./getting-started.md)

## Step 1: Enable single selection

Start with the grid from the Getting Started tutorial and add `selectable`:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice Johnson', role: 'Engineer' },
    { id: 2, name: 'Bob Smith', role: 'Designer' },
    { id: 3, name: 'Carol White', role: 'Manager' },
    { id: 4, name: 'David Brown', role: 'Engineer' },
    { id: 5, name: 'Eve Davis', role: 'Designer' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'role', header: 'Role', width: 120 }
  ];
</script>

<div style="height: 300px;">
  <DataGrid
    {data}
    {columns}
    selectable
  />
</div>
```

Click a row. It highlights to show it's selected. Click another row. The selection moves to the new row.

## Step 2: Add row identification

For stable selection that survives data updates, tell the grid how to identify each row:

```svelte
<DataGrid
  {data}
  {columns}
  selectable
  getRowId={(row) => row.id}
/>
```

Without `getRowId`, selection uses array indices. If data is sorted or filtered, the wrong rows stay selected.

> **Best practice**: Always provide `getRowId` when using selection.

## Step 3: Track selected rows

Listen for selection changes:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [/* ... */];
  const columns = [/* ... */];

  let selectedId = $state<number | null>(null);

  function handleSelection(event) {
    const { selected } = event;
    selectedId = selected.size > 0 ? [...selected][0] : null;
  }
</script>

<DataGrid
  {data}
  {columns}
  selectable
  getRowId={(row) => row.id}
  onselectionchange={handleSelection}
/>

{#if selectedId}
  <p>Selected: {data.find(r => r.id === selectedId)?.name}</p>
{:else}
  <p>No selection</p>
{/if}
```

The `selected` property is a `Set` of row IDs.

## Step 4: Enable multi-select

Change `selectable` to `"multiple"`:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice Johnson', role: 'Engineer' },
    { id: 2, name: 'Bob Smith', role: 'Designer' },
    { id: 3, name: 'Carol White', role: 'Manager' },
    { id: 4, name: 'David Brown', role: 'Engineer' },
    { id: 5, name: 'Eve Davis', role: 'Designer' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'role', header: 'Role', width: 120 }
  ];

  let selectedIds = $state(new Set<number>());

  function handleSelection(event) {
    selectedIds = event.selected;
  }
</script>

<div style="height: 300px;">
  <DataGrid
    {data}
    {columns}
    selectable="multiple"
    getRowId={(row) => row.id}
    onselectionchange={handleSelection}
  />
</div>

<p>Selected: {selectedIds.size} rows</p>
```

## Step 5: Use keyboard shortcuts

With multi-select enabled, try these:

| Action | Result |
|--------|--------|
| **Click** | Select only this row |
| **Ctrl/Cmd + Click** | Toggle row without deselecting others |
| **Shift + Click** | Select range from last selected |
| **Arrow Up/Down** | Navigate to adjacent row |
| **Space** | Toggle selection on focused row |
| **Ctrl/Cmd + A** | Select all rows |
| **Escape** | Clear selection |

Try these in your grid:
1. Click "Alice" to select her
2. Hold Shift, click "David" - selects Alice through David (4 rows)
3. Ctrl+Click "Carol" - deselects just Carol
4. Press Escape - clears all selection

## Step 6: Show selected data

Display the actual selected rows:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice Johnson', role: 'Engineer' },
    { id: 2, name: 'Bob Smith', role: 'Designer' },
    { id: 3, name: 'Carol White', role: 'Manager' },
    { id: 4, name: 'David Brown', role: 'Engineer' },
    { id: 5, name: 'Eve Davis', role: 'Designer' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'role', header: 'Role', width: 120 }
  ];

  let selectedIds = $state(new Set<number>());

  function handleSelection(event) {
    selectedIds = event.selected;
  }

  // Derive selected rows from IDs
  const selectedRows = $derived(
    data.filter(row => selectedIds.has(row.id))
  );
</script>

<div style="height: 300px;">
  <DataGrid
    {data}
    {columns}
    selectable="multiple"
    getRowId={(row) => row.id}
    onselectionchange={handleSelection}
  />
</div>

<h3>Selected ({selectedRows.length})</h3>
<ul>
  {#each selectedRows as row}
    <li>{row.name} - {row.role}</li>
  {/each}
</ul>
```

## Complete code

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice Johnson', role: 'Engineer' },
    { id: 2, name: 'Bob Smith', role: 'Designer' },
    { id: 3, name: 'Carol White', role: 'Manager' },
    { id: 4, name: 'David Brown', role: 'Engineer' },
    { id: 5, name: 'Eve Davis', role: 'Designer' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'role', header: 'Role', width: 120 }
  ];

  let selectedIds = $state(new Set<number>());

  function handleSelection(event) {
    selectedIds = event.selected;
  }

  const selectedRows = $derived(
    data.filter(row => selectedIds.has(row.id))
  );
</script>

<div style="height: 300px;">
  <DataGrid
    {data}
    {columns}
    selectable="multiple"
    getRowId={(row) => row.id}
    onselectionchange={handleSelection}
  />
</div>

<div style="margin-top: 1rem;">
  <strong>Selected ({selectedRows.length}):</strong>
  {#if selectedRows.length > 0}
    {selectedRows.map(r => r.name).join(', ')}
  {:else}
    None
  {/if}
</div>
```

## What you learned

- Single selection with `selectable`
- Multi-selection with `selectable="multiple"`
- Row identification with `getRowId`
- Selection events with `onselectionchange`
- Keyboard shortcuts (Ctrl+Click, Shift+Click, arrows, Space)

## Next steps

- [Server-Side Data](./server-side-data.md) - Load data from a backend
- [How-to: Filtering](../how-to/filtering.md) - Filter the grid
- [Reference: Selection](../reference/grid-state.md#selection-api) - Full selection API
