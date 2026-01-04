---
title: Cell Editing
---

# How to Enable Cell Editing

This guide shows you how to enable inline cell editing in your DataGrid.

## Basic Editing

Enable editing with the `editable` prop:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  let data = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'email', header: 'Email', width: 200 }
  ];
</script>

<DataGrid {data} {columns} editable />
```

With editing enabled:
- **Double-click** a cell to start editing
- Press **Enter** to save changes
- Press **Escape** to cancel editing
- Press **F2** to edit the focused cell (Excel-like)

## Auto-Save Behavior

When you provide a `data` array, the grid creates a `LocalDataSource` internally. Since `LocalDataSource` implements `MutableDataSource`, edits are automatically persisted:

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  let data = $state([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ]);

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

With auto-save:
- Edits are automatically persisted through the DataSource
- A spinner shows while saving
- Errors from the DataSource are displayed in the cell
- The cell remains editable if saving fails
- The `oncelledit` callback is still called for notification

## Handling Edit Events

Use `oncelledit` to respond when a cell value changes:

```svelte
<script>
  function handleEdit(event) {
    const { rowId, columnKey, oldValue, newValue, row } = event;

    // Update your data source
    data = data.map(item =>
      item.id === rowId
        ? { ...item, [columnKey]: newValue }
        : item
    );

    // Or send to an API
    await api.updateRecord(rowId, { [columnKey]: newValue });
  }
</script>

<DataGrid
  {data}
  {columns}
  editable
  oncelledit={handleEdit}
/>
```

The `GridCellEditEvent` contains:
- `row` - The full row data object
- `rowIndex` - Index in the current view
- `rowId` - Unique row identifier
- `column` - Column definition
- `columnKey` - Column key
- `oldValue` - Value before editing
- `newValue` - New value after editing

## Validation

Use `oncellvalidate` to validate input before it's saved:

```svelte
<script>
  function validateCell(rowId, columnKey, value) {
    // Validate email format
    if (columnKey === 'email') {
      if (!value || !value.includes('@')) {
        return 'Please enter a valid email address';
      }
    }

    // Validate name length
    if (columnKey === 'name') {
      if (!value || value.trim().length < 2) {
        return 'Name must be at least 2 characters';
      }
    }

    // Return null to allow the change
    return null;
  }
</script>

<DataGrid
  {data}
  {columns}
  editable
  oncellvalidate={validateCell}
/>
```

When validation fails:
- The error message appears below the input
- The cell remains in edit mode
- The user can fix the value or press Escape to cancel

## Making Specific Columns Read-Only

Use `editable: false` on column definitions to prevent editing specific columns:

```svelte
<script>
  const columns = [
    { key: 'id', header: 'ID', width: 60, editable: false },     // Read-only
    { key: 'createdAt', header: 'Created', editable: false },    // Read-only
    { key: 'name', header: 'Name', width: 150 },                 // Editable
    { key: 'email', header: 'Email', width: 200 }                // Editable
  ];
</script>

<DataGrid {data} {columns} editable />
```

## Numeric Columns

Columns with `filterType: 'number'` or numeric values automatically use a number editor:

```svelte
<script>
  const columns = [
    { key: 'id', header: 'ID', editable: false },
    { key: 'name', header: 'Name' },
    { key: 'price', header: 'Price', filterType: 'number', align: 'right' },
    { key: 'quantity', header: 'Qty', filterType: 'number', align: 'right' }
  ];
</script>

<DataGrid {data} {columns} editable />
```

The number editor supports:
- Arrow Up/Down to increment/decrement
- Tab to commit and move to next cell
- Decimal input with `inputmode="decimal"`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Double-click | Start editing |
| F2 | Start editing focused cell |
| Enter | Commit changes |
| Escape | Cancel editing |
| Tab | Commit and move to next cell |

## Complete Example

```svelte
<script>
  import { DataGrid } from 'svelte-datagrid';

  let data = $state([
    { id: 1, name: 'Alice', email: 'alice@example.com', salary: 50000 },
    { id: 2, name: 'Bob', email: 'bob@example.com', salary: 60000 }
  ]);

  const columns = [
    { key: 'id', header: 'ID', width: 60, editable: false },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'salary', header: 'Salary', width: 100, filterType: 'number', align: 'right' }
  ];

  function handleEdit({ rowId, columnKey, newValue }) {
    data = data.map(row =>
      row.id === rowId ? { ...row, [columnKey]: newValue } : row
    );
  }

  function validate(rowId, columnKey, value) {
    if (columnKey === 'email' && !value?.includes('@')) {
      return 'Invalid email';
    }
    if (columnKey === 'salary' && (value < 0 || value > 1000000)) {
      return 'Salary must be between 0 and 1,000,000';
    }
    return null;
  }
</script>

<DataGrid
  {data}
  {columns}
  editable
  selectable
  getRowId={(row) => row.id}
  oncelledit={handleEdit}
  oncellvalidate={validate}
/>
```

## See Also

- [Reference: DataGrid](/docs/reference/datagrid) - All DataGrid props
- [Reference: Column Definition](/docs/reference/column-definition) - Column options
- [How-to: Keyboard Navigation](/docs/how-to/keyboard-navigation) - Keyboard controls
