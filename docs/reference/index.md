# Reference

Reference documentation is **information-oriented** technical descriptions of the software and how to operate it. Use it to look up specific details about APIs, props, types, and configuration options.

## Who is reference documentation for?

Reference documentation is for developers who **already know what they're looking for**. If you need to know the exact name of a prop, the type of a parameter, or the list of available options, you're in the right place.

## What makes good reference documentation?

- **Accurate**: Matches the actual implementation
- **Complete**: Covers every prop, method, and type
- **Consistent**: Same structure for similar things
- **Terse**: Descriptions are concise and precise

---

## Component Reference

| Document | Description |
|----------|-------------|
| [DataGrid](./datagrid.md) | Main component props, events, and snippets |
| [Column Definition](./column-definition.md) | Column configuration options |

## State & API Reference

| Document | Description |
|----------|-------------|
| [Grid State](./grid-state.md) | State management API and methods |
| [Data Sources](./data-sources.md) | DataSource interface and built-in sources |

## Type Reference

| Document | Description |
|----------|-------------|
| [Types](./types.md) | TypeScript type definitions |
| [Filter Operators](./filter-operators.md) | Available filter operators |

## Styling Reference

| Document | Description |
|----------|-------------|
| [CSS Variables](./css-variables.md) | Theming tokens and defaults |

## Performance Reference

| Document | Description |
|----------|-------------|
| [Benchmarks](./benchmarks.md) | Performance targets and benchmarks |

---

## Quick lookup

### Common props

```typescript
<DataGrid
  data={TData[]}           // Required - array of row data
  columns={ColumnDef[]}    // Required - column definitions
  height={400}             // Grid height (px or CSS)
  rowHeight={40}           // Row height in px
  headerHeight={48}        // Header height in px
  selectable="multiple"    // Selection mode
  filterable              // Enable column filters
  searchable             // Enable global search
  resizable              // Enable column resizing
/>
```

### Column definition

```typescript
{
  key: 'fieldName',        // Required - data property
  header: 'Display Name',  // Required - column header text
  width: 150,              // Column width in px
  minWidth: 50,            // Minimum resize width
  maxWidth: 500,           // Maximum resize width
  align: 'left',           // 'left' | 'center' | 'right'
  sortable: true,          // Enable sorting
  filterable: true,        // Enable filtering
  resizable: true,         // Enable resizing
  filterType: 'text',      // Filter input type
}
```

### Grid state methods

```typescript
// Selection
gridState.selectRow(rowId, mode?)      // mode: 'toggle'|'add'|'remove'|'set'
gridState.selectRange(targetRowId)     // Range from lastSelectedRowId
gridState.selectAll()
gridState.clearSelection()

// Navigation
gridState.navigateRow(offset, select?) // Move by offset rows
gridState.navigateToFirst(select?)
gridState.navigateToLast(select?)
gridState.navigateByPage('up'|'down', select?)

// Filtering
gridState.setFilter(columnKey, value, operator?)
gridState.clearFilters()               // Clear all filters
gridState.setGlobalSearch(term)
gridState.clearGlobalSearch()

// Columns
gridState.setColumnVisibility(columnKey, visible)
gridState.setColumnWidth(columnKey, width)
gridState.setColumnPinned(columnKey, 'left'|'right'|false)
```
