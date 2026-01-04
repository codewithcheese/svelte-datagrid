# Data Source Architecture

This document explains the data source architecture in Svelte DataGrid and why it's designed this way.

## The Problem

Data grids need to work with many different data sources:

- In-memory arrays
- REST APIs
- GraphQL endpoints
- SQL databases (PostgreSQL, MySQL, SQLite)
- Real-time streams (WebSocket, SSE)
- Local storage or IndexedDB

Without abstraction, the grid would need to understand each backend's query language, pagination style, and data format.

## The Solution: DataSource Interface

The grid uses a `DataSource` interface as the contract between the grid and any backend:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    DataGrid     │────▶│   DataSource    │────▶│    Backend      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │  GridQueryRequest     │  Native Query
        │                       │
        ▼                       ▼
   - sort                  - SQL ORDER BY
   - filter                - WHERE clause
   - pagination            - LIMIT/OFFSET
```

The grid speaks a universal query language (GridQueryRequest). Each DataSource implementation translates this to its native format.

## Grid Query Model (GQM)

The Grid Query Model is the stable contract:

### Request

```typescript
interface GridQueryRequest {
  version: 1;
  requestId: string;
  pagination: PaginationSpec;
  sort?: SortSpec[];
  filter?: FilterExpression;
  requires?: ResponseRequirements;
}
```

### Response

```typescript
interface GridQueryResponse<TRow> {
  rows: TRow[];
  rowCount?: number;
  meta?: ResponseMeta;
}
```

This design provides:

1. **Backend agnosticism** - Same grid code works with any data source
2. **Forward compatibility** - Version field allows schema evolution
3. **Request cancellation** - Unique request IDs enable aborting stale requests
4. **Flexible pagination** - Supports offset, cursor, and range-based windowing

## Filter Expression Tree

Filters use an expression tree rather than flat key-value pairs:

```typescript
type FilterExpression = FilterCondition | FilterGroup;

interface FilterCondition {
  type: 'condition';
  field: string;
  operator: 'eq' | 'contains' | 'gt' | ...;
  value: unknown;
}

interface FilterGroup {
  type: 'group';
  operator: 'and' | 'or' | 'not';
  conditions: FilterExpression[];
}
```

This enables complex queries:

```typescript
{
  type: 'group',
  operator: 'and',
  conditions: [
    { type: 'condition', field: 'age', operator: 'gte', value: 18 },
    {
      type: 'group',
      operator: 'or',
      conditions: [
        { type: 'condition', field: 'role', operator: 'eq', value: 'admin' },
        { type: 'condition', field: 'role', operator: 'eq', value: 'moderator' }
      ]
    }
  ]
}
```

This translates cleanly to SQL: `WHERE age >= 18 AND (role = 'admin' OR role = 'moderator')`

## Capabilities Declaration

Data sources declare what they support:

```typescript
interface DataSourceCapabilities {
  pagination: { offset?: boolean; cursor?: boolean; range?: boolean };
  sort: { enabled: boolean; multiColumn?: boolean };
  filter: { enabled: boolean; operators?: string[] };
  rowCount: boolean;
  cancellation: boolean;
  streaming: boolean;
}
```

The grid can:
- Fall back to client-side operations when server doesn't support them
- Show/hide UI based on capabilities (e.g., hide multi-sort if not supported)
- Optimize requests based on what's available

## Built-in Implementations

### LocalDataSource

For in-memory data. Implements all operations client-side:

```
┌─────────────────┐
│ LocalDataSource │
├─────────────────┤
│ - data array    │
│ - sort()        │
│ - filter()      │
│ - paginate()    │
└─────────────────┘
```

### PostgresDataSource

Translates GQM to SQL:

```
GridQueryRequest          PostgresDataSource              PostgreSQL
      │                          │                            │
      │ {                        │ SELECT *                   │
      │   sort: [{               │ FROM users                 │
      │     field: 'name',       │ WHERE status = 'active'    │
      │     direction: 'asc'     │ ORDER BY name ASC          │
      │   }],                    │ LIMIT 50                   │
      │   filter: {...}          │                            │
      │ }                        │                            │
      └──────────────────────────┴────────────────────────────▶
```

## Mutable Data Sources

For editable grids, the `MutableDataSource` interface adds:

```typescript
interface MutableDataSource<TRow> extends DataSource<TRow> {
  mutate(mutations: RowMutation<TRow>[]): Promise<DataSourceResult<...>>;
  validate?(mutations: RowMutation<TRow>[]): Promise<...>;
}
```

This enables:
- **Auto-save editing** - Grid commits changes directly to the source
- **Optimistic updates** - Update UI immediately, rollback on failure
- **Batch operations** - Multiple changes in one transaction
- **Server validation** - Return errors keyed by mutation index

## Result Type Pattern

All operations return a discriminated union:

```typescript
type DataSourceResult<T> =
  | { success: true; data: T }
  | { success: false; error: DataSourceError };
```

Benefits:
- **Type-safe error handling** - Compiler enforces checking success
- **Rich error information** - Code, message, retryable flag
- **No exceptions** - Errors are values, not control flow

## Data Flow

```
User Action
     │
     ▼
Grid State (sortState, filterState, etc.)
     │
     ▼
Effect: Build GridQueryRequest
     │
     ▼
DataSource.getRows(request)
     │
     ▼
DataSource translates to native format
     │
     ▼
Backend processes request
     │
     ▼
DataSource returns GridQueryResponse
     │
     ▼
Grid updates: rows, totalRowCount, isLoading
     │
     ▼
UI re-renders
```

## Design Trade-offs

### Why expression trees over flat filters?

**Pros:**
- Supports complex AND/OR/NOT combinations
- Maps cleanly to SQL WHERE clauses
- Extensible without breaking changes

**Cons:**
- More complex to build programmatically
- Slightly larger payload

### Why capabilities declaration?

**Pros:**
- Grid can adapt to data source limitations
- Enables progressive enhancement
- Self-documenting API

**Cons:**
- More boilerplate for simple implementations
- Capabilities might not match reality

### Why result types over exceptions?

**Pros:**
- Explicit error handling
- Works well with async/await
- No hidden control flow

**Cons:**
- More verbose success case
- Different from typical JS patterns

---

## See also

- [Reference: Data Sources](../reference/data-sources.md)
- [Tutorial: Server-Side Data](../tutorials/server-side-data.md)
