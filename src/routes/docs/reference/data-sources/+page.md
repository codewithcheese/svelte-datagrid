---
title: Data Sources
---

# Data Sources Reference

Data sources provide an abstraction layer between the grid and your data backend.

## Overview

```
┌───────────┐     GridQueryRequest    ┌──────────────┐
│  DataGrid │ ──────────────────────► │  DataSource  │
│           │ ◄────────────────────── │              │
│           │    GridQueryResponse    │  - Local     │
│           │                         │  - REST API  │
│           │                         │  - PostgreSQL│
└───────────┘                         └──────────────┘
```

## DataSource Interface

```typescript
interface DataSource<TData> {
  name: string;
  capabilities: DataSourceCapabilities;
  getRows(request: GridQueryRequest): Promise<GridQueryResult<TData>>;
}
```

## Built-in Data Sources

### LocalDataSource

In-memory data source for client-side operations.

```typescript
import { createLocalDataSource } from 'svelte-datagrid/query';

const dataSource = createLocalDataSource(data, 'id');
```

**Features:**
- Client-side sorting, filtering, and search
- Supports all filter operators
- Implements MutableDataSource for editing

### PostgresDataSource

Direct PostgreSQL integration.

```typescript
import { createPostgresDataSource } from 'svelte-datagrid/query';

const dataSource = createPostgresDataSource({
  connection: db,
  table: 'users',
  idColumn: 'id'
});
```

## GridQueryRequest

The request object sent to the data source:

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
}

interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

interface FilterSpec {
  field: string;
  operator: FilterOperator;
  value: unknown;
}
```

## GridQueryResult

The response from the data source:

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

## DataSourceCapabilities

Describes what the data source supports:

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

## MutableDataSource

For data sources that support editing:

```typescript
interface MutableDataSource<TData> extends DataSource<TData> {
  updateRow(
    rowId: string | number,
    columnKey: string,
    value: unknown
  ): Promise<{ success: true } | { success: false; error: string }>;
}
```

## Creating a Custom Data Source

```typescript
import type { DataSource, GridQueryRequest } from 'svelte-datagrid/query';

interface User {
  id: number;
  name: string;
  email: string;
}

export function createApiDataSource(baseUrl: string): DataSource<User> {
  return {
    name: 'api',
    capabilities: {
      pagination: { offset: true, cursor: false, range: false },
      sort: { enabled: true, multiColumn: false },
      filter: { enabled: true, operators: ['eq', 'contains'] },
      search: { enabled: true },
      rowCount: true
    },

    async getRows(request: GridQueryRequest) {
      try {
        const params = new URLSearchParams();

        // Pagination
        if (request.pagination.type === 'offset') {
          params.set('offset', String(request.pagination.offset ?? 0));
          params.set('limit', String(request.pagination.limit ?? 50));
        }

        // Sorting
        if (request.sort?.length) {
          params.set('sortBy', request.sort[0].field);
          params.set('sortDir', request.sort[0].direction);
        }

        // Search
        if (request.search?.query) {
          params.set('search', request.search.query);
        }

        // Filters
        if (request.filters?.length) {
          params.set('filters', JSON.stringify(request.filters));
        }

        const response = await fetch(`${baseUrl}/users?${params}`);
        const json = await response.json();

        return {
          success: true,
          data: {
            rows: json.data,
            rowCount: json.total
          }
        };
      } catch (error) {
        return {
          success: false,
          error: { message: String(error) }
        };
      }
    }
  };
}
```

## Using with DataGrid

### With data prop (auto-creates LocalDataSource)

```svelte
<DataGrid {data} {columns} />
```

### With explicit dataSource

```svelte
<script>
  const dataSource = createLocalDataSource(data, 'id');
</script>

<DataGrid {dataSource} {columns} />
```

### With custom data source

```svelte
<script>
  const dataSource = createApiDataSource('/api');
</script>

<DataGrid {dataSource} {columns} />
```

## Filter Operators

| Operator | Description | Example Value |
|----------|-------------|---------------|
| `eq` | Equals | `'active'` |
| `neq` | Not equals | `'pending'` |
| `gt` | Greater than | `100` |
| `gte` | Greater than or equal | `100` |
| `lt` | Less than | `100` |
| `lte` | Less than or equal | `100` |
| `contains` | String contains | `'john'` |
| `startsWith` | String starts with | `'A'` |
| `endsWith` | String ends with | `'son'` |
| `in` | Value in array | `['a', 'b']` |
| `between` | Value in range | `[10, 100]` |
| `isNull` | Value is null | `true` |

## See also

- [Tutorial: Server-Side Data](/docs/tutorials/server-side-data) - DataSource tutorial
- [Explanation: Data Source Architecture](/docs/explanation/data-source-architecture) - How it works
- [Reference: Filter Operators](/docs/reference/filter-operators) - Full operator list
