# Selection

The DataGrid supports single and multi-row selection.

## Usage

Enable selection with the `selectable` prop:

```svelte
<DataGrid
  data={data}
  columns={columns}
  selectable={true}
  onselectionchange={handleSelection}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| selectable | `boolean \| 'single' \| 'multiple'` | `false` | Selection mode |
| getRowId | `(row, index) => string \| number` | - | Function to get unique row ID |

## Selection Modes

| Value | Behavior |
|-------|----------|
| `false` | Selection disabled |
| `true` or `'single'` | Only one row can be selected |
| `'multiple'` | Multiple rows can be selected |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| onselectionchange | `{ selected, added, removed }` | Fired when selection changes |

```typescript
function handleSelection(event) {
  console.log(event.selected);  // Set<string|number>
  console.log(event.added);     // Array of newly selected IDs
  console.log(event.removed);   // Array of deselected IDs
}
```

## Row Identification

By default, rows are identified by their index. Provide `getRowId` for stable identification:

```svelte
<DataGrid
  data={data}
  columns={columns}
  selectable="multiple"
  getRowId={(row) => row.id}
/>
```

## Interaction

### Single Selection
- **Click Row**: Select row (deselects others)
- **Click Again**: Keeps row selected

### Multiple Selection
- **Click Row**: Select row (deselects others)
- **Ctrl/Cmd + Click**: Toggle row selection
- **Shift + Click**: Select range from last selected

### Keyboard
- **Space/Enter**: Toggle selection on focused row
- **Arrow Keys**: Navigate between rows

## Visual Feedback

Selected rows have a distinct style:

```css
.datagrid-row.selected {
  background: var(--datagrid-selected-bg);
}
```

## Controlled Selection

Manage selection externally:

```svelte
<script>
  let selectedIds = $state(new Set());

  function handleSelection(event) {
    selectedIds = event.selected;
  }

  function selectAll() {
    selectedIds = new Set(data.map(row => row.id));
  }

  function clearSelection() {
    selectedIds = new Set();
  }
</script>

<button onclick={selectAll}>Select All</button>
<button onclick={clearSelection}>Clear</button>

<DataGrid
  {data}
  {columns}
  selectable="multiple"
  getRowId={(row) => row.id}
  onselectionchange={handleSelection}
/>

<p>Selected: {selectedIds.size} rows</p>
```

## Notes

- Without `getRowId`, selection is index-based and may not persist across data updates
- Selection state is maintained in the grid's internal state
- Selected row IDs are stored as a Set for O(1) lookup
