---
title: CSS Variables
---

# CSS Variables Reference

Customize the grid appearance using CSS custom properties.

## Usage

Override variables on the grid container:

```svelte
<div class="my-grid">
  <DataGrid {data} {columns} />
</div>

<style>
  .my-grid {
    --datagrid-header-bg: #1e40af;
    --datagrid-header-color: white;
  }
</style>
```

Or use inline styles:

```svelte
<div style="--datagrid-header-bg: #1e40af;">
  <DataGrid {data} {columns} />
</div>
```

## Container Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-bg` | `#ffffff` | Grid background color |
| `--datagrid-color` | `#111827` | Default text color |
| `--datagrid-border-color` | `#e5e7eb` | Border color for grid and cells |
| `--datagrid-font-family` | `system-ui, sans-serif` | Font family |
| `--datagrid-font-size` | `14px` | Base font size |

## Header Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-header-bg` | `#f9fafb` | Header row background |
| `--datagrid-header-color` | `#111827` | Header text color |
| `--datagrid-header-font-weight` | `600` | Header font weight |
| `--datagrid-header-height` | `48px` | Header row height |

## Row Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-row-bg` | `transparent` | Default row background |
| `--datagrid-row-hover-bg` | `#f3f4f6` | Row background on hover |
| `--datagrid-row-stripe-bg` | `#f9fafb` | Alternating row background |
| `--datagrid-row-height` | `40px` | Data row height |

## Cell Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-cell-padding` | `8px 12px` | Cell padding |
| `--datagrid-cell-color` | `inherit` | Cell text color |

## Selection Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-selected-bg` | `#eff6ff` | Selected row background |
| `--datagrid-selected-border` | `#3b82f6` | Selected row border color |
| `--datagrid-selected-color` | `inherit` | Selected row text color |
| `--datagrid-focus-ring` | `#3b82f6` | Focus indicator color |
| `--datagrid-focus-ring-width` | `2px` | Focus indicator width |

## Filter Row Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-filter-bg` | `#f3f4f6` | Filter row background |
| `--datagrid-filter-height` | `36px` | Filter row height |
| `--datagrid-filter-input-bg` | `#ffffff` | Filter input background |
| `--datagrid-filter-input-border` | `#d1d5db` | Filter input border |
| `--datagrid-filter-input-focus` | `#3b82f6` | Filter input focus border |

## Resize Handle Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-resize-handle-color` | `#d1d5db` | Resize handle default color |
| `--datagrid-resize-handle-hover` | `#3b82f6` | Resize handle hover color |
| `--datagrid-resize-handle-active` | `#2563eb` | Resize handle active color |
| `--datagrid-resize-handle-width` | `4px` | Resize handle width |

## Sort Indicator Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-sort-indicator-color` | `#6b7280` | Sort arrow color |
| `--datagrid-sort-indicator-active` | `#111827` | Active sort arrow color |

## Loading & Empty State Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-loading-bg` | `rgba(255,255,255,0.8)` | Loading overlay background |
| `--datagrid-loading-color` | `#6b7280` | Loading text color |
| `--datagrid-empty-color` | `#9ca3af` | Empty message color |
| `--datagrid-error-color` | `#ef4444` | Error message color |
| `--datagrid-error-bg` | `#fef2f2` | Error background color |

## Edit Mode Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-edit-bg` | `#ffffff` | Edit input background |
| `--datagrid-edit-border` | `#3b82f6` | Edit input border |
| `--datagrid-edit-error-border` | `#ef4444` | Validation error border |
| `--datagrid-edit-error-color` | `#ef4444` | Validation error text |

## Theme Examples

### Dark Theme

```css
.dark-theme {
  --datagrid-bg: #1f2937;
  --datagrid-color: #e5e7eb;
  --datagrid-border-color: #374151;
  --datagrid-header-bg: #111827;
  --datagrid-header-color: #f9fafb;
  --datagrid-row-bg: #1f2937;
  --datagrid-row-hover-bg: #374151;
  --datagrid-row-stripe-bg: #111827;
  --datagrid-selected-bg: #1e3a5f;
  --datagrid-selected-border: #60a5fa;
  --datagrid-filter-bg: #111827;
  --datagrid-filter-input-bg: #374151;
  --datagrid-filter-input-border: #4b5563;
  --datagrid-loading-bg: rgba(31, 41, 55, 0.8);
  --datagrid-empty-color: #6b7280;
}
```

### Brand Theme

```css
.brand-theme {
  --brand-primary: #7c3aed;
  --brand-primary-light: #a78bfa;
  --brand-primary-bg: #ede9fe;

  --datagrid-header-bg: var(--brand-primary);
  --datagrid-header-color: white;
  --datagrid-selected-bg: var(--brand-primary-bg);
  --datagrid-selected-border: var(--brand-primary);
  --datagrid-focus-ring: var(--brand-primary-light);
  --datagrid-resize-handle-hover: var(--brand-primary);
  --datagrid-filter-input-focus: var(--brand-primary);
}
```

### Compact Theme

```css
.compact-theme {
  --datagrid-font-size: 12px;
  --datagrid-header-height: 36px;
  --datagrid-row-height: 28px;
  --datagrid-cell-padding: 4px 8px;
  --datagrid-filter-height: 28px;
}
```

## See also

- [How-to: Theming](/docs/how-to/theming) - Theming guide
- [How-to: Row Styling](/docs/how-to/row-styling) - Conditional row styles
- [Reference: Column Definition](/docs/reference/column-definition) - Cell classes
