# Query Module / Data Sources

The DataGrid uses a decoupled query architecture. Instead of directly managing data, the grid emits standardized query requests through a `DataSource` interface, allowing pluggable backends.

## Architecture Overview

```
┌─────────────────┐     GridQueryRequest     ┌──────────────────┐
│    DataGrid     │ ───────────────────────▶ │    DataSource    │
│                 │                          │   (interface)    │
│  - Pagination   │ ◀─────────────────────── │                  │
│  - Sort UI      │     GridQueryResponse    │  LocalDataSource │
│  - Filter UI    │                          │  PgLiteDataSource│
│  - Virtualization│                         │  CustomDataSource│
└─────────────────┘                          └──────────────────┘
```

## Grid Query Model (GQM)

The GQM defines the stable contract between the grid and any data source.

### Query Request

```typescript
interface GridQueryRequest {
  version: 1;
  requestId: string;
  pagination: PaginationSpec;
  sort?: SortSpec[];
  filter?: FilterExpression;
  projection?: string[];
  requires?: ResponseRequirements;
  search?: { query: string; fields?: string[] };
}
```

### Query Response

```typescript
interface GridQueryResponse<TRow> {
  rows: TRow[];
  rowCount?: number;
  nextCursor?: string;
  prevCursor?: string;
  meta?: ResponseMeta;
}
```

## Data Source Interface

Implement this interface to connect to any backend:

```typescript
interface DataSource<TRow> {
  readonly name: string;
  readonly capabilities: DataSourceCapabilities;

  getRows(request: GridQueryRequest): Promise<DataSourceResult<GridQueryResponse<TRow>>>;
  getDistinctValues?(field: string): Promise<DataSourceResult<unknown[]>>;
  destroy?(): void;
}
```

## Built-in Data Sources

### LocalDataSource

In-memory data source for client-side data. No backend required.

```typescript
import { createLocalDataSource } from '$lib/query';

const data = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
];

const dataSource = createLocalDataSource(data, 'id');

// Query the data
const result = await dataSource.getRows({
  version: 1,
  requestId: 'req-1',
  pagination: { type: 'offset', offset: 0, limit: 10 },
  sort: [{ field: 'age', direction: 'asc' }],
  filter: { type: 'condition', field: 'age', operator: 'gte', value: 25 }
});
```

**Features:**
- Full filter expression support (and/or/not, nested groups)
- Multi-column sorting
- Offset, cursor, and range pagination
- Search across all or specific fields
- Mutations (insert, update, delete)
- Change subscriptions

### PostgresDataSource

Generic PostgreSQL data source that works with any Postgres client.

```typescript
import { createPostgresDataSource } from '$lib/query';

// Works with any client implementing PostgresConnection interface:
// - node-postgres (pg)
// - postgres.js
// - PgLite (@electric-sql/pglite)
// - Vercel Postgres
// - Neon serverless

// Example with node-postgres
import { Pool } from 'pg';
const pool = new Pool({ connectionString: '...' });
const dataSource = createPostgresDataSource({
  connection: pool,
  table: 'users',
  idColumn: 'id'
});

// Example with PgLite (in-browser/testing)
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const dataSource = createPostgresDataSource({
  connection: db,
  table: 'users'
});
```

The `PostgresConnection` interface is minimal:

```typescript
interface PostgresConnection {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
```

## Filter Expressions

Filters use an expression tree supporting complex conditions:

### Simple Condition

```typescript
const filter: FilterExpression = {
  type: 'condition',
  field: 'age',
  operator: 'gte',
  value: 21
};
```

### AND Group

```typescript
const filter: FilterExpression = {
  type: 'group',
  operator: 'and',
  conditions: [
    { type: 'condition', field: 'active', operator: 'eq', value: true },
    { type: 'condition', field: 'age', operator: 'gte', value: 21 }
  ]
};
```

### Nested Groups

```typescript
const filter: FilterExpression = {
  type: 'group',
  operator: 'and',
  conditions: [
    { type: 'condition', field: 'active', operator: 'eq', value: true },
    {
      type: 'group',
      operator: 'or',
      conditions: [
        { type: 'condition', field: 'role', operator: 'eq', value: 'admin' },
        { type: 'condition', field: 'role', operator: 'eq', value: 'moderator' }
      ]
    }
  ]
};
```

### Helper Functions

```typescript
import { filterCondition, and, or, not } from '$lib/query';

const filter = and(
  filterCondition('active', 'eq', true),
  or(
    filterCondition('role', 'eq', 'admin'),
    filterCondition('role', 'eq', 'moderator')
  )
);
```

## Filter Operators

### Comparison Operators

| Operator | Description |
|----------|-------------|
| `eq` | Equals |
| `neq` | Not equals |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `in` | In array |
| `notIn` | Not in array |
| `between` | Between two values |
| `isNull` | Is null |
| `isNotNull` | Is not null |

### String Operators

| Operator | Description |
|----------|-------------|
| `contains` | Contains substring (case-insensitive) |
| `notContains` | Does not contain |
| `startsWith` | Starts with |
| `endsWith` | Ends with |
| `matches` | Regex match |

## Pagination

### Offset Pagination

Traditional pagination with page numbers:

```typescript
const pagination: PaginationSpec = {
  type: 'offset',
  offset: 0,
  limit: 25
};
```

### Cursor Pagination

For stable pagination with large datasets:

```typescript
const pagination: PaginationSpec = {
  type: 'cursor',
  cursor: 'abc123',
  limit: 25,
  direction: 'forward'
};
```

### Range Pagination

For virtualization (fetch visible rows):

```typescript
const pagination: PaginationSpec = {
  type: 'range',
  startRow: 0,
  endRow: 50
};
```

## Sorting

Multi-column sorting with null handling:

```typescript
const sort: SortSpec[] = [
  { field: 'lastName', direction: 'asc' },
  { field: 'firstName', direction: 'asc', nulls: 'last' }
];
```

## Capabilities

Data sources advertise what they support:

```typescript
const capabilities: DataSourceCapabilities = {
  pagination: { offset: true, cursor: false, range: true },
  sort: { enabled: true, multiColumn: true },
  filter: { enabled: true, operators: ['eq', 'gt', 'contains'] },
  grouping: { enabled: false },
  search: { enabled: true },
  rowCount: true,
  cancellation: false,
  streaming: false
};
```

## Creating Custom Data Sources

Implement the `DataSource` interface for custom backends:

```typescript
import type { DataSource, GridQueryRequest, GridQueryResponse } from '$lib/query';

class MyApiDataSource implements DataSource<User> {
  readonly name = 'my-api';
  readonly capabilities = { /* ... */ };

  async getRows(request: GridQueryRequest) {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    const data = await response.json();
    return { success: true, data };
  }
}
```

## Mutable Data Sources

For editable grids, implement `MutableDataSource`:

```typescript
interface MutableDataSource<TRow> extends DataSource<TRow> {
  mutate(mutations: RowMutation<TRow>[]): Promise<DataSourceResult<(string | number)[]>>;
  validate?(mutations: RowMutation<TRow>[]): Promise<DataSourceResult<Record<number, string[]>>>;
}
```

Example mutations:

```typescript
await dataSource.mutate([
  { type: 'insert', data: { name: 'Charlie', age: 28 } },
  { type: 'update', rowId: 1, data: { age: 31 } },
  { type: 'delete', rowId: 2 }
]);
```
