---
title: Filter Operators
---

# Filter Operators Reference

Filter operators define how column values are matched when filtering.

## Available Operators

### Equality Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{ operator: 'eq', value: 'active' }` |
| `neq` | Not equals | `{ operator: 'neq', value: 'deleted' }` |

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `gt` | Greater than | `{ operator: 'gt', value: 100 }` |
| `gte` | Greater than or equal | `{ operator: 'gte', value: 100 }` |
| `lt` | Less than | `{ operator: 'lt', value: 50 }` |
| `lte` | Less than or equal | `{ operator: 'lte', value: 50 }` |

### String Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `contains` | String contains (case-insensitive) | `{ operator: 'contains', value: 'john' }` |
| `startsWith` | String starts with | `{ operator: 'startsWith', value: 'A' }` |
| `endsWith` | String ends with | `{ operator: 'endsWith', value: 'son' }` |

### Collection Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `in` | Value in array | `{ operator: 'in', value: ['a', 'b', 'c'] }` |
| `between` | Value in range (inclusive) | `{ operator: 'between', value: [10, 100] }` |

### Null Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `isNull` | Value is null | `{ operator: 'isNull', value: true }` |

## Usage

### Programmatic Filtering

```typescript
// Text contains
gridState.setFilter('name', { operator: 'contains', value: 'john' });

// Numeric comparison
gridState.setFilter('age', { operator: 'gte', value: 21 });

// Exact match
gridState.setFilter('status', { operator: 'eq', value: 'active' });

// Multiple values
gridState.setFilter('role', { operator: 'in', value: ['admin', 'moderator'] });

// Range
gridState.setFilter('price', { operator: 'between', value: [10, 100] });
```

### Filter Input Types

The UI filter input type affects which operators are used:

| Filter Type | Default Operator | Available Operators |
|-------------|------------------|---------------------|
| `text` | `contains` | `contains`, `startsWith`, `endsWith`, `eq` |
| `number` | `eq` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between` |
| `date` | `eq` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between` |
| `boolean` | `eq` | `eq` |
| `select` | `eq` | `eq`, `in` |

## LocalDataSource Support

LocalDataSource supports all filter operators:

```typescript
const dataSource = createLocalDataSource(data, 'id');

// All operators work client-side
dataSource.getRows({
  version: 1,
  requestId: '1',
  pagination: { type: 'offset', offset: 0, limit: 100 },
  filters: [
    { field: 'name', operator: 'contains', value: 'john' },
    { field: 'age', operator: 'gte', value: 21 },
    { field: 'status', operator: 'in', value: ['active', 'pending'] }
  ]
});
```

## Custom DataSource Support

When building a custom DataSource, check capabilities for supported operators:

```typescript
const dataSource: DataSource<User> = {
  name: 'api',
  capabilities: {
    filter: {
      enabled: true,
      operators: ['eq', 'contains', 'gt', 'lt'] // Only these are supported
    },
    // ...
  },
  async getRows(request) {
    // Convert supported operators to API format
    const filters = request.filters?.filter(f =>
      this.capabilities.filter.operators.includes(f.operator)
    );
    // ...
  }
};
```

## Combining Filters

Multiple filters are combined with AND logic:

```typescript
gridState.setFilter('department', { operator: 'eq', value: 'Engineering' });
gridState.setFilter('salary', { operator: 'gte', value: 100000 });
// Result: department = 'Engineering' AND salary >= 100000
```

## See also

- [How-to: Filtering](/docs/how-to/filtering) - Filter usage guide
- [Reference: Grid State](/docs/reference/grid-state) - Filter API methods
- [Reference: Data Sources](/docs/reference/data-sources) - Custom filters
