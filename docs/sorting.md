# Sorting

The DataGrid supports single and multi-column sorting with ascending/descending directions.

## Usage

Enable sorting with the `sortable` prop:

```svelte
<DataGrid
  data={data}
  columns={columns}
  sortable={true}
  onsortchange={handleSort}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| sortable | `boolean` | `true` | Enable/disable column sorting |

## Column-Level Control

Override global sorting per column:

```typescript
const columns = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'actions', header: 'Actions', sortable: false }
];
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| onsortchange | `{ columnKey, direction, multiSort }` | Fired when sort state changes |

```typescript
function handleSort(event) {
  console.log(event.columnKey);   // 'name'
  console.log(event.direction);   // 'asc' | 'desc'
  console.log(event.multiSort);   // false
}
```

## Interaction

- **Single Click**: Sort by column (ascending)
- **Click Again**: Toggle direction (descending)
- **Shift + Click**: Add column to multi-sort
- **Keyboard**: Enter or Space on focused header

## Visual Indicators

Sorted columns display an arrow indicator:
- `↑` for ascending
- `↓` for descending

## Multi-Sort

Hold Shift while clicking headers to sort by multiple columns:

1. First column is primary sort
2. Second column breaks ties in primary
3. And so on...

## Custom Sort Functions

Provide a custom comparator per column:

```typescript
const columns = [
  {
    key: 'date',
    header: 'Date',
    compare: (a, b) => new Date(a).getTime() - new Date(b).getTime()
  }
];
```

## Controlled Sorting

For server-side sorting, handle the event and update data:

```svelte
<script>
  let data = $state(initialData);

  async function handleSort(event) {
    const { columnKey, direction } = event;
    data = await fetchSortedData(columnKey, direction);
  }
</script>

<DataGrid
  {data}
  {columns}
  onsortchange={handleSort}
/>
```

## Notes

- Sorting is performed in-memory by default
- For large datasets with server-side sorting, use the `onsortchange` event
- Sort state is maintained internally but can be controlled externally
- Null and undefined values sort to the end
