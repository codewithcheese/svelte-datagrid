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
| `data` | `TData[]` | Alias for `rows` (backwards compatibility) |
| `processedData` | `TData[]` | Alias for `rows` (backwards compatibility) |
| `totalRowCount` | `number` | Total row count from DataSource |
| `visibleRows` | `TData[]` | Currently visible (virtualized) rows |
| `visibleRange` | `{ startIndex: number, endIndex: number }` | Visible row indices |
| `isLoading` | `boolean` | Whether data is being fetched from DataSource |
| `queryError` | `string \| null` | Error message from last DataSource query |

### Column Properties

| Property | Type | Description |
|----------|------|-------------|
| `columns` | `ColumnDef[]` | Column definitions |
| `visibleColumns` | `ColumnDef[]` | Visible columns only |
| `columnOrder` | `string[]` | Current column order (array of column keys) |
| `columnWidths` | `Map<string, number>` | Current column widths |
| `pinnedLeftColumns` | `ColumnDef[]` | Columns pinned to the left edge |
| `pinnedRightColumns` | `ColumnDef[]` | Columns pinned to the right edge |
| `scrollableColumns` | `ColumnDef[]` | Non-pinned columns (scrollable area) |
| `pinnedLeftWidth` | `number` | Total width of left-pinned columns |
| `scrollableWidth` | `number` | Total width of scrollable columns |
| `totalWidth` | `number` | Total grid width |

### Selection Properties

| Property | Type | Description |
|----------|------|-------------|
| `selectedIds` | `Set<string \| number>` | Selected row IDs |
| `focusedRowId` | `string \| number \| null` | Currently focused row ID |
| `focusedRowIndex` | `number` | Currently focused row index (-1 if none) |
| `focusedColumnKey` | `string \| null` | Currently focused column key |
| `lastSelectedRowId` | `string \| number \| null` | Last selected row (for range selection) |

### Scroll Properties

| Property | Type | Description |
|----------|------|-------------|
| `scrollTop` | `number` | Current vertical scroll position |
| `scrollLeft` | `number` | Current horizontal scroll position |
| `offsetY` | `number` | Vertical offset for virtualization |
| `totalHeight` | `number` | Total scrollable height |

### Sort Properties

| Property | Type | Description |
|----------|------|-------------|
| `sortState` | `SortState[]` | Current sort configuration. Each item has `{ columnKey: string, direction: 'asc' \| 'desc' \| null }` |

### Filter Properties

| Property | Type | Description |
|----------|------|-------------|
| `filterState` | `FilterState[]` | Column filters. Each item has `{ columnKey: string, value: unknown, operator: FilterOperator }` |
| `globalSearchTerm` | `string` | Global search term |

---

## Selection API

### selectRow(rowId, mode?)

Select a single row.

```typescript
gridState.selectRow('row-1');

// With mode
gridState.selectRow('row-1', 'toggle');  // Toggle selection
gridState.selectRow('row-1', 'add');     // Add to selection
gridState.selectRow('row-1', 'remove');  // Remove from selection
gridState.selectRow('row-1', 'set');     // Clear others, select this one
```

### selectRange(targetRowId)

Select a range of rows from the last selected row to the target row.

```typescript
gridState.selectRange('row-5'); // Selects from lastSelectedRowId to 'row-5'
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

### navigateRow(offset, select?, extendSelection?)

Navigate by a number of rows relative to the current focused row.

```typescript
gridState.navigateRow(1);   // Move down one row
gridState.navigateRow(-1);  // Move up one row
gridState.navigateRow(5);   // Move down 5 rows

// With selection
gridState.navigateRow(1, true);        // Move down and select
gridState.navigateRow(1, true, true);  // Move down and extend selection (for Shift+Arrow)
```

### navigateToFirst(select?)

Navigate to the first row.

```typescript
gridState.navigateToFirst();
gridState.navigateToFirst(true); // Navigate and select
```

### navigateToLast(select?)

Navigate to the last row.

```typescript
gridState.navigateToLast();
gridState.navigateToLast(true); // Navigate and select
```

### navigateByPage(direction, select?)

Navigate by one page.

```typescript
gridState.navigateByPage('down');        // Page down
gridState.navigateByPage('up');          // Page up
gridState.navigateByPage('down', true);  // Page down and select
```

---

## Filter API

### setFilter(columnKey, value, operator?)

Set a filter for a column.

```typescript
// Simple contains filter (default operator)
gridState.setFilter('name', 'john');

// With specific operator
gridState.setFilter('age', 21, 'gte');
gridState.setFilter('status', 'active', 'eq');

// Clear a filter by passing empty value
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

