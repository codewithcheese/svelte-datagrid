---
title: Grid State
---

# Grid State Reference

The grid state object provides programmatic access to grid data, selection, navigation, and configuration.

## Accessing Grid State

Bind to `gridState` to access the API:

```svelte
<script>
  let gridState;
</script>

<DataGrid {data} {columns} bind:gridState />

<button onclick={() => gridState.selectAll()}>
  Select All
</button>
```

## Properties

### Data Properties

| Property | Type | Description |
|----------|------|-------------|
| `rows` | `TData[]` | Current data from DataSource (after sort/filter) |
| `totalRowCount` | `number` | Total row count from DataSource |
| `visibleRows` | `TData[]` | Currently visible (virtualized) rows |
| `visibleRange` | `{ startIndex: number, endIndex: number }` | Visible row indices |
| `isLoading` | `boolean` | Whether data is being fetched |
| `queryError` | `string \| null` | Error message from last query |

### Column Properties

| Property | Type | Description |
|----------|------|-------------|
| `columns` | `ColumnDef[]` | Column definitions |
| `visibleColumns` | `ColumnDef[]` | Visible columns only |
| `columnOrder` | `string[]` | Current column order (array of column keys) |
| `columnWidths` | `Map<string, number>` | Current column widths |
| `pinnedLeftColumns` | `ColumnDef[]` | Columns pinned to the left |
| `pinnedRightColumns` | `ColumnDef[]` | Columns pinned to the right |

### Selection Properties

| Property | Type | Description |
|----------|------|-------------|
| `selectedIds` | `Set<string \| number>` | Selected row IDs |
| `focusedRowId` | `string \| number \| null` | Currently focused row ID |
| `focusedRowIndex` | `number` | Currently focused row index (-1 if none) |

### Sort Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentSort` | `SortSpec[]` | Current sort configuration |

### Filter Properties

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `Map<string, FilterValue>` | Column filters |
| `globalSearchTerm` | `string` | Global search term |

---

## Selection API

### selectRow(rowId, options?)

Select a single row.

```typescript
gridState.selectRow('row-1');

// Options
gridState.selectRow('row-1', {
  toggle: true,      // Toggle instead of select
  extend: true,      // Add to selection (don't clear)
  range: true        // Select range from last selected
});
```

### selectRange(startId, endId)

Select a range of rows.

```typescript
gridState.selectRange('row-1', 'row-5');
```

### selectAll()

Select all rows.

```typescript
gridState.selectAll();
```

### clearSelection()

Clear all selection.

```typescript
gridState.clearSelection();
```

### isRowSelected(rowId)

Check if a row is selected.

```typescript
const selected = gridState.isRowSelected('row-1'); // boolean
```

---

## Navigation API

### navigateRow(index)

Navigate to a specific row by index.

```typescript
gridState.navigateRow(50); // Go to row 50
```

### navigateToFirst()

Navigate to the first row.

```typescript
gridState.navigateToFirst();
```

### navigateToLast()

Navigate to the last row.

```typescript
gridState.navigateToLast();
```

### navigateByPage(direction)

Navigate by one page.

```typescript
gridState.navigateByPage(1);  // Page down
gridState.navigateByPage(-1); // Page up
```

---

## Filter API

### setFilter(columnKey, value, operator?)

Set a filter for a column.

```typescript
// Simple contains filter
gridState.setFilter('name', 'john');

// With specific operator
gridState.setFilter('age', 21, 'gte');
gridState.setFilter('status', 'active', 'eq');

// Clear a filter
gridState.setFilter('name', '');
```

### clearFilters()

Clear all column filters.

```typescript
gridState.clearFilters();
```

### setGlobalSearch(term)

Set the global search term.

```typescript
gridState.setGlobalSearch('search text');
```

### clearGlobalSearch()

Clear the global search.

```typescript
gridState.clearGlobalSearch();
```

---

## Column API

### setColumnVisibility(column, visible)

Show or hide a column.

```typescript
gridState.setColumnVisibility('email', false); // Hide
gridState.setColumnVisibility('email', true);  // Show
```

### setColumnWidth(column, width)

Set a column's width.

```typescript
gridState.setColumnWidth('name', 250);
```

### getColumnWidth(column)

Get a column's current width.

```typescript
const width = gridState.getColumnWidth('name'); // number
```

### autoSizeColumn(columnKey, options?)

Auto-size a column to fit its content.

```typescript
gridState.autoSizeColumn('name');

// With options
gridState.autoSizeColumn('name', {
  includeHeader: true,
  maxWidth: 400,
  sampleSize: 100
});
```

### autoSizeAllColumns(options?)

Auto-size all visible columns.

```typescript
gridState.autoSizeAllColumns();
```

### setColumnPinned(columnKey, pinned)

Pin a column to the left or right edge.

```typescript
gridState.setColumnPinned('id', 'left');
gridState.setColumnPinned('actions', 'right');
gridState.setColumnPinned('id', false); // Unpin
```

### reorderColumn(columnKey, targetIndex)

Move a column to a new position.

```typescript
gridState.reorderColumn('email', 0);
```

---

## Sort API

### setSort(columnKey, direction, multiSort?)

Set the sort for a column.

```typescript
gridState.setSort('name', 'asc');
gridState.setSort('name', null); // Clear
gridState.setSort('name', 'asc', true); // Multi-sort
```

### toggleSort(columnKey, multiSort?)

Toggle sort direction (asc → desc → none).

```typescript
gridState.toggleSort('name');
```

---

## Scroll API

### scrollToRow(index)

Scroll to bring a row into view.

```typescript
gridState.scrollToRow(100);
```

### scrollToTop()

Scroll to the top.

```typescript
gridState.scrollToTop();
```

### scrollToBottom()

Scroll to the bottom.

```typescript
gridState.scrollToBottom();
```

---

## Data Management API

### refresh()

Force refresh data from the DataSource.

```typescript
await gridState.refresh();
```

### waitForData()

Wait for any pending data fetch to complete.

```typescript
await gridState.waitForData();
```

---

## Example Usage

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [/* ... */];
  const columns = [/* ... */];

  let gridState;

  function selectActiveUsers() {
    gridState.clearSelection();
    data
      .filter(row => row.active)
      .forEach(row => gridState.selectRow(row.id, { extend: true }));
  }

  function filterHighValue() {
    gridState.setFilter('value', 1000, 'gte');
  }

  function exportSelected() {
    const selectedData = data.filter(row =>
      gridState.selectedIds.has(row.id)
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
  bind:gridState
/>
```

## See also

- [Reference: DataGrid](/docs/reference/datagrid) - Component props
- [How-to: Keyboard Navigation](/docs/how-to/keyboard-navigation) - Navigation usage
- [How-to: Filtering](/docs/how-to/filtering) - Filter usage
