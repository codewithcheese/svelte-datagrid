# GridEngine Reference

The GridEngine is a pure TypeScript implementation of the grid rendering logic. It can be used directly for advanced use cases or wrapped by UI frameworks.

## DataGrid Component

The recommended way to use GridEngine is through the DataGrid Svelte component:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';
</script>

<DataGrid {data} {columns} />
```

This is a lightweight wrapper around GridEngine that handles lifecycle management and Svelte integration.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `TData[]` | - | Array of row data objects |
| `dataSource` | `DataSource<TData>` | - | Custom DataSource for data fetching |
| `columns` | `ColumnDef<TData>[]` | required | Column definitions |
| `height` | `number \| string` | `400` | Grid height |
| `width` | `number \| string` | `'100%'` | Grid width |
| `rowHeight` | `number` | `40` | Row height in pixels |
| `headerHeight` | `number` | `48` | Header height in pixels |
| `overscan` | `number` | `5` | Rows to render outside viewport |
| `sortable` | `boolean` | `true` | Enable column sorting |
| `filterable` | `boolean` | `false` | Enable column filtering |
| `searchable` | `boolean` | `false` | Enable global search |
| `resizable` | `boolean` | `true` | Enable column resizing |
| `reorderable` | `boolean` | `false` | Enable column reordering |
| `selectable` | `boolean \| 'single' \| 'multiple'` | `false` | Enable row selection |
| `editable` | `boolean` | `false` | Enable cell editing |
| `getRowId` | `(row, index) => string \| number` | index-based | Row ID function |
| `class` | `string` | `''` | CSS class for container |
| `rowClass` | `string \| function` | - | CSS class for rows |
| `loading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | `'No data to display'` | Empty state message |
| `errorMessage` | `string` | - | Error message to display |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `oncellclick` | `GridCellClickEvent` | Cell was clicked |
| `onrowclick` | `GridRowClickEvent` | Row was clicked |
| `onsortchange` | `GridSortEvent` | Sort state changed |
| `onselectionchange` | `GridSelectionChangeEvent` | Selection changed |
| `oncelledit` | `GridCellEditEvent` | Cell edit completed |

### Snippets

| Snippet | Parameters | Description |
|---------|------------|-------------|
| `loadingSnippet` | - | Custom loading indicator |
| `emptySnippet` | - | Custom empty state |
| `errorSnippet` | `error: string` | Custom error display |

## Using GridEngine Directly

For advanced use cases (custom frameworks, Web Components, etc.), you can use GridEngine directly:

```typescript
import { GridEngine, createGridEngine } from 'svelte-datagrid';

// Create a container element
const container = document.getElementById('grid-container');

// Initialize the engine
const engine = createGridEngine(container, {
  data: myData,
  columns: myColumns,
  rowHeight: 40,
  headerHeight: 48,
  sortable: true,
  resizable: true,
  onSortChange: (sort) => console.log('Sort changed:', sort),
  onSelectionChange: (selected) => console.log('Selection:', selected)
});

// Use the API
engine.selectRow('row-1');
engine.setSort('name', 'asc');
engine.scrollToRow(50);

// Cleanup when done
engine.destroy();
```

### GridEngineOptions

| Option | Type | Description |
|--------|------|-------------|
| `data` | `TData[]` | Initial row data |
| `dataSource` | `DataSource<TData>` | Data source for fetching |
| `columns` | `ColumnDef<TData>[]` | Column definitions (required) |
| `getRowId` | `function` | Row ID function |
| `rowHeight` | `number` | Row height (default: 40) |
| `headerHeight` | `number` | Header height (default: 48) |
| `overscan` | `number` | Overscan rows (default: 5) |
| `sortable` | `boolean` | Enable sorting |
| `filterable` | `boolean` | Enable filtering |
| `searchable` | `boolean` | Enable search |
| `resizable` | `boolean` | Enable column resize |
| `reorderable` | `boolean` | Enable column reorder |
| `selectable` | `boolean \| 'single' \| 'multiple'` | Selection mode |
| `editable` | `boolean` | Enable editing |
| `onCellClick` | `function` | Cell click callback |
| `onRowClick` | `function` | Row click callback |
| `onSortChange` | `function` | Sort change callback |
| `onSelectionChange` | `function` | Selection change callback |
| `onCellEdit` | `function` | Cell edit callback |
| `onCellValidate` | `function` | Cell validation callback |
| `cellRenderer` | `function` | Custom cell renderer |
| `headerRenderer` | `function` | Custom header renderer |
| `rowClass` | `string \| function` | Row CSS class |

### GridEngine API

