---
title: Server-Side Data
---

# Server-Side Data

In this tutorial, you'll connect your grid to a backend data source. You'll learn the DataSource interface, handle loading states, and implement a real API connection.

**Time**: 15 minutes
**Prerequisites**: Completed [Getting Started](/docs/tutorials/getting-started)

## Understanding Data Sources

Svelte DataGrid uses a **DataSource** abstraction to decouple the grid from your backend. Instead of passing data directly, you provide a data source that the grid queries.

```
┌───────────┐     Query      ┌──────────────┐
│  DataGrid │ ─────────────► │  DataSource  │
│           │ ◄───────────── │              │
│           │     Response   │  - Local     │
│           │                │  - REST API  │
│           │                │  - PostgreSQL│
└───────────┘                └──────────────┘
```

## Step 1: Use LocalDataSource

Start by using `LocalDataSource` to understand the interface:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';
  import { createLocalDataSource } from 'svelte-datagrid/query';

  const rawData = [
    { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
    { id: 2, name: 'Bob', department: 'Design', salary: 85000 },
    { id: 3, name: 'Carol', department: 'Engineering', salary: 110000 },
    { id: 4, name: 'David', department: 'Marketing', salary: 78000 },
    { id: 5, name: 'Eve', department: 'Design', salary: 92000 }
  ];

  // Create a data source from the raw data
  const dataSource = createLocalDataSource(rawData, 'id');

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'department', header: 'Department', width: 150 },
    { key: 'salary', header: 'Salary', width: 100, align: 'right' as const }
  ];

  // Fetch data from the source
  let data = $state<typeof rawData>([]);
  let loading = $state(true);

  $effect(() => {
    loadData();
  });

  async function loadData() {
    loading = true;
    const result = await dataSource.getRows({
      version: 1,
      requestId: 'initial',
      pagination: { type: 'offset', offset: 0, limit: 100 }
    });
    if (result.success) {
      data = result.data.rows;
    }
    loading = false;
  }
</script>

<div style="height: 300px;">
  <DataGrid {data} {columns} {loading} />
</div>
```

This works just like passing data directly, but now the grid can request data dynamically.

## Step 2: Add sorting and filtering

The data source handles sorting and filtering server-side:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';
  import { createLocalDataSource } from 'svelte-datagrid/query';

  const rawData = [/* ... same as before ... */];
  const dataSource = createLocalDataSource(rawData, 'id');

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    { key: 'department', header: 'Department', width: 150 },
    { key: 'salary', header: 'Salary', width: 100, align: 'right' as const }
  ];

  let data = $state<typeof rawData>([]);
  let loading = $state(true);
  let sort = $state<{ field: string; direction: 'asc' | 'desc' }[]>([]);

  async function loadData() {
    loading = true;
    const result = await dataSource.getRows({
      version: 1,
      requestId: crypto.randomUUID(),
      pagination: { type: 'offset', offset: 0, limit: 100 },
      sort: sort.length > 0 ? sort : undefined
    });
    if (result.success) {
      data = result.data.rows;
    }
    loading = false;
  }

  function handleSortChange(newSort) {
    sort = newSort;
    loadData();
  }

  $effect(() => {
    loadData();
  });
</script>

<div style="height: 300px;">
  <DataGrid
    {data}
    {columns}
    {loading}
    onSortChange={handleSortChange}
  />
</div>
```

Now clicking column headers triggers a new query with the sort applied.

## Step 3: Create a REST API data source

Let's create a real data source that fetches from an API:

```typescript
// src/lib/api-data-source.ts
import type { DataSource, GridQueryRequest, GridQueryResponse } from 'svelte-datagrid/query';

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
}

export function createApiDataSource(baseUrl: string): DataSource<User> {
  return {
    name: 'api',
    capabilities: {
      pagination: { offset: true, cursor: false, range: true },
      sort: { enabled: true, multiColumn: false },
      filter: { enabled: true, operators: ['eq', 'contains'] },
      search: { enabled: true },
      rowCount: true
    },

    async getRows(request: GridQueryRequest) {
      try {
        // Convert grid query to API parameters
        const params = new URLSearchParams();

        if (request.pagination.type === 'offset') {
          params.set('offset', String(request.pagination.offset));
          params.set('limit', String(request.pagination.limit));
        }

        if (request.sort?.length) {
          params.set('sortBy', request.sort[0].field);
          params.set('sortDir', request.sort[0].direction);
        }

        if (request.search?.query) {
          params.set('search', request.search.query);
        }

        // Make the API call
        const response = await fetch(`${baseUrl}/users?${params}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

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

