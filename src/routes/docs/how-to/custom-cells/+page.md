---
title: Custom Cells
---

# How to Render Custom Cells

This guide shows how to customize the content rendered inside grid cells.

## Using the cell snippet

Use the `cell` snippet on a column to customize cell content:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', status: 'active', avatar: '/avatars/alice.jpg' },
    { id: 2, name: 'Bob', status: 'pending', avatar: '/avatars/bob.jpg' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    {
      key: 'name',
      header: 'User',
      width: 200,
      cell: (row) => `
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${row.avatar}" width="24" height="24" style="border-radius: 50%;" />
          <span>${row.name}</span>
        </div>
      `
    },
    { key: 'status', header: 'Status', width: 100 }
  ];
</script>

<DataGrid {data} {columns} />
```

## Using Svelte snippets

For more complex cells, use Svelte snippets:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', progress: 75 },
    { id: 2, name: 'Bob', progress: 45 }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'progress', header: 'Progress', width: 200 }
  ];
</script>

<DataGrid {data} {columns}>
  {#snippet cellSnippet(row, column)}
    {#if column.key === 'progress'}
      <div class="progress-bar">
        <div class="progress-fill" style="width: {row.progress}%"></div>
        <span class="progress-text">{row.progress}%</span>
      </div>
    {:else}
      {row[column.key]}
    {/if}
  {/snippet}
</DataGrid>

<style>
  .progress-bar {
    position: relative;
    height: 20px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .progress-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 500;
  }
</style>
```

## Status badges

Create colored status badges:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Task A', status: 'completed' },
    { id: 2, name: 'Task B', status: 'in_progress' },
    { id: 3, name: 'Task C', status: 'pending' }
  ];

  const statusColors = {
    completed: { bg: '#dcfce7', color: '#166534' },
    in_progress: { bg: '#dbeafe', color: '#1e40af' },
    pending: { bg: '#fef3c7', color: '#92400e' }
  };

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Task', width: 200 },
    { key: 'status', header: 'Status', width: 120 }
  ];
</script>

<DataGrid {data} {columns}>
  {#snippet cellSnippet(row, column)}
    {#if column.key === 'status'}
      {@const style = statusColors[row.status]}
      <span
        class="badge"
        style="background: {style.bg}; color: {style.color};"
      >
        {row.status.replace('_', ' ')}
      </span>
    {:else}
      {row[column.key]}
    {/if}
  {/snippet}
</DataGrid>

<style>
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
  }
</style>
```

## Action buttons

Add action buttons to rows:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'actions', header: 'Actions', width: 120 }
  ];

  function handleEdit(row) {
    console.log('Edit:', row);
  }

  function handleDelete(row) {
    console.log('Delete:', row);
  }
</script>

<DataGrid {data} {columns}>
  {#snippet cellSnippet(row, column)}
    {#if column.key === 'actions'}
      <div class="actions">
        <button onclick={() => handleEdit(row)}>Edit</button>
        <button onclick={() => handleDelete(row)} class="delete">Delete</button>
      </div>
    {:else}
      {row[column.key]}
    {/if}
  {/snippet}
</DataGrid>

<style>
  .actions {
    display: flex;
    gap: 4px;
  }

  .actions button {
    padding: 2px 8px;
    font-size: 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .actions button:hover {
    background: #f3f4f6;
  }

  .actions button.delete {
    color: #dc2626;
    border-color: #fecaca;
  }

  .actions button.delete:hover {
    background: #fef2f2;
  }
</style>
```

## Formatted numbers and dates

Format values for display:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Product A', price: 1299.99, createdAt: '2024-01-15' },
    { id: 2, name: 'Product B', price: 499.00, createdAt: '2024-02-20' }
  ];

  const columns = [
    { key: 'name', header: 'Product', width: 200 },
    { key: 'price', header: 'Price', width: 120, align: 'right' },
    { key: 'createdAt', header: 'Created', width: 150 }
  ];

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
</script>

<DataGrid {data} {columns}>
  {#snippet cellSnippet(row, column)}
    {#if column.key === 'price'}
      {currencyFormatter.format(row.price)}
    {:else if column.key === 'createdAt'}
      {dateFormatter.format(new Date(row.createdAt))}
    {:else}
      {row[column.key]}
    {/if}
  {/snippet}
</DataGrid>
```

## Links and images

Render clickable links:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Svelte', url: 'https://svelte.dev', logo: '/logos/svelte.svg' },
    { id: 2, name: 'Vite', url: 'https://vitejs.dev', logo: '/logos/vite.svg' }
  ];

  const columns = [
    { key: 'logo', header: '', width: 50 },
    { key: 'name', header: 'Framework', width: 150 },
    { key: 'url', header: 'Website', width: 200 }
  ];
</script>

<DataGrid {data} {columns}>
  {#snippet cellSnippet(row, column)}
    {#if column.key === 'logo'}
      <img src={row.logo} alt={row.name} width="24" height="24" />
    {:else if column.key === 'url'}
      <a href={row.url} target="_blank" rel="noopener">
        {row.url}
      </a>
    {:else}
      {row[column.key]}
    {/if}
  {/snippet}
</DataGrid>
```

## See also

- [Reference: Column Definition](/docs/reference/column-definition) - Cell and header options
- [How-to: Theming](/docs/how-to/theming) - Style cells with CSS
- [Reference: DataGrid](/docs/reference/datagrid) - Snippet props