#### Data

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `rows` | `TData[]` | Current row data |
| `totalRowCount` | `number` | Total number of rows |
| `isLoading` | `boolean` | Loading state |
| `queryError` | `string \| null` | Last error from DataSource query |
| `updateData(data)` | `void` | Update row data |
| `refresh()` | `Promise<void>` | Refresh from DataSource |
| `waitForData()` | `Promise<void>` | Wait for pending data fetch to complete |

#### Selection

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `selectedIds` | `Set<string \| number>` | Selected row IDs |
| `selectRow(id, mode)` | `void` | Select a row |
| `selectRange(targetId)` | `void` | Select range to target |
| `selectAll()` | `void` | Select all rows |
| `clearSelection()` | `void` | Clear selection |
| `isRowSelected(id)` | `boolean` | Check if row is selected |

#### Navigation

| Method | Parameters | Description |
|--------|------------|-------------|
| `navigateRow(offset, select?, extend?)` | number, boolean?, boolean? | Navigate by offset |
| `navigateToFirst(select?)` | boolean? | Navigate to first row |
| `navigateToLast(select?)` | boolean? | Navigate to last row |
| `navigateByPage(direction, select?)` | 'up' \| 'down', boolean? | Navigate by page |
| `scrollToRow(index)` | number | Scroll to row index |

#### Sorting & Filtering

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `sortState` | `SortState[]` | Current sort configuration |
| `filterState` | `FilterState[]` | Current filter configuration |
| `globalSearchTerm` | `string` | Current global search term |
| `setSort(key, direction, multi?)` | `void` | Set sort for a column |
| `toggleSort(key, multi?)` | `void` | Toggle sort direction (asc → desc → none) |
| `setFilter(key, value, operator?)` | `void` | Set column filter |
| `clearFilters()` | `void` | Clear all filters |
| `setGlobalSearch(term)` | `void` | Set global search term |
| `clearGlobalSearch()` | `void` | Clear global search term |

#### Columns

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `visibleColumns` | `ColumnDef<TData>[]` | Visible column definitions |
| `columnWidths` | `Map<string, number>` | Column widths |
| `columnOrder` | `string[]` | Column keys in display order |
| `hiddenColumns` | `Set<string>` | Set of hidden column keys |
| `setColumnWidth(key, width)` | `void` | Set column width |
| `setColumnVisibility(key, visible)` | `void` | Show/hide column |
| `setColumnPinned(key, pinned)` | `void` | Pin column ('left', 'right', or false to unpin) |
| `reorderColumn(key, targetIndex)` | `void` | Move column to new position |
| `autoSizeColumn(key, options?)` | `void` | Auto-size column based on content |
| `autoSizeAllColumns(options?)` | `void` | Auto-size all visible columns |

#### Editing

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `editState` | `EditState \| null` | Current edit state |
| `startEdit(rowId, columnKey)` | `boolean` | Start editing cell |
| `commitEdit()` | `Promise<boolean>` | Commit current edit |
| `cancelEdit()` | `void` | Cancel current edit |
| `hasActiveEdit()` | `boolean` | Check if any cell is being edited |
| `isEditing(rowId, columnKey)` | `boolean` | Check if specific cell is being edited |

#### Focus

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `focusedRowId` | `string \| number \| null` | Currently focused row ID |
| `focusedColumnKey` | `string \| null` | Currently focused column key |
| `focusedRowIndex` | `number` | Currently focused row index (-1 if none) |
| `setFocus(rowId, columnKey)` | `void` | Programmatically set focus |

#### Scroll

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `scrollTop` | `number` | Current vertical scroll position |
| `scrollLeft` | `number` | Current horizontal scroll position |
| `setScroll(scrollTop, scrollLeft)` | `void` | Set scroll position |

#### Lifecycle

| Method | Description |
|--------|-------------|
| `updateOptions(options)` | Update engine options |
| `destroy()` | Clean up resources |

#### Advanced

| Method | Type | Description |
|--------|------|-------------|
| `getStateManager()` | `StateManager<TData>` | Access low-level StateManager (for advanced use) |

## Architecture

GridEngine is composed of several subsystems:

- **StateManager**: Manages all grid state (data, selection, sort, filter, etc.)
- **BodyRenderer**: Renders grid body with DOM pooling for virtualization
- **HeaderRenderer**: Renders column headers with sort indicators
- **EventManager**: Handles event delegation for clicks, keyboard, touch
- **EditorManager**: Manages cell editor lifecycle

These are automatically coordinated by GridEngine. For most use cases, you don't need to interact with them directly.

## When to Use GridEngine vs DataGrid

| Use Case | Recommendation |
|----------|---------------|
| Standard Svelte app | Use `DataGrid` component |
| Building custom wrapper | Use `GridEngine` directly |
| Non-Svelte environment | Use `GridEngine` directly |
| Server-side rendering | Use `DataGrid` with dataSource |
