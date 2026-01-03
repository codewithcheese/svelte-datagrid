# Virtualization

The DataGrid uses virtual scrolling to efficiently render large datasets by only rendering visible rows.

## How It Works

1. **Visible Range Calculation**: Based on scroll position and container height, the virtualizer calculates which rows are visible
2. **Overscan**: Additional rows are rendered above and below the visible area for smooth scrolling
3. **Position Calculation**: Each row is absolutely positioned based on its index and row height

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| height | `number \| string` | `400` | Container height (required for virtualization) |
| rowHeight | `number` | `40` | Fixed height of each row in pixels |
| overscan | `number` | `5` | Number of extra rows to render outside viewport |

## Usage

Virtualization is automatic when you provide data and a fixed height:

```svelte
<DataGrid
  data={largeDataset}
  columns={columns}
  height={600}
  rowHeight={40}
  overscan={3}
/>
```

## Performance Characteristics

| Dataset Size | Rendered Rows | DOM Nodes |
|--------------|---------------|-----------|
| 1,000 | ~20 | ~60 |
| 10,000 | ~20 | ~60 |
| 100,000 | ~20 | ~60 |

The number of rendered rows stays constant regardless of dataset size.

## Scroll Performance

With virtualization:
- Initial render: ~1-2ms
- Scroll updates: <1ms per frame
- Memory usage: Constant regardless of data size

## Implementation Details

The virtualizer maintains:
- `scrollTop`: Current scroll position
- `containerHeight`: Visible area height
- `visibleRange`: Start and end indices of rows to render

```typescript
const visibleRange = {
  start: Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
  end: Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan)
};
```

## CSS Considerations

The grid body uses relative positioning with a spacer element:

```css
.datagrid-body {
  position: relative;
  overflow-y: auto;
}

.datagrid-spacer {
  height: [totalRows * rowHeight]px;
}

.datagrid-row {
  position: absolute;
  top: [rowIndex * rowHeight]px;
}
```

## Notes

- All rows must have the same height (variable row heights not yet supported)
- The container must have a defined height
- Horizontal virtualization is not currently implemented (all columns render)
- Use the `overscan` prop to balance smooth scrolling vs DOM node count
