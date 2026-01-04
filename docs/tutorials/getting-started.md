# Getting Started

In this tutorial, you'll create your first Svelte DataGrid. By the end, you'll have a working grid that displays data, supports sorting, and handles click events.

**Time**: 5 minutes
**Prerequisites**: A Svelte 5 project (SvelteKit or Vite)

## Step 1: Install the package

In your terminal, install Svelte DataGrid:

```bash
pnpm add svelte-datagrid
```

## Step 2: Create sample data

Create a new file `src/routes/+page.svelte` (SvelteKit) or `src/App.svelte` (Vite):

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  // Sample data - imagine this comes from an API
  const data = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', salary: 95000 },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', salary: 85000 },
    { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Manager', salary: 110000 },
    { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Engineer', salary: 92000 },
    { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', salary: 88000 }
  ];
</script>
```

Your data can be any array of objects. Each object represents a row.

## Step 3: Define columns

Columns tell the grid what properties to display and how to display them:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [/* ... from Step 2 ... */];

  // Define which properties to show and how
  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'role', header: 'Role', width: 120 },
    { key: 'salary', header: 'Salary', width: 100, align: 'right' as const }
  ];
</script>
```

Each column has:
- **key**: The property name in your data objects
- **header**: The text shown in the column header
- **width**: Column width in pixels
- **align**: Text alignment (optional, defaults to 'left')

## Step 4: Render the grid

Add the DataGrid component:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', salary: 95000 },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', salary: 85000 },
    { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Manager', salary: 110000 },
    { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Engineer', salary: 92000 },
    { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', salary: 88000 }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'role', header: 'Role', width: 120 },
    { key: 'salary', header: 'Salary', width: 100, align: 'right' as const }
  ];
</script>

<div style="height: 400px;">
  <DataGrid {data} {columns} />
</div>
```

> **Important**: The grid needs a container with a defined height. Virtualization requires knowing the available space.

Run your dev server (`pnpm dev`) and you should see your grid!

## Step 5: Enable sorting

By default, columns are sortable. Click a column header to sort:

- **First click**: Sort ascending (A→Z, 1→9)
- **Second click**: Sort descending (Z→A, 9→1)
- **Third click**: Clear sort

Try clicking the "Name" header. The rows reorder alphabetically.

To disable sorting for a specific column:

```ts
{ key: 'id', header: 'ID', width: 60, sortable: false }
```

## Step 6: Handle cell clicks

Add an event handler to respond to clicks:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  // ... data and columns from above ...

  function handleCellClick(event) {
    const { row, column, value } = event;
    console.log(`Clicked ${column.key}: ${value}`);
    console.log('Full row:', row);
  }
</script>

<div style="height: 400px;">
  <DataGrid
    {data}
    {columns}
    oncellclick={handleCellClick}
  />
</div>
```

Click any cell and check your browser console.

## Complete code

Here's everything together:

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', salary: 95000 },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', salary: 85000 },
    { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Manager', salary: 110000 },
    { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Engineer', salary: 92000 },
    { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', salary: 88000 }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60, sortable: false },
    { key: 'name', header: 'Name', width: 180 },
    { key: 'email', header: 'Email', width: 200 },
    { key: 'role', header: 'Role', width: 120 },
    { key: 'salary', header: 'Salary', width: 100, align: 'right' as const }
  ];

  function handleCellClick(event) {
    console.log('Clicked:', event.column.key, '=', event.value);
  }
</script>

<div style="height: 400px;">
  <DataGrid
    {data}
    {columns}
    oncellclick={handleCellClick}
  />
</div>
```

## What you learned

- Installing Svelte DataGrid
- Defining data and columns
- Rendering the grid with a height container
- Sorting by clicking headers
- Handling cell click events

## Next steps

- [Adding Selection](./adding-selection.md) - Select rows with clicks and keyboard
- [How-to: Filtering](../how-to/filtering.md) - Add search and filters
- [Reference: DataGrid](../reference/datagrid.md) - See all available props