### setColumnWidth(columnKey, width)

Set a column's width.

```typescript
gridState.setColumnWidth('name', 250);
```

### Getting column width

Use the `columnWidths` property (a Map) to get current widths:

```typescript
const width = gridState.columnWidths.get('name'); // number | undefined
```

### autoSizeColumn(columnKey, options?)

Auto-size a column to fit its content.

```typescript
// Basic auto-size
gridState.autoSizeColumn('name');

// With options
gridState.autoSizeColumn('name', {
  includeHeader: true,  // Include header text in sizing (default: true)
  maxWidth: 400,        // Maximum width constraint
  sampleSize: 100       // Number of rows to sample (default: 1000)
});
```

### autoSizeAllColumns(options?)

Auto-size all visible columns to fit their content.

```typescript
gridState.autoSizeAllColumns();
```

### setColumnPinned(columnKey, pinned)

Pin a column to the left or right edge, or unpin it.

```typescript
gridState.setColumnPinned('id', 'left');    // Pin to left
gridState.setColumnPinned('actions', 'right'); // Pin to right
gridState.setColumnPinned('id', false);     // Unpin
```

### reorderColumn(columnKey, targetIndex)

Move a column to a new position. Returns `true` if successful, `false` if the move was invalid (e.g., trying to move between pinned and unpinned sections).

```typescript
// Move 'email' column to be the first column (index 0)
const success = gridState.reorderColumn('email', 0);
```

---

## Sort API

### setSort(columnKey, direction, multiSort?)

Set the sort for a column.

```typescript
// Single column sort
gridState.setSort('name', 'asc');

// Clear sort for a column
gridState.setSort('name', null);

// Multi-column sort (add to existing sorts)
gridState.setSort('department', 'asc');
gridState.setSort('name', 'asc', true); // multiSort = true
```

### toggleSort(columnKey, multiSort?)

Toggle sort direction for a column (asc → desc → none).

```typescript
// Toggle single column
gridState.toggleSort('name');

// Toggle with multi-sort
gridState.toggleSort('name', true);
```

---

## Scroll API

### scrollToRow(index, align?)

Scroll to bring a row into view.

```typescript
gridState.scrollToRow(100);

// With alignment
gridState.scrollToRow(100, 'start');   // Align row to top
gridState.scrollToRow(100, 'center');  // Center row in viewport
gridState.scrollToRow(100, 'end');     // Align row to bottom
gridState.scrollToRow(100, 'nearest'); // Scroll minimum distance (default)
```

### Scrolling to top/bottom

Use `scrollToRow` with first or last index:

```typescript
gridState.scrollToRow(0);                          // Scroll to top
gridState.scrollToRow(gridState.totalRowCount - 1); // Scroll to bottom
```

### setScroll(top, left)

Set scroll position directly.

```typescript
gridState.setScroll(0, 0); // Scroll to top-left
```

---

## Utility Methods

### getRowId(row, index)

Get the ID for a row using the configured `getRowId` function.

```typescript
const id = gridState.getRowId(row, 0);
```

### Getting rows by index or ID

Use the `rows` property to access data:

```typescript
// Get row by index
const row = gridState.rows[50];

// Find row by ID
const row = gridState.rows.find((r, i) => gridState.getRowId(r, i) === 'row-1');
```

### setFocus(rowId, columnKey)

Set focus to a specific cell.

```typescript
gridState.setFocus('row-1', 'name');
gridState.setFocus('row-1', null); // Focus row only
gridState.setFocus(null, null);    // Clear focus
```

---

## Data Management API

### refresh()

Force refresh data from the DataSource. Returns a promise that resolves when complete.

```typescript
await gridState.refresh();
```

### waitForData()

Wait for any pending data fetch to complete. Useful for testing or ensuring data is loaded.

```typescript
await gridState.waitForData();
```

### updateData(newData)

Update the source data (only works when using the `data` prop, not an external DataSource).

```typescript
gridState.updateData(newData);
```

### updateColumns(newColumns)

Update the column definitions.

```typescript
gridState.updateColumns(newColumns);
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
    gridState.rows
      .filter(row => row.active)
      .forEach(row => gridState.selectRow(row.id, 'add'));
  }

  function filterHighValue() {
    gridState.setFilter('value', 1000, 'gte');
  }

  function exportSelected() {
    const selectedData = gridState.rows.filter(row =>
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

- [Reference: DataGrid](./datagrid.md) - Component props
- [How-to: Keyboard Navigation](../how-to/keyboard-navigation.md) - Navigation usage
- [How-to: Filtering](../how-to/filtering.md) - Filter usage
