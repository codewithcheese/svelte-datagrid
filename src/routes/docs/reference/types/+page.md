---
title: Types
---

# TypeScript Types Reference

Svelte DataGrid is fully typed with TypeScript. All types are exported from the main package.

## Import Types

```typescript
import type {
  ColumnDef,
  DataGridProps,
  GridState,
  DataSource,
  GridQueryRequest,
  GridQueryResponse,
  SortSpec,
  FilterSpec,
  SelectionEvent
} from 'svelte-datagrid';
```

## Core Types

### ColumnDef

Column definition type. See [Column Definition Reference](/docs/reference/column-definition) for details.

```typescript
interface ColumnDef<TData, TValue = unknown> {
  key: keyof TData | string;
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  editable?: boolean;
  visible?: boolean;
  pinned?: 'left' | 'right' | false;
  filterType?: 'text' | 'number' | 'date' | 'boolean' | 'select';
  filterOptions?: string[];
  headerClass?: string;
  cellClass?: string | ((row: TData, value: TValue) => string);
  render?: (value: TValue, row: TData, index: number) => unknown;
}
```

### SortSpec

Sort configuration.

```typescript
interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}
```

### FilterSpec

Filter configuration.

```typescript
interface FilterSpec {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'in' | 'between' | 'isNull';
```

## Event Types

### SelectionEvent

Emitted when selection changes.

```typescript
interface SelectionEvent<TId = string | number> {
  selected: Set<TId>;
  added: TId[];
  removed: TId[];
}
```

### GridCellClickEvent

Emitted when a cell is clicked.

```typescript
interface GridCellClickEvent<TData> {
  row: TData;
  rowIndex: number;
  column: ColumnDef<TData>;
  value: unknown;
  event: MouseEvent;
}
```

### GridRowClickEvent

Emitted when a row is clicked.

```typescript
interface GridRowClickEvent<TData> {
  row: TData;
  rowIndex: number;
  event: MouseEvent;
}
```

### GridCellEditEvent

Emitted when a cell is edited.

```typescript
interface GridCellEditEvent<TData> {
  row: TData;
  rowIndex: number;
  rowId: string | number;
  column: ColumnDef<TData>;
  columnKey: string;
  oldValue: unknown;
  newValue: unknown;
}
```

## Data Source Types

### DataSource

Base data source interface.

```typescript
interface DataSource<TData> {
  name: string;
  capabilities: DataSourceCapabilities;
  getRows(request: GridQueryRequest): Promise<GridQueryResult<TData>>;
}
```

### MutableDataSource

Data source that supports mutations.

```typescript
interface MutableDataSource<TData> extends DataSource<TData> {
  updateRow(
    rowId: string | number,
    columnKey: string,
    value: unknown
  ): Promise<{ success: true } | { success: false; error: string }>;
}
```

### GridQueryRequest

Request sent to the data source.

```typescript
interface GridQueryRequest {
  version: number;
  requestId: string;
  pagination: PaginationRequest;
  sort?: SortSpec[];
  filters?: FilterSpec[];
  search?: SearchSpec;
}

interface PaginationRequest {
  type: 'offset' | 'cursor' | 'range';
  offset?: number;
  limit?: number;
  cursor?: string;
  startIndex?: number;
  endIndex?: number;
}

interface SearchSpec {
  query: string;
  fields?: string[];
}
```

### GridQueryResult

Response from the data source.

```typescript
type GridQueryResult<TData> =
  | { success: true; data: GridQueryResponse<TData> }
  | { success: false; error: { message: string } };

interface GridQueryResponse<TData> {
  rows: TData[];
  rowCount?: number;
  hasMore?: boolean;
}
```

### DataSourceCapabilities

Describes data source capabilities.

```typescript
interface DataSourceCapabilities {
  pagination: {
    offset: boolean;
    cursor: boolean;
    range: boolean;
  };
  sort: {
    enabled: boolean;
    multiColumn: boolean;
  };
  filter: {
    enabled: boolean;
    operators: FilterOperator[];
  };
  search: {
    enabled: boolean;
  };
  rowCount: boolean;
}
```

## Utility Types

### GetRowIdFn

Function to extract row ID.

```typescript
type GetRowIdFn<TData> = (row: TData, index: number) => string | number;
```

### RowClassFn

Function to compute row class.

```typescript
type RowClassFn<TData> = (row: TData, index: number) => string;
```

### CellValidateFn

Function to validate cell values.

```typescript
type CellValidateFn = (
  rowId: string | number,
  columnKey: string,
  value: unknown
) => string | null;
```

## Generic Type Patterns

### Typed Grid

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

const columns: ColumnDef<User>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' }
];

// Type-safe - 'key' must be keyof User or string
```

### Type-safe Event Handlers

```typescript
function handleCellClick(event: GridCellClickEvent<User>) {
  // event.row is typed as User
  console.log(event.row.name);
}

function handleEdit(event: GridCellEditEvent<User>) {
  // event.row is typed as User
  // event.columnKey is string
}
```

## See also

- [Reference: DataGrid](/docs/reference/datagrid) - Component props
- [Reference: Column Definition](/docs/reference/column-definition) - Column types
- [Reference: Data Sources](/docs/reference/data-sources) - DataSource types
