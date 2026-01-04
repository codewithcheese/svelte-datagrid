# Data Sources Reference

Data sources provide data to the grid. The grid uses the `DataSource` interface to fetch, filter, sort, and paginate data from any backend.

## Overview

When you provide a `data` array to the grid, a `LocalDataSource` is created internally. For server-side data, you can provide your own `DataSource` implementation.

```typescript
// Option 1: Provide data array (LocalDataSource created internally)
<DataGrid data={myData} columns={columns} />

// Option 2: Provide custom DataSource
<DataGrid dataSource={myDataSource} columns={columns} />
```

## DataSource Interface

```typescript
interface DataSource<TRow = Record<string, unknown>> {
  /** Human-readable name for debugging */
  readonly name: string;

  /** What this data source can do */
  readonly capabilities: DataSourceCapabilities;

  /** Fetch rows matching the query */
  getRows(
    request: GridQueryRequest,
    signal?: AbortSignal
  ): Promise<DataSourceResult<GridQueryResponse<TRow>>>;

  /** Get distinct values for a field (optional) */
  getDistinctValues?(
    field: string,
    filter?: FilterExpression,
    signal?: AbortSignal
  ): Promise<DataSourceResult<unknown[]>>;

  /** Subscribe to data changes (optional) */
  subscribe?(callback: (event: DataChangeEvent<TRow>) => void): () => void;

  /** Dispose of resources (optional) */
  destroy?(): void;
}
```

## MutableDataSource Interface

For editable grids, implement `MutableDataSource`:

```typescript
interface MutableDataSource<TRow> extends DataSource<TRow> {
  /** Apply mutations to the data source */
  mutate(
    mutations: RowMutation<TRow>[],
    signal?: AbortSignal
  ): Promise<DataSourceResult<(string | number)[]>>;

  /** Validate mutations before applying (optional) */
  validate?(
    mutations: RowMutation<TRow>[]
  ): Promise<DataSourceResult<Record<number, string[]>>>;
}
```

---

## Built-in Data Sources

### LocalDataSource

In-memory data source for client-side operations.

```typescript
import { createLocalDataSource } from 'svelte-datagrid';

const dataSource = createLocalDataSource(data, 'id');
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `TRow[]` | Array of data rows |
| `idField` | `keyof TRow` | Field to use as row ID (optional) |

#### Features

- Sorting, filtering, and searching all performed client-side
- Implements `MutableDataSource` for auto-save editing
- Efficient for datasets up to ~100,000 rows

### PostgresDataSource

Data source for PostgreSQL databases. Works with any client that has a `query(sql, params)` method.

```typescript
import { createPostgresDataSource } from 'svelte-datagrid';

const dataSource = createPostgresDataSource({
  connection: pool,
  table: 'users',
  idColumn: 'id'
});
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `connection` | `PostgresConnection` | Database client with `query()` method |
| `table` | `string` | Table name |
| `idColumn` | `string` | Primary key column (default: `'id'`) |
| `columns` | `string[]` | Columns to select (optional, defaults to all) |

#### Compatible Clients

- `pg` (node-postgres)
- `@electric-sql/pglite`
- `@neondatabase/serverless`
- Any client with `query(sql: string, params: unknown[])` method

---

## GridQueryRequest

The request object sent to `getRows()`:

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

### Pagination Types

```typescript
// Range-based (for virtualization)
{ type: 'range', startRow: 0, endRow: 100 }

// Offset-based (traditional)
{ type: 'offset', offset: 0, limit: 50 }

// Cursor-based (for large datasets)
{ type: 'cursor', cursor: 'abc123', limit: 50 }
```

---

## GridQueryResponse

The response from `getRows()`:

```typescript
interface GridQueryResponse<TRow> {
  rows: TRow[];
  rowCount?: number;
  nextCursor?: string;
  prevCursor?: string;
  distinctValues?: Record<string, unknown[]>;
  meta?: ResponseMeta;
}
```

---

## DataSourceResult

All data source methods return a result type:

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

## Capabilities

Data sources declare their capabilities:

```typescript
interface DataSourceCapabilities {
  pagination: {
    offset?: boolean;
    cursor?: boolean;
    range?: boolean;
  };
  sort: {
    enabled: boolean;
    multiColumn?: boolean;
  };
  filter: {
    enabled: boolean;
    operators?: (ComparisonOperator | StringOperator)[];
  };
  grouping: {
    enabled: boolean;
  };
  search: {
    enabled: boolean;
    fullText?: boolean;
  };
  rowCount: boolean;
  cancellation: boolean;
  streaming: boolean;
}
```

---

## Creating a Custom DataSource

```typescript
import type { DataSource, GridQueryRequest, DataSourceResult } from 'svelte-datagrid';

class MyApiDataSource implements DataSource<User> {
  readonly name = 'MyAPI';
  readonly capabilities = {
    pagination: { offset: true },
    sort: { enabled: true, multiColumn: true },
    filter: { enabled: true },
    grouping: { enabled: false },
    search: { enabled: true },
    rowCount: true,
    cancellation: true,
    streaming: false
  };

  async getRows(request: GridQueryRequest, signal?: AbortSignal) {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(request),
      signal
    });

    if (!response.ok) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch' }
      };
    }

    const data = await response.json();
    return { success: true, data };
  }
}
```

---

## See also

- [Explanation: Data Source Architecture](../explanation/data-source-architecture.md)
- [Tutorial: Server-Side Data](../tutorials/server-side-data.md)
- [Reference: Types](./types.md)
