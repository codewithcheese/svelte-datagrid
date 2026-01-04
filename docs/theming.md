# Theming

The DataGrid uses CSS custom properties for theming, allowing easy customization.

## CSS Custom Properties

Override these variables to customize the grid appearance:

### Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-bg` | `#fff` | Grid background |
| `--datagrid-color` | `#333` | Text color |
| `--datagrid-border-color` | `#e0e0e0` | Border color |
| `--datagrid-header-bg` | `#f5f5f5` | Header background |
| `--datagrid-header-color` | `#333` | Header text color |
| `--datagrid-header-hover-bg` | `#eeeeee` | Header hover background |
| `--datagrid-row-hover-bg` | `#f5f5f5` | Row hover background |
| `--datagrid-selected-bg` | `#e3f2fd` | Selected row background |
| `--datagrid-primary-color` | `#1976d2` | Primary accent color |
| `--datagrid-focus-color` | `#1976d2` | Focus outline color |
| `--datagrid-muted-color` | `#666` | Muted text (empty, loading) |
| `--datagrid-error-color` | `#d32f2f` | Error text color |
| `--datagrid-error-bg` | `#ffebee` | Error background |

### Typography

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-font-family` | `system-ui, -apple-system, sans-serif` | Font family |
| `--datagrid-font-size` | `14px` | Base font size |

### Dimensions

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-border-radius` | `4px` | Container border radius |

## Usage

### Global Theming

Set variables on the grid container or a parent element:

```css
.my-app {
  --datagrid-primary-color: #6200ee;
  --datagrid-header-bg: #f3e5f5;
  --datagrid-selected-bg: #ede7f6;
}
```

### Per-Instance Theming

Use the `class` prop to scope styles:

```svelte
<DataGrid
  data={data}
  columns={columns}
  class="dark-theme"
/>

<style>
  :global(.dark-theme) {
    --datagrid-bg: #1e1e1e;
    --datagrid-color: #ffffff;
    --datagrid-border-color: #424242;
    --datagrid-header-bg: #2d2d2d;
    --datagrid-row-hover-bg: #333333;
  }
</style>
```

## Theme Examples

### Dark Theme

```css
.datagrid-dark {
  --datagrid-bg: #121212;
  --datagrid-color: #e0e0e0;
  --datagrid-border-color: #333;
  --datagrid-header-bg: #1e1e1e;
  --datagrid-header-color: #fff;
  --datagrid-header-hover-bg: #2d2d2d;
  --datagrid-row-hover-bg: #1e1e1e;
  --datagrid-selected-bg: #1a237e;
  --datagrid-primary-color: #90caf9;
  --datagrid-muted-color: #9e9e9e;
}
```

### High Contrast

```css
.datagrid-high-contrast {
  --datagrid-bg: #000;
  --datagrid-color: #fff;
  --datagrid-border-color: #fff;
  --datagrid-header-bg: #000;
  --datagrid-header-color: #fff;
  --datagrid-row-hover-bg: #333;
  --datagrid-selected-bg: #00f;
  --datagrid-primary-color: #ff0;
  --datagrid-focus-color: #ff0;
}
```

## Row and Cell Classes

Apply custom classes to rows and cells:

```svelte
<DataGrid
  {data}
  {columns}
  rowClass={(row, index) => row.isUrgent ? 'urgent-row' : ''}
/>

<style>
  :global(.urgent-row) {
    background: #fff3e0 !important;
  }
</style>
```

Column-level cell classes:

```typescript
const columns = [
  {
    key: 'status',
    header: 'Status',
    cellClass: (row, value) => `status-${value.toLowerCase()}`
  }
];
```

## Notes

- CSS custom properties cascade, so parent values are inherited
- Use `!important` sparingly for row/cell class overrides
- The grid uses `box-sizing: border-box` internally
- Font smoothing and anti-aliasing are handled by the browser
