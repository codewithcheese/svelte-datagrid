---
title: Column Definition
---

# Column Definition Reference

Column definitions configure how each column displays and behaves.

```typescript
import type { ColumnDef } from 'svelte-datagrid';

const columns: ColumnDef<MyRowType>[] = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 200 }
];
```

## Type Definition

```typescript
interface ColumnDef<TData, TValue = unknown> {
  // Required
  key: keyof TData | string;
  header: string;

  // Sizing
  width?: number;
  minWidth?: number;
  maxWidth?: number;

  // Display
  align?: 'left' | 'center' | 'right';
  headerClass?: string;
  cellClass?: string | ((row: TData, value: TValue) => string);

  // Features
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  visible?: boolean;
  pinned?: 'left' | 'right' | false;
  editable?: boolean;

  // Filtering
  filterType?: 'text' | 'number' | 'date' | 'boolean' | 'select';
  filterOptions?: string[];

  // Custom rendering
  render?: (value: TValue, row: TData, index: number) => unknown;
}
```

## Properties

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `key` | `keyof TData \| string` | Property name in row data, or dot-notation path (e.g., `'user.name'`) |
| `header` | `string` | Text displayed in column header |

### Sizing Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number` | `150` | Initial column width in pixels |
| `minWidth` | `number` | `50` | Minimum width when resizing |
| `maxWidth` | `number` | `undefined` | Maximum width when resizing (no limit if undefined) |

### Display Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment |
| `headerClass` | `string` | `undefined` | CSS class for header cell |
| `cellClass` | `string \| ((row, value) => string)` | `undefined` | CSS class for data cells |

### Feature Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sortable` | `boolean` | `true` | Enable sorting for this column |
| `filterable` | `boolean` | `true` | Enable filtering for this column |
| `resizable` | `boolean` | `true` | Enable resizing for this column |
| `reorderable` | `boolean` | `true` | Enable drag-and-drop reordering |
| `visible` | `boolean` | `true` | Column visibility |
| `pinned` | `'left' \| 'right' \| false` | `false` | Pin column to left or right edge |
| `editable` | `boolean` | `true` | Enable editing (requires grid `editable` prop) |

### Filter Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `filterType` | `'text' \| 'number' \| 'date' \| 'boolean' \| 'select'` | `'text'` | Type of filter input |
| `filterOptions` | `string[]` | `undefined` | Options for `select` filter type |

### Render Properties

| Property | Type | Description |
|----------|------|-------------|
| `render` | `(value, row, index) => unknown` | Custom render function |

## Examples

### Basic columns

```typescript
const columns = [
  { key: 'id', header: 'ID', width: 60, sortable: false },
  { key: 'name', header: 'Name', width: 200 },
  { key: 'email', header: 'Email', width: 250 }
];
```

### Numeric column

```typescript
{
  key: 'price',
  header: 'Price',
  width: 100,
  align: 'right',
  filterType: 'number',
  render: (value) => `$${value.toFixed(2)}`
}
```

### Boolean column

```typescript
{
  key: 'active',
  header: 'Active',
  width: 80,
  align: 'center',
  filterType: 'boolean',
  render: (value) => value ? '✓' : '✗'
}
```

### Date column

```typescript
{
  key: 'createdAt',
  header: 'Created',
  width: 120,
  filterType: 'date',
  render: (value) => new Date(value).toLocaleDateString()
}
```

### Select filter column

```typescript
{
  key: 'status',
  header: 'Status',
  width: 120,
  filterType: 'select',
  filterOptions: ['pending', 'active', 'completed', 'cancelled']
}
```

### Conditional styling

```typescript
{
  key: 'amount',
  header: 'Amount',
  width: 100,
  align: 'right',
  cellClass: (row, value) => {
    if (value > 1000) return 'amount-high';
    if (value < 0) return 'amount-negative';
    return '';
  }
}
```

### Nested property access

```typescript
const data = [
  { id: 1, user: { name: 'Alice', email: 'alice@example.com' } }
];

const columns = [
  { key: 'user.name', header: 'Name', width: 150 },
  { key: 'user.email', header: 'Email', width: 200 }
];
```

### Non-resizable fixed column

```typescript
{
  key: 'id',
  header: 'ID',
  width: 60,
  minWidth: 60,
  maxWidth: 60,
  resizable: false,
  sortable: false,
  filterable: false
}
```

### Editable columns with read-only ID

```typescript
const columns = [
  { key: 'id', header: 'ID', width: 60, editable: false },
  { key: 'name', header: 'Name', width: 200 },  // editable by default
  { key: 'email', header: 'Email', width: 250 } // editable by default
];
```

## Filter Types

| Type | Input | Matching |
|------|-------|----------|
| `text` | Text input | Case-insensitive contains |
| `number` | Number input | Exact match |
| `date` | Date picker | Date comparison |
| `boolean` | Yes/No/All dropdown | Boolean match |
| `select` | Dropdown with options | Exact match |

## See also

- [Reference: DataGrid](/docs/reference/datagrid) - Main component
- [Reference: Types](/docs/reference/types) - TypeScript definitions
- [How-to: Custom Cells](/docs/how-to/custom-cells) - Advanced rendering
