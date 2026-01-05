# Grid State Reference

The grid provides programmatic access to data, selection, navigation, and configuration through the GridEngine API.

## Accessing Grid State

Use the `getEngine()` method to access the GridEngine API:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  let gridComponent;

  function handleSelectAll() {
    const engine = gridComponent.getEngine();
    engine?.selectAll();
  }
</script>

<DataGrid {data} {columns} bind:this={gridComponent} />

<button onclick={handleSelectAll}>
  Select All
</button>
```

Or use component methods directly:

```svelte
<script>
  let gridComponent;
</script>

<DataGrid {data} {columns} bind:this={gridComponent} />

<button onclick={() => gridComponent.selectAll()}>
  Select All
</button>
```

## Properties

### Data Properties

| Property | Type | Description |
|----------|------|-------------|
| `rows` | `TData[]` | Current data from DataSource (after sort/filter) |
| `totalRowCount` | `number` | Total row count from DataSource |
| `isLoading` | `boolean` | Whether data is being fetched from DataSource |

### Column Properties

| Property | Type | Description |
|----------|------|-------------|
| `visibleColumns` | `ColumnDef[]` | Visible column definitions |
| `columnWidths` | `Map<string, number>` | Current column widths |

### Selection Properties

| Property | Type | Description |
|----------|------|-------------|
| `selectedIds` | `Set<string \| number>` | Selected row IDs |

---

## Selection API

### selectRow(rowId, mode?)

Select a single row.

```typescript
engine.selectRow('row-1');

// With mode
engine.selectRow('row-1', 'toggle');  // Toggle selection
engine.selectRow('row-1', 'add');     // Add to selection
engine.selectRow('row-1', 'remove');  // Remove from selection
engine.selectRow('row-1', 'set');     // Clear others, select this one
```

### selectRange(targetRowId)

Select a range of rows from the last selected row to the target row.

```typescript
engine.selectRange('row-5'); // Selects from lastSelectedRowId to 'row-5'
```

### selectAll()

Select all rows.

```typescript
engine.selectAll();
```

### clearSelection()

Clear all selection.

```typescript
engine.clearSelection();
```

### isRowSelected(rowId)

Check if a row is selected.

```typescript
const selected = engine.isRowSelected('row-1'); // boolean
```

---

## Navigation API

### navigateRow(offset, select?, extendSelection?)

Navigate by a number of rows relative to the current focused row.

```typescript
engine.navigateRow(1);   // Move down one row
engine.navigateRow(-1);  // Move up one row
engine.navigateRow(5);   // Move down 5 rows

// With selection
engine.navigateRow(1, true);        // Move down and select
engine.navigateRow(1, true, true);  // Move down and extend selection (for Shift+Arrow)
```

### navigateToFirst(select?)

Navigate to the first row.

```typescript
engine.navigateToFirst();
engine.navigateToFirst(true); // Navigate and select
```

### navigateToLast(select?)

Navigate to the last row.

```typescript
engine.navigateToLast();
engine.navigateToLast(true); // Navigate and select
```

### navigateByPage(direction, select?)

Navigate by one page.

```typescript
engine.navigateByPage('down');        // Page down
engine.navigateByPage('up');          // Page up
engine.navigateByPage('down', true);  // Page down and select
```

### scrollToRow(index)

Scroll to bring a row into view.

```typescript
engine.scrollToRow(100);
```

---

## Sort API

### setSort(columnKey, direction, multiSort?)

Set the sort for a column.

```typescript
// Single column sort
engine.setSort('name', 'asc');

// Clear sort for a column
engine.setSort('name', null);

// Multi-column sort (add to existing sorts)
engine.setSort('department', 'asc');
engine.setSort('name', 'asc', true); // multiSort = true
```

### toggleSort(columnKey, multiSort?)

Toggle sort direction for a column (asc → desc → none).

```typescript
// Toggle single column
engine.toggleSort('name');

// Toggle with multi-sort
engine.toggleSort('name', true);
```

---

## Filter API

### setFilter(columnKey, value, operator?)

Set a filter for a column.

```typescript
// Simple contains filter (default operator)
engine.setFilter('name', 'john');

// With specific operator
engine.setFilter('age', 21, 'gte');
engine.setFilter('status', 'active', 'eq');

// Clear a filter by passing empty value
engine.setFilter('name', '');
```

### clearFilters()

Clear all column filters.

```typescript
engine.clearFilters();
```

### setGlobalSearch(term)

Set the global search term.

```typescript
engine.setGlobalSearch('search text');
```

---

## Column API

### setColumnWidth(columnKey, width)

Set a column's width.

```typescript
engine.setColumnWidth('name', 250);
```

### setColumnVisibility(columnKey, visible)

Show or hide a column.

```typescript
engine.setColumnVisibility('email', false); // Hide
engine.setColumnVisibility('email', true);  // Show
```

---

## Edit API

### startEdit(rowId, columnKey)

Start editing a cell. Returns `true` if editing started successfully.

```typescript
const started = engine.startEdit('row-1', 'name');
```

### commitEdit()

Commit the current edit. Returns a promise that resolves to `true` if successful.

```typescript
const success = await engine.commitEdit();
```

### cancelEdit()

Cancel the current edit without saving.

```typescript
engine.cancelEdit();
```

---

## Data Management API

### refresh()

Force refresh data from the DataSource. Returns a promise that resolves when complete.

```typescript
await engine.refresh();
```

### updateData(newData)

Update the source data (only works when using the `data` prop, not an external DataSource).

```typescript
engine.updateData(newData);
```

### updateOptions(options)

Update engine options dynamically.

```typescript
engine.updateOptions({
  sortable: false,
  editable: true
});
```

---

## Lifecycle

### destroy()

Clean up resources. Called automatically when the component unmounts.

```typescript
engine.destroy();
```

---

## Example Usage

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [/* ... */];
  const columns = [/* ... */];

  let gridComponent;

  function selectActiveUsers() {
    const engine = gridComponent.getEngine();
    if (!engine) return;

    engine.clearSelection();
    engine.rows
      .filter(row => row.active)
      .forEach(row => engine.selectRow(row.id, 'add'));
  }

  function filterHighValue() {
    gridComponent.getEngine()?.setFilter('value', 1000, 'gte');
  }

  function exportSelected() {
    const engine = gridComponent.getEngine();
    if (!engine) return;

    const selectedData = engine.rows.filter(row =>
      engine.selectedIds.has(row.id)
    );
    console.log('Export:', selectedData);
  }
</script>

<div>
  <button onclick={selectActiveUsers}>Select Active</button>
  <button onclick={filterHighValue}>High Value Only</button>
  <button onclick={exportSelected}>Export Selected</button>
</div>

<DataGrid
  {data}
  {columns}
  selectable="multiple"
  filterable
  getRowId={(row) => row.id}
  bind:this={gridComponent}
/>
```

## See also

- [Reference: DataGrid](./datagrid.md) - Component props
- [Reference: GridEngine](./grid-engine.md) - Full GridEngine API
- [How-to: Keyboard Navigation](../how-to/keyboard-navigation.md) - Navigation usage
- [How-to: Filtering](../how-to/filtering.md) - Filter usage
