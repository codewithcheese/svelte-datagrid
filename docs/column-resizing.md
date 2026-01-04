# Column Resizing

Users can resize columns by dragging the edge of column headers.

## Usage

Enable resizing with the `resizable` prop:

```svelte
<DataGrid
  data={data}
  columns={columns}
  resizable={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| resizable | `boolean` | `true` | Enable/disable column resizing |

## Column-Level Control

Override global resizing per column:

```typescript
const columns = [
  { key: 'id', header: 'ID', width: 80, resizable: false },
  { key: 'name', header: 'Name', width: 200, resizable: true },
  { key: 'description', header: 'Description', resizable: true }
];
```

## Column Width Constraints

Set minimum and maximum widths:

```typescript
const columns = [
  {
    key: 'name',
    header: 'Name',
    width: 200,
    minWidth: 100,
    maxWidth: 400
  }
];
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| width | `number` | `150` | Initial column width |
| minWidth | `number` | `50` | Minimum allowed width |
| maxWidth | `number` | - | Maximum allowed width |

## Interaction

- **Drag**: Click and drag the resize handle on the right edge of a header
- **Visual Feedback**: Handle highlights on hover
- **Cursor**: Changes to `col-resize` when hovering the handle

## Resize Handle

A 6px wide interactive area on the right edge of each header cell:

```css
.datagrid-resize-handle {
  position: absolute;
  right: 0;
  width: 6px;
  cursor: col-resize;
}
```

## Notes

- Column widths are stored in grid state and persist during the session
- Resizing triggers re-calculation of row layouts
- The minimum width default (50px) prevents columns from becoming too narrow
- Resize handles are keyboard accessible (focus + arrow keys planned)
