# CSS Variables Reference

Svelte DataGrid uses CSS custom properties (variables) for theming. Override these variables to customize the grid's appearance.

## Usage

Set CSS variables on the grid container or any parent element:

```svelte
<div style="--datagrid-primary-color: #6366f1;">
  <DataGrid {data} {columns} />
</div>
```

Or in your global CSS:

```css
:root {
  --datagrid-primary-color: #6366f1;
  --datagrid-border-radius: 8px;
}
```

---

## Grid Container

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-bg` | `#fff` | Grid background color |
| `--datagrid-color` | `#333` | Default text color |
| `--datagrid-border-color` | `#e0e0e0` | Border color |
| `--datagrid-border-radius` | `4px` | Container border radius |
| `--datagrid-font-family` | `system-ui, -apple-system, sans-serif` | Font family |
| `--datagrid-font-size` | `14px` | Base font size |

---

## Primary & Accent Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-primary-color` | `#1976d2` | Primary accent color (sort indicators, focus rings) |
| `--datagrid-focus-color` | `#1976d2` | Focus ring color |
| `--datagrid-muted-color` | `#666` | Muted text color |

---

## Header

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-header-bg` | `#f5f5f5` | Header background |
| `--datagrid-header-color` | `#333` | Header text color |
| `--datagrid-header-hover-bg` | `#eeeeee` | Header hover background |

---

## Rows

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-row-bg` | `#fff` | Row background |
| `--datagrid-row-alt-bg` | `#fafafa` | Alternating row background |
| `--datagrid-row-border-color` | `#f0f0f0` | Row border color |
| `--datagrid-row-hover-bg` | `#f5f5f5` | Row hover background |
| `--datagrid-row-selected-bg` | `#e3f2fd` | Selected row background |
| `--datagrid-row-selected-hover-bg` | `#bbdefb` | Selected row hover background |

---

## Filters & Search

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-filter-bg` | `#fafafa` | Filter row background |
| `--datagrid-input-bg` | `#fff` | Input field background |
| `--datagrid-hover-bg` | `#f0f0f0` | Hover background for interactive elements |

---

## Editing

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-edit-bg` | `#fff` | Editor background |
| `--datagrid-edit-border-color` | `#3b82f6` | Editor border color |
| `--datagrid-edit-focus-color` | `#2563eb` | Editor focus border color |
| `--datagrid-edit-focus-ring` | `rgba(59, 130, 246, 0.3)` | Editor focus ring |
| `--datagrid-edit-error-bg` | `#fef2f2` | Editor error background |
| `--datagrid-edit-error-color` | `#dc2626` | Editor error text color |

---

## Error States

| Variable | Default | Description |
|----------|---------|-------------|
| `--datagrid-error-color` | `#d32f2f` | Error text color |
| `--datagrid-error-bg` | `#ffebee` | Error background |

---

## Dark Theme Example

```css
.dark-theme {
  --datagrid-bg: #1e1e1e;
  --datagrid-color: #e0e0e0;
  --datagrid-border-color: #333;
  --datagrid-muted-color: #888;

  --datagrid-header-bg: #252525;
  --datagrid-header-color: #e0e0e0;
  --datagrid-header-hover-bg: #333;

  --datagrid-row-bg: #1e1e1e;
  --datagrid-row-alt-bg: #252525;
  --datagrid-row-border-color: #333;
  --datagrid-row-hover-bg: #2a2a2a;
  --datagrid-row-selected-bg: #1e3a5f;
  --datagrid-row-selected-hover-bg: #254a73;

  --datagrid-filter-bg: #252525;
  --datagrid-input-bg: #1e1e1e;
  --datagrid-hover-bg: #333;

  --datagrid-primary-color: #64b5f6;
  --datagrid-focus-color: #64b5f6;
}
```

---

## Brand Colors Example

```css
.brand-theme {
  --datagrid-primary-color: #6366f1;    /* Indigo */
  --datagrid-focus-color: #6366f1;
  --datagrid-row-selected-bg: #eef2ff;
  --datagrid-row-selected-hover-bg: #e0e7ff;
  --datagrid-header-bg: #f8fafc;
  --datagrid-border-radius: 8px;
}
```

---

## Compact Theme Example

```css
.compact-theme {
  --datagrid-font-size: 12px;
  --datagrid-border-radius: 2px;
}
```

---

## See also

- [How-to: Theming](../how-to/theming.md)
- [Reference: DataGrid](./datagrid.md)
