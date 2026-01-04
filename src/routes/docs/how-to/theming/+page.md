---
title: Theming
---

# How to Theme the Grid

This guide shows how to customize the grid's appearance using CSS custom properties.

## Quick theming

Override CSS custom properties on the grid container:

```svelte
<div style="--datagrid-header-bg: #1e40af; --datagrid-header-color: white;">
  <DataGrid {data} {columns} />
</div>
```

Or use a CSS class:

```svelte
<DataGrid {data} {columns} class="my-theme" />

<style>
  :global(.my-theme) {
    --datagrid-header-bg: #1e40af;
    --datagrid-header-color: white;
    --datagrid-selected-bg: #dbeafe;
  }
</style>
```

## Available CSS variables

### Container

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-bg` | `#ffffff` | Grid background |
| `--datagrid-border-color` | `#e5e7eb` | Border color |
| `--datagrid-font-family` | `system-ui` | Font family |
| `--datagrid-font-size` | `14px` | Base font size |

### Header

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-header-bg` | `#f9fafb` | Header background |
| `--datagrid-header-color` | `#111827` | Header text color |
| `--datagrid-header-font-weight` | `600` | Header font weight |

### Rows

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-row-bg` | `transparent` | Row background |
| `--datagrid-row-hover-bg` | `#f3f4f6` | Row hover background |
| `--datagrid-row-stripe-bg` | `#f9fafb` | Alternating row background |
| `--datagrid-cell-padding` | `8px 12px` | Cell padding |

### Selection

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-selected-bg` | `#eff6ff` | Selected row background |
| `--datagrid-selected-border` | `#3b82f6` | Selected row border |
| `--datagrid-focus-ring` | `#3b82f6` | Focus indicator color |

### Resize handle

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-resize-handle-color` | `#d1d5db` | Resize handle color |
| `--datagrid-resize-handle-hover` | `#3b82f6` | Resize handle hover |
| `--datagrid-resize-handle-width` | `4px` | Resize handle width |

### Filter row

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-filter-bg` | `#f3f4f6` | Filter row background |
| `--datagrid-filter-input-bg` | `#ffffff` | Filter input background |
| `--datagrid-filter-input-border` | `#d1d5db` | Filter input border |

## Dark theme example

```svelte
<DataGrid {data} {columns} class="dark-theme" />

<style>
  :global(.dark-theme) {
    --datagrid-bg: #1f2937;
    --datagrid-border-color: #374151;
    --datagrid-header-bg: #111827;
    --datagrid-header-color: #f9fafb;
    --datagrid-row-bg: #1f2937;
    --datagrid-row-hover-bg: #374151;
    --datagrid-row-stripe-bg: #111827;
    --datagrid-selected-bg: #1e3a5f;
    --datagrid-selected-border: #60a5fa;
    --datagrid-cell-color: #e5e7eb;
    --datagrid-filter-bg: #111827;
    --datagrid-filter-input-bg: #374151;
    --datagrid-filter-input-border: #4b5563;
  }
</style>
```

## Brand color theme

Match your brand colors:

```svelte
<style>
  :global(.brand-theme) {
    /* Use your brand primary color */
    --brand-primary: #7c3aed;
    --brand-primary-light: #a78bfa;
    --brand-primary-bg: #ede9fe;

    --datagrid-header-bg: var(--brand-primary);
    --datagrid-header-color: white;
    --datagrid-selected-bg: var(--brand-primary-bg);
    --datagrid-selected-border: var(--brand-primary);
    --datagrid-focus-ring: var(--brand-primary-light);
    --datagrid-resize-handle-hover: var(--brand-primary);
  }
</style>
```

## Conditional row styling

Apply styles to specific rows:

```svelte
<DataGrid
  {data}
  {columns}
  rowClass={(row, index) => {
    if (row.status === 'error') return 'row-error';
    if (row.status === 'warning') return 'row-warning';
    return '';
  }}
/>

<style>
  :global(.row-error) {
    background: #fef2f2 !important;
    color: #991b1b;
  }

  :global(.row-warning) {
    background: #fffbeb !important;
    color: #92400e;
  }
</style>
```

## Complete example

```svelte
<script lang="ts">
  import { DataGrid } from 'svelte-datagrid';

  const data = [
    { id: 1, name: 'Alice', status: 'active', amount: 1250 },
    { id: 2, name: 'Bob', status: 'pending', amount: 830 },
    { id: 3, name: 'Carol', status: 'inactive', amount: 2100 }
  ];

  const columns = [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', width: 150 },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      cellClass: (row, value) => `status-${value}`
    },
    { key: 'amount', header: 'Amount', width: 100, align: 'right' }
  ];

  let theme = $state('light');
</script>

<div style="margin-bottom: 8px;">
  <button onclick={() => theme = 'light'}>Light</button>
  <button onclick={() => theme = 'dark'}>Dark</button>
  <button onclick={() => theme = 'brand'}>Brand</button>
</div>

<div style="height: 300px;" class={theme}>
  <DataGrid {data} {columns} selectable />
</div>

<style>
  :global(.light) {
    /* Default theme - no overrides needed */
  }

  :global(.dark) {
    --datagrid-bg: #1f2937;
    --datagrid-border-color: #374151;
    --datagrid-header-bg: #111827;
    --datagrid-header-color: #f9fafb;
    --datagrid-row-hover-bg: #374151;
    --datagrid-selected-bg: #1e3a5f;
  }

  :global(.brand) {
    --datagrid-header-bg: #7c3aed;
    --datagrid-header-color: white;
    --datagrid-selected-bg: #ede9fe;
    --datagrid-selected-border: #7c3aed;
  }

  :global(.status-active) { color: #059669; }
  :global(.status-pending) { color: #d97706; }
  :global(.status-inactive) { color: #dc2626; }
</style>
```

## See also

- [Reference: CSS Variables](/docs/reference/css-variables) - Complete variable list
- [Reference: Column Definition](/docs/reference/column-definition) - cellClass and headerClass
