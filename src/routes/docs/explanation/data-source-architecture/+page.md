---
title: Data Source Architecture
---

# Data Source Architecture

This document explains the DataSource abstraction and why it's designed this way.

## The Problem

Grids need data. But where does that data come from?

- **In-memory arrays** - Simple, fast, limited by browser memory
- **REST APIs** - Paginated, requires server-round-trips
- **Databases** - SQL, needs different query translation
- **GraphQL** - Schema-based, different query format
- **Real-time sources** - WebSocket, server-sent events

A grid component shouldn't know about these details. It just needs data.

## The Solution: DataSource Interface

We abstract data fetching behind a simple interface:

```typescript
interface DataSource<TData> {
  name: string;
  capabilities: DataSourceCapabilities;
  getRows(request: GridQueryRequest): Promise<GridQueryResult<TData>>;
}
```

The grid asks "give me rows matching this query" and the DataSource figures out how.

## Request/Response Model

### GridQueryRequest

What the grid wants:

```typescript
interface GridQueryRequest {
  version: number;
  requestId: string;
  pagination: PaginationRequest;
  sort?: SortSpec[];
  filters?: FilterSpec[];
  search?: SearchSpec;
}
```

### GridQueryResult

What the DataSource returns:

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

## Capabilities Discovery

DataSources declare what they support:

```typescript
interface DataSourceCapabilities {
  pagination: {
    offset: boolean;    // "Give me rows 50-100"
    cursor: boolean;    // "Give me rows after cursor X"
    range: boolean;     // "Give me row indices 50-100"
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
  rowCount: boolean;    // Can return total row count
}
```

The grid adapts based on capabilities. If a DataSource doesn't support multi-column sort, the grid only sends single-column sort requests.

## Built-in DataSources

### LocalDataSource

Operates on in-memory arrays:

```typescript
const dataSource = createLocalDataSource(data, 'id');
```

- Handles all operations client-side
- Supports all filter operators
- Perfect for prototyping and small datasets
- Implements `MutableDataSource` for editing

### PostgresDataSource

Direct PostgreSQL integration:

```typescript
const dataSource = createPostgresDataSource({
  connection: db,
  table: 'users',
  idColumn: 'id'
});
```

- Translates queries to SQL
- Server-side sort/filter/search
- Works with any PostgreSQL client (pg, PgLite, Neon)

## Why This Design?

### Separation of Concerns

The grid handles:
- UI rendering
- User interactions
- Selection state
- Virtualization

The DataSource handles:
- Data fetching
- Query translation
- Backend communication
- Error handling

### Testability

Mock DataSources make testing easy:

```typescript
const mockSource: DataSource<User> = {
  name: 'mock',
  capabilities: { ... },
  async getRows(request) {
    return {
      success: true,
      data: { rows: mockUsers, rowCount: 100 }
    };
  }
};
```

### Backend Flexibility

Same grid component works with any backend:

```svelte
<!-- Local data -->
<DataGrid {data} {columns} />

<!-- REST API -->
<DataGrid dataSource={createApiDataSource('/api')} {columns} />

<!-- PostgreSQL -->
<DataGrid dataSource={createPostgresDataSource(config)} {columns} />
```

### Progressive Enhancement

Start with local data, migrate to server-side later:

```typescript
// Development: in-memory
const dataSource = createLocalDataSource(sampleData, 'id');

// Production: real API
const dataSource = createApiDataSource(config);
```

The grid code doesn't change.

## MutableDataSource

For editing support, DataSources can implement mutations:

```typescript
interface MutableDataSource<TData> extends DataSource<TData> {
  updateRow(
    rowId: string | number,
    columnKey: string,
    value: unknown
  ): Promise<{ success: true } | { success: false; error: string }>;
}
```

When a user edits a cell:
1. Grid validates the new value
2. Grid calls `dataSource.updateRow()`
3. DataSource persists the change
4. Grid updates UI based on success/failure

This enables auto-save without custom handlers.

## Query Translation Example

A REST API DataSource translates requests:

```typescript
async getRows(request: GridQueryRequest) {
  const params = new URLSearchParams();

  // Pagination
  if (request.pagination.type === 'offset') {
    params.set('offset', String(request.pagination.offset));
    params.set('limit', String(request.pagination.limit));
  }

  // Sorting
  if (request.sort?.length) {
    params.set('sort', request.sort[0].field);
    params.set('order', request.sort[0].direction);
  }

  // Filtering
  if (request.filters?.length) {
    params.set('filters', JSON.stringify(request.filters));
  }

  // Search
  if (request.search?.query) {
    params.set('q', request.search.query);
  }

  const response = await fetch(`/api/users?${params}`);
  const json = await response.json();

  return {
    success: true,
    data: {
      rows: json.data,
      rowCount: json.total
    }
  };
}
```

## Error Handling

DataSources return explicit success/failure:

```typescript
// Success case
return {
  success: true,
  data: { rows, rowCount }
};

// Failure case
return {
  success: false,
  error: { message: 'Network error' }
};
```

The grid handles both:
- Success: renders data
- Failure: shows error message

## See also

- [Reference: Data Sources](/docs/reference/data-sources) - API documentation
- [Tutorial: Server-Side Data](/docs/tutorials/server-side-data) - Using DataSources
- [Architecture Overview](/docs/explanation/architecture) - Overall grid structure
