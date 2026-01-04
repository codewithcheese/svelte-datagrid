# DataGrid Component Reference

The main data grid component.

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';
</script>

<DataGrid {data} {columns} />
```

## Props

### Data Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `TData[]` | Array of row data objects. Either `data` or `dataSource` must be provided. When `data` is provided, a `LocalDataSource` is created internally. |
| `dataSource` | `DataSource<TData>` | Custom DataSource for server-side data or advanced use cases. Either `data` or `dataSource` must be provided. |
| `columns` | `ColumnDef<TData>[]` | Column definitions (required) |

### Layout Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `number \| string` | `400` | Grid height. Number = px, string = CSS value |
| `width` | `number \| string` | `'100%'` | Grid width. Number = px, string = CSS value |
| `rowHeight` | `number` | `40` | Height of each data row in pixels |
| `headerHeight` | `number` | `48` | Height of the header row in pixels |
| `overscan` | `number` | `5` | Number of rows to render outside visible area |

### Feature Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectable` | `boolean \| 'single' \| 'multiple'` | `false` | Enable row selection |
| `filterable` | `boolean` | `false` | Show per-column filter inputs |
| `searchable` | `boolean` | `false` | Show global search bar |
| `resizable` | `boolean` | `false` | Enable column resizing |
| `reorderable` | `boolean` | `false` | Enable column reordering via drag-and-drop |
| `sortable` | `boolean` | `true` | Enable column sorting (can be overridden per-column) |
| `editable` | `boolean` | `false` | Enable cell editing (can be overridden per-column) |

### Auto-Save Behavior

When `editable` is enabled and the DataSource implements `MutableDataSource` (like `LocalDataSource`), edits are automatically persisted:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  // When you provide data, a LocalDataSource is created automatically
  // Edits will be auto-saved to this internal data source
  let data = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60, editable: false },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'email', header: 'Email', width: 200 }
  ];
</script>

<DataGrid
  {data}
  {columns}
  editable
  getRowId={(row) => row.id}
/>
```

### Identification Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `getRowId` | `(row: TData, index: number) => string \| number` | `(_, i) => i` | Function to get unique row identifier |

### State Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | `false` | Show loading indicator |
| `emptyMessage` | `string` | `'No data to display'` | Message when data is empty |
| `errorMessage` | `string \| undefined` | `undefined` | Error message (shows error state when set) |

### Styling Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | `''` | CSS class for grid container |
| `rowClass` | `string \| ((row: TData, index: number) => string)` | `undefined` | CSS class for data rows |

### Bindable Props

| Prop | Type | Description |
|------|------|-------------|
| `gridState` | `GridState` | Bind to access grid state API |

```svelte
<DataGrid {data} {columns} bind:gridState />

<script>
  let gridState;
  // Now you can call gridState.selectAll(), gridState.navigateToFirst(), etc.
</script>
```

## Events

### Selection Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onselectionchange` | `{ selected: Set, added: (string\|number)[], removed: (string\|number)[] }` | Selection changed |

```svelte
<DataGrid
  {data}
  {columns}
  selectable="multiple"
  onselectionchange={(e) => {
    console.log('Selected IDs:', e.selected);
    console.log('Added:', e.added);
    console.log('Removed:', e.removed);
  }}
/>
```

### Row/Cell Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onrowclick` | `{ row: TData, rowIndex: number, event: MouseEvent }` | Row clicked |
| `oncellclick` | `{ row: TData, column: ColumnDef, value: unknown, rowIndex: number, event: MouseEvent }` | Cell clicked |

```svelte
<DataGrid
  {data}
  {columns}
  oncellclick={(e) => console.log(`Clicked ${e.column.key}: ${e.value}`)}
/>
```

### Sort Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onSortChange` | `SortSpec[]` | Sort configuration changed |

```svelte
<DataGrid
  {data}
  {columns}
  onSortChange={(sort) => {
    console.log('Sort:', sort);
    // [{ field: 'name', direction: 'asc' }]
  }}
/>
```

### Edit Events

| Event | Payload | Description |
|-------|---------|-------------|
| `oncelledit` | `GridCellEditEvent<TData>` | Cell value was edited |
| `oncellvalidate` | `(rowId, columnKey, value) => string \| null` | Validate cell value before commit |

```svelte
<DataGrid
  {data}
  {columns}
  editable
  oncelledit={(e) => {
    console.log(`Edited ${e.columnKey}: ${e.oldValue} -> ${e.newValue}`);
    // Update your data source here
    updateRow(e.rowId, e.columnKey, e.newValue);
  }}
  oncellvalidate={(rowId, columnKey, value) => {
    // Return error message to prevent commit, or null to allow
    if (columnKey === 'email' && !value?.includes('@')) {
      return 'Invalid email address';
    }
    return null;
  }}
/>
```

### Column Events

| Event | Payload | Description |
|-------|---------|-------------|
| `oncolumnresize` | `{ column: string, width: number }` | Column resized |

## Snippets

Override default displays with snippets:

### loadingSnippet

Custom loading indicator:

```svelte
<DataGrid {data} {columns} loading>
  {#snippet loadingSnippet()}
    <div class="spinner">Loading...</div>
  {/snippet}
</DataGrid>
```

### emptySnippet

Custom empty state:

```svelte
<DataGrid {data} {columns}>
  {#snippet emptySnippet()}
    <div class="empty">
      <p>No results found</p>
      <button onclick={clearFilters}>Clear Filters</button>
    </div>
  {/snippet}
</DataGrid>
```

### errorSnippet

Custom error display:

```svelte
<DataGrid {data} {columns} errorMessage={error}>
  {#snippet errorSnippet(message)}
    <div class="error">
      <h3>Error</h3>
      <p>{message}</p>
      <button onclick={retry}>Retry</button>
    </div>
  {/snippet}
</DataGrid>
```

## Accessibility

The component implements the ARIA grid pattern:

| Element | Attribute | Value |
|---------|-----------|-------|
| Container | `role` | `grid` |
| Container | `aria-rowcount` | Total row count |
| Container | `aria-colcount` | Column count |
| Header row | `role` | `row` |
| Header cells | `role` | `columnheader` |
| Body | `role` | `rowgroup` |
| Data rows | `role` | `row` |
| Data rows | `aria-rowindex` | Row position |
| Data cells | `role` | `gridcell` |
| Selected rows | `aria-selected` | `true` |

## Example

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  interface User {
    id: number;
    name: string;
    email: string;
    active: boolean;
  }

  const data: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
    { id: 2, name: 'Bob', email: 'bob@example.com', active: false }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'active', header: 'Active', width: 80 }
  ];

  let gridState;
  let selectedIds = new Set<number>();

  function handleSelection(event) {
    selectedIds = event.selected;
  }
</script>

<div style="height: 400px;">
  <DataGrid
    {data}
    {columns}
    selectable="multiple"
    filterable
    searchable
    resizable
    getRowId={(row) => row.id}
    onselectionchange={handleSelection}
    bind:gridState
  />
</div>

<p>Selected: {selectedIds.size} rows</p>
```

## See also

- [Column Definition](./column-definition.md) - Column configuration
- [Grid State](./grid-state.md) - State API
- [Tutorial: Getting Started](../tutorials/getting-started.md) - Basic usage
