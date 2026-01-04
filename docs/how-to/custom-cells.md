# How to Render Custom Cells

This guide shows you how to customize cell rendering in your DataGrid.

## Using Formatters

The simplest approach is using a `formatter` function in your column definition:

```svelte
<script>
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      formatter: (value) => `$${value.toFixed(2)}`
    },
    {
      key: 'date',
      header: 'Date',
      formatter: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'active',
      header: 'Status',
      formatter: (value) => value ? 'Active' : 'Inactive'
    }
  ];
</script>

<DataGrid {data} {columns} />
```

---

## Using cellClass for Styling

Add dynamic CSS classes based on cell values:

```svelte
<script>
  const columns = [
    { key: 'name', header: 'Name' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      formatter: (v) => `$${v.toFixed(2)}`,
      cellClass: (row, value) => {
        if (value > 1000) return 'amount-high';
        if (value < 0) return 'amount-negative';
        return '';
      }
    },
    {
      key: 'status',
      header: 'Status',
      cellClass: (row) => `status-${row.status.toLowerCase()}`
    }
  ];
</script>

<DataGrid {data} {columns} />

<style>
  :global(.amount-high) {
    color: green;
    font-weight: bold;
  }
  :global(.amount-negative) {
    color: red;
  }
  :global(.status-active) {
    background: #e8f5e9;
  }
  :global(.status-pending) {
    background: #fff3e0;
  }
</style>
```

---

## Using Cell Renderer Components

For complex rendering, use a Svelte component:

```svelte
<!-- AvatarCell.svelte -->
<script>
  export let value;
  export let row;
  export let column;
</script>

<div class="avatar-cell">
  <img src={row.avatarUrl} alt={value} />
  <span>{value}</span>
</div>

<style>
  .avatar-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }
</style>
```

Then use it in your column:

```svelte
<script>
  import AvatarCell from './AvatarCell.svelte';

  const columns = [
    {
      key: 'name',
      header: 'User',
      cellRenderer: AvatarCell
    }
  ];
</script>

<DataGrid {data} {columns} />
```

---

## Common Cell Patterns

### Boolean Indicator

```svelte
<script>
  const columns = [
    {
      key: 'active',
      header: 'Active',
      align: 'center',
      formatter: (value) => value ? '✓' : '✗',
      cellClass: (row, value) => value ? 'status-yes' : 'status-no'
    }
  ];
</script>

<style>
  :global(.status-yes) { color: #4caf50; }
  :global(.status-no) { color: #f44336; }
</style>
```

### Progress Bar

```svelte
<!-- ProgressCell.svelte -->
<script>
  export let value;
</script>

<div class="progress-bar">
  <div class="progress-fill" style="width: {value}%"></div>
  <span class="progress-text">{value}%</span>
</div>

<style>
  .progress-bar {
    position: relative;
    height: 20px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s;
  }
  .progress-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
</style>
```

### Badge/Tag

```svelte
<!-- BadgeCell.svelte -->
<script>
  export let value;

  const colors = {
    pending: '#ff9800',
    active: '#4caf50',
    completed: '#2196f3',
    cancelled: '#f44336'
  };
</script>

<span
  class="badge"
  style="background: {colors[value] || '#9e9e9e'}"
>
  {value}
</span>

<style>
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    color: white;
    font-size: 12px;
    text-transform: uppercase;
  }
</style>
```

### Link Cell

```svelte
<!-- LinkCell.svelte -->
<script>
  export let value;
  export let row;
</script>

<a
  href="/users/{row.id}"
  onclick={(e) => e.stopPropagation()}
>
  {value}
</a>

<style>
  a {
    color: #1976d2;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
</style>
```

### Action Buttons

```svelte
<!-- ActionCell.svelte -->
<script>
  export let row;
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleEdit() {
    dispatch('edit', row);
  }

  function handleDelete() {
    dispatch('delete', row);
  }
</script>

<div class="actions">
  <button onclick={handleEdit}>Edit</button>
  <button onclick={handleDelete} class="danger">Delete</button>
</div>

<style>
  .actions {
    display: flex;
    gap: 4px;
  }
  button {
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
  }
  .danger {
    color: #f44336;
  }
</style>
```

---

## Cell Renderer Props

All cell renderer components receive these props:

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TValue` | The cell value |
| `row` | `TData` | The full row data |
| `column` | `ColumnDef` | The column definition |

---

## Tips

1. **Stop event propagation** for interactive elements like links and buttons to prevent row selection
2. **Use `formatter`** for simple text transformations - it's faster than a full component
3. **Use `cellClass`** for conditional styling based on value
4. **Use `cellRenderer`** for complex layouts with multiple elements

---

## See also

- [Reference: Column Definition](../reference/column-definition.md)
- [How-to: Theming](./theming.md)
