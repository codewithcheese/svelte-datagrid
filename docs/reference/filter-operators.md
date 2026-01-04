# Filter Operators Reference

Filter operators define how values are compared when filtering grid data.

## Grid Filter Operators

These operators are used with `gridState.setFilter()`:

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `setFilter('status', 'active', 'eq')` |
| `neq` | Not equals | `setFilter('status', 'deleted', 'neq')` |
| `gt` | Greater than | `setFilter('age', 18, 'gt')` |
| `lt` | Less than | `setFilter('price', 100, 'lt')` |
| `gte` | Greater than or equal | `setFilter('age', 21, 'gte')` |
| `lte` | Less than or equal | `setFilter('price', 50, 'lte')` |
| `contains` | String contains (default) | `setFilter('name', 'john')` |
| `startsWith` | String starts with | `setFilter('name', 'J', 'startsWith')` |
| `endsWith` | String ends with | `setFilter('email', '.com', 'endsWith')` |

## Usage

```typescript
// Default operator is 'contains' for text
gridState.setFilter('name', 'alice');

// Explicit operator
gridState.setFilter('age', 25, 'gte');
gridState.setFilter('status', 'active', 'eq');

// Clear a filter
gridState.setFilter('name', '');
```

---

## DataSource Comparison Operators

When building custom data sources, these operators are available:

| Operator | Description |
|----------|-------------|
| `eq` | Equals |
| `neq` | Not equals |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `in` | Value in array |
| `notIn` | Value not in array |
| `between` | Between two values |
| `isNull` | Is null |
| `isNotNull` | Is not null |

## DataSource String Operators

| Operator | Description |
|----------|-------------|
| `contains` | Contains substring |
| `notContains` | Does not contain substring |
| `startsWith` | Starts with string |
| `endsWith` | Ends with string |
| `matches` | Regex match |

---

## Filter Expressions

Data sources receive filters as expression trees:

```typescript
// Single condition
{
  type: 'condition',
  field: 'name',
  operator: 'contains',
  value: 'john',
  ignoreCase: true  // default: true
}

// Grouped conditions
{
  type: 'group',
  operator: 'and',
  conditions: [
    { type: 'condition', field: 'age', operator: 'gte', value: 18 },
    { type: 'condition', field: 'status', operator: 'eq', value: 'active' }
  ]
}

// OR conditions
{
  type: 'group',
  operator: 'or',
  conditions: [
    { type: 'condition', field: 'role', operator: 'eq', value: 'admin' },
    { type: 'condition', field: 'role', operator: 'eq', value: 'moderator' }
  ]
}
```

---

## Filter Type Behavior

Each `filterType` uses different operators by default:

| Filter Type | Default Operator | Input Type |
|-------------|-----------------|------------|
| `text` | `contains` | Text input |
| `number` | `eq` | Number input |
| `date` | `eq` | Date picker |
| `boolean` | `eq` | Yes/No dropdown |
| `select` | `eq` | Dropdown |

---

## TypeScript Types

```typescript
// Grid filter operators
type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

// DataSource comparison operators
type ComparisonOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isNull'
  | 'isNotNull';

// DataSource string operators
type StringOperator =
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'matches';

// Logical operators for grouping
type LogicalOperator = 'and' | 'or' | 'not';
```

---

## See also

- [How-to: Filtering](../how-to/filtering.md)
- [Reference: Grid State](./grid-state.md)
- [Reference: Data Sources](./data-sources.md)