## Step 4: Handle loading and error states

The grid supports loading and error states:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';
  import { createApiDataSource } from '$lib/api-data-source';

  const dataSource = createApiDataSource('/api');

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'department', header: 'Department', width: 150 }
  ];

  let data = $state([]);
  let loading = $state(true);
  let error = $state<string | undefined>();
  let totalRows = $state(0);

  async function loadData(request = {}) {
    loading = true;
    error = undefined;

    const result = await dataSource.getRows({
      version: 1,
      requestId: crypto.randomUUID(),
      pagination: { type: 'offset', offset: 0, limit: 50 },
      ...request
    });

    if (result.success) {
      data = result.data.rows;
      totalRows = result.data.rowCount ?? data.length;
    } else {
      error = result.error?.message ?? 'Failed to load data';
    }

    loading = false;
  }

  $effect(() => {
    loadData();
  });
</script>

<div style="height: 400px;">
  <DataGrid
    {data}
    {columns}
    {loading}
    errorMessage={error}
  />
</div>

{#if !loading && !error}
  <p>Showing {data.length} of {totalRows} rows</p>
{/if}
```

When `loading` is true, the grid shows a loading indicator. When `errorMessage` is set, it shows the error.

## Step 5: Custom loading and error displays

Override the default displays with snippets:

```svelte
<DataGrid {data} {columns} {loading} errorMessage={error}>
  {#snippet loadingSnippet()}
    <div class="custom-loader">
      <span class="spinner"></span>
      Loading users...
    </div>
  {/snippet}

  {#snippet errorSnippet(message)}
    <div class="custom-error">
      <strong>Error loading data</strong>
      <p>{message}</p>
      <button onclick={() => loadData()}>Retry</button>
    </div>
  {/snippet}

  {#snippet emptySnippet()}
    <div class="custom-empty">
      No users found. Try a different search.
    </div>
  {/snippet}
</DataGrid>
```

## Complete code

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';
  import { createLocalDataSource } from 'svelte-datagrid/query';

  // Using LocalDataSource as a stand-in for a real API
  const rawData = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', department: 'Engineering' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', department: 'Design' },
    { id: 3, name: 'Carol White', email: 'carol@example.com', department: 'Engineering' },
    { id: 4, name: 'David Brown', email: 'david@example.com', department: 'Marketing' },
    { id: 5, name: 'Eve Davis', email: 'eve@example.com', department: 'Design' }
  ];

  const dataSource = createLocalDataSource(rawData, 'id');

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'department', header: 'Department', width: 150 }
  ];

  let data = $state<typeof rawData>([]);
  let loading = $state(true);
  let error = $state<string | undefined>();

  async function loadData(options: { sort?: any[] } = {}) {
    loading = true;
    error = undefined;

    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    const result = await dataSource.getRows({
      version: 1,
      requestId: crypto.randomUUID(),
      pagination: { type: 'offset', offset: 0, limit: 100 },
      sort: options.sort
    });

    if (result.success) {
      data = result.data.rows;
    } else {
      error = result.error?.message;
    }
    loading = false;
  }

  function handleSortChange(sort) {
    loadData({ sort });
  }

  $effect(() => {
    loadData();
  });
</script>

<div style="height: 350px;">
  <DataGrid
    {data}
    {columns}
    {loading}
    errorMessage={error}
    onSortChange={handleSortChange}
  />
</div>
```

## What you learned

- The DataSource interface for decoupled data fetching
- Using LocalDataSource for prototyping
- Creating custom API data sources
- Handling loading and error states
- Custom state displays with snippets

## Next steps

- [Reference: Data Sources](/docs/reference/data-sources) - Full DataSource API
- [Explanation: Data Source Architecture](/docs/explanation/data-source-architecture) - How it works
- [How-to: Filtering](/docs/how-to/filtering) - Add filters to your queries
