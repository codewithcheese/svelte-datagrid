---
title: Keyboard Navigation
---

# How to Enable Keyboard Navigation

This guide shows how to navigate the grid with keyboard shortcuts.

## Enable keyboard navigation

Keyboard navigation is enabled automatically when `selectable` is set:

```svelte
<DataGrid
  {data}
  {columns}
  selectable
/>
```

Click inside the grid body to give it focus, then use arrow keys to navigate.

## Navigation shortcuts

### Row navigation

| Key | Action |
|-----|--------|
| **Arrow Down** | Move to next row |
| **Arrow Up** | Move to previous row |
| **Page Down** | Move down one page |
| **Page Up** | Move up one page |
| **Home** or **Ctrl+Home** | Move to first row |
| **End** or **Ctrl+End** | Move to last row |

### Selection shortcuts

| Key | Action |
|-----|--------|
| **Space** | Toggle selection on focused row |
| **Enter** | Select focused row |
| **Ctrl/Cmd+A** | Select all rows (multi-select mode) |
| **Escape** | Clear all selection |

### Range selection (multi-select mode)

| Key | Action |
|-----|--------|
| **Shift+Arrow Down** | Extend selection down |
| **Shift+Arrow Up** | Extend selection up |
| **Shift+Page Down** | Extend selection one page down |
| **Shift+Page Up** | Extend selection one page up |
| **Shift+Home** | Extend selection to first row |
| **Shift+End** | Extend selection to last row |

## Programmatic navigation

Access grid state to navigate programmatically:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  let gridState;

  function goToFirst() {
    gridState.navigateToFirst();
  }

  function goToLast() {
    gridState.navigateToLast();
  }

  function goToRow(index) {
    gridState.navigateRow(index);
  }
</script>

<button onclick={goToFirst}>First</button>
<button onclick={goToLast}>Last</button>
<button onclick={() => goToRow(50)}>Go to row 50</button>

<DataGrid
  {data}
  {columns}
  selectable
  bind:gridState
/>
```

### Navigation API

| Method | Description |
|--------|-------------|
| `navigateRow(index)` | Navigate to specific row |
| `navigateToFirst()` | Navigate to first row |
| `navigateToLast()` | Navigate to last row |
| `navigateByPage(direction)` | Navigate one page up/down |

## Focus management

The grid body receives focus when clicked. You can also focus it programmatically:

```svelte
<script>
  let gridElement;

  function focusGrid() {
    gridElement.querySelector('[data-testid="datagrid-body"]')?.focus();
  }
</script>

<button onclick={focusGrid}>Focus Grid</button>

<div bind:this={gridElement}>
  <DataGrid {data} {columns} selectable />
</div>
```

## Accessibility considerations

The grid implements the ARIA grid pattern:

- `role="grid"` on container
- `role="rowgroup"` on body
- `role="row"` on each row
- `role="gridcell"` on each cell
- `aria-rowindex` for each row
- `tabindex="0"` on body for focus

Screen readers announce:
- Current row position
- Selected state
- Cell contents

## Combine with selection events

Track navigation alongside selection:

```svelte
<script>
  let currentRow = $state(null);
  let selectedRows = $state(new Set());

  function handleSelection(event) {
    selectedRows = event.selected;
    // Current row is the last selected
    currentRow = event.added.length > 0 ? event.added[event.added.length - 1] : null;
  }
</script>

<DataGrid
  {data}
  {columns}
  selectable="multiple"
  getRowId={(row) => row.id}
  onselectionchange={handleSelection}
/>

<p>Current: {currentRow}, Selected: {selectedRows.size}</p>
```

## Complete example

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Row ${i + 1}`,
    value: Math.floor(Math.random() * 1000)
  }));

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'value', header: 'Value', width: 100 }
  ];

  let gridState;
  let selectedIds = $state(new Set());

  function handleSelection(event) {
    selectedIds = event.selected;
  }
</script>

<div style="margin-bottom: 8px;">
  <button onclick={() => gridState?.navigateToFirst()}>First</button>
  <button onclick={() => gridState?.navigateByPage(-1)}>Page Up</button>
  <button onclick={() => gridState?.navigateByPage(1)}>Page Down</button>
  <button onclick={() => gridState?.navigateToLast()}>Last</button>
  <span style="margin-left: 16px;">Selected: {selectedIds.size}</span>
</div>

<div style="height: 400px;">
  <DataGrid
    {data}
    {columns}
    selectable="multiple"
    getRowId={(row) => row.id}
    onselectionchange={handleSelection}
    bind:gridState
  />
</div>

<p style="color: #666; font-size: 0.875rem;">
  Click grid, then use Arrow keys, Page Up/Down, Home/End to navigate.
  Space to toggle selection. Shift+arrows to extend selection.
</p>
```

## See also

- [Tutorial: Adding Selection](/docs/tutorials/adding-selection) - Selection basics
- [Reference: Grid State](/docs/reference/grid-state) - Navigation API
- [Explanation: State Management](/docs/explanation/state-management) - How state works
