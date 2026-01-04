# Types Reference

TypeScript type definitions for Svelte DataGrid.

## Column Types

### ColumnDef

Column definition interface.

```typescript
interface ColumnDef<TData = unknown, TValue = unknown> {
  /** Unique column identifier */
  key: string;

  /** Display header text */
  header: string;

  /** Accessor function or key path for cell value */
  accessor?: keyof TData | ((row: TData) => TValue);

  /** Initial width in pixels */
  width?: number;

  /** Minimum width for resizing */
  minWidth?: number;

  /** Maximum width for resizing */
  maxWidth?: number;

  /** Enable/disable sorting for this column */
  sortable?: boolean;

  /** Custom sort comparator */
  sortFn?: (a: TValue, b: TValue) => number;

  /** Enable/disable filtering */
  filterable?: boolean;

  /** Filter type */
  filterType?: 'text' | 'number' | 'date' | 'select' | 'boolean';

  /** Custom filter function */
  filterFn?: (value: TValue, filterValue: unknown) => boolean;

  /** Cell alignment */
  align?: ColumnAlign;

  /** Pin column to left/right edge */
  pinned?: ColumnPinning;

  /** Enable/disable column reordering */
  reorderable?: boolean;

  /** Enable cell editing */
  editable?: boolean;

  /** Custom cell renderer component */
  cellRenderer?: Component<{ value: TValue; row: TData; column: ColumnDef<TData, TValue> }>;

  /** Value formatter for display */
  formatter?: (value: TValue) => string;

  /** Cell CSS class */
  cellClass?: string | ((row: TData, value: TValue) => string);

  /** Header CSS class */
  headerClass?: string;
}
```

### ColumnAlign

```typescript
type ColumnAlign = 'left' | 'center' | 'right';
```

### ColumnPinning

```typescript
type ColumnPinning = 'left' | 'right' | false;
```

### SortDirection

```typescript
type SortDirection = 'asc' | 'desc' | null;
```

---

## State Types

### SortState

```typescript
interface SortState {
  columnKey: string;
  direction: SortDirection;
}
```

### FilterState

```typescript
interface FilterState {
  columnKey: string;
  value: unknown;
  operator: FilterOperator;
}
```

### FilterOperator

```typescript
type FilterOperator =
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'lt'        // less than
  | 'gte'       // greater than or equal
  | 'lte'       // less than or equal
  | 'contains'  // string contains
  | 'startsWith' // string starts with
  | 'endsWith'; // string ends with
```

### SelectionMode

```typescript
type SelectionMode = 'none' | 'single' | 'multiple';
```

### ViewportState

```typescript
interface ViewportState {
  scrollTop: number;
  scrollLeft: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  containerWidth: number;
  containerHeight: number;
}
```

---

## Event Types

### GridCellClickEvent

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

```typescript
interface GridRowClickEvent<TData> {
  row: TData;
  rowIndex: number;
  event: MouseEvent;
}
```

### GridSortEvent

```typescript
interface GridSortEvent {
  columnKey: string;
  direction: 'asc' | 'desc';
  multiSort: boolean;
}
```

### GridSelectionChangeEvent

```typescript
interface GridSelectionChangeEvent {
  selected: Set<string | number>;
  added: (string | number)[];
  removed: (string | number)[];
}
```

### GridCellEditEvent

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

### GridColumnResizeEvent

```typescript
interface GridColumnResizeEvent {
  column: string;
  width: number;
}
```

---

## Query Types

### GridQueryRequest

```typescript
interface GridQueryRequest {
  version: 1;
  requestId: string;
  pagination: PaginationSpec;
  sort?: SortSpec[];
  filter?: FilterExpression;
  projection?: string[];
  requires?: ResponseRequirements;
  groupBy?: string[];
  search?: { query: string; fields?: string[] };
}
```

### FilterExpression

```typescript
type FilterExpression = FilterCondition | FilterGroup;

interface FilterCondition {
  type: 'condition';
  field: string;
  operator: ComparisonOperator | StringOperator;
  value: unknown;
  ignoreCase?: boolean;
}

interface FilterGroup {
  type: 'group';
  operator: 'and' | 'or' | 'not';
  conditions: FilterExpression[];
}
```

### SortSpec

```typescript
interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}
```

### PaginationSpec

```typescript
type PaginationSpec = OffsetPagination | CursorPagination | RangeWindow;

interface OffsetPagination {
  type: 'offset';
  offset: number;
  limit: number;
}

interface CursorPagination {
  type: 'cursor';
  cursor?: string;
  limit: number;
  direction?: 'forward' | 'backward';
}

interface RangeWindow {
  type: 'range';
  startRow: number;
  endRow: number;
}
```

---

## Utility Types

### GetRowId

```typescript
type GetRowId<TData> = (row: TData, index: number) => string | number;
```

### DataSourceResult

```typescript
type DataSourceResult<T> =
  | { success: true; data: T }
  | { success: false; error: DataSourceError };

interface DataSourceError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

---

## Imports

```typescript
// Component and props
import { DataGrid } from 'svelte-datagrid';
import type { DataGridProps } from 'svelte-datagrid';

// Column types
import type { ColumnDef, ColumnAlign, SortDirection } from 'svelte-datagrid';

// State types
import type { SortState, FilterState, FilterOperator, SelectionMode } from 'svelte-datagrid';

// Event types
import type {
  GridCellClickEvent,
  GridRowClickEvent,
  GridSortEvent,
  GridSelectionChangeEvent,
  GridCellEditEvent
} from 'svelte-datagrid';

// Query types
import type {
  GridQueryRequest,
  GridQueryResponse,
  FilterExpression,
  SortSpec,
  DataSource,
  MutableDataSource
} from 'svelte-datagrid';

// Data sources
import { createLocalDataSource, createPostgresDataSource } from 'svelte-datagrid';
```

---

## See also

- [Reference: DataGrid](./datagrid.md)
- [Reference: Column Definition](./column-definition.md)
- [Reference: Filter Operators](./filter-operators.md)
