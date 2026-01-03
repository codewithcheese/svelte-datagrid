# Core Rendering

The DataGrid component provides a virtualized, accessible data table with column headers and row rendering.

## Usage

```svelte
<script>
  import { DataGrid } from '$lib';

  const columns = [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'name', header: 'Name', width: 200 },
    { key: 'value', header: 'Value', width: 120, align: 'right' }
  ];

  const data = [
    { id: 1, name: 'Item 1', value: 100 },
    { id: 2, name: 'Item 2', value: 200 }
  ];
</script>

<DataGrid {data} {columns} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | `TData[]` | required | Array of data rows to display |
| columns | `ColumnDef<TData>[]` | required | Column definitions |
| height | `number \| string` | `400` | Grid height (px or CSS value) |
| width | `number \| string` | `'100%'` | Grid width (px or CSS value) |
| rowHeight | `number` | `40` | Height of each row in pixels |
| headerHeight | `number` | `48` | Height of the header row in pixels |
| class | `string` | `''` | Additional CSS class for the grid container |
| rowClass | `string \| ((row, index) => string)` | - | CSS class(es) for data rows |
| loading | `boolean` | `false` | Show loading state |
| emptyMessage | `string` | `'No data to display'` | Message when data is empty |
| errorMessage | `string` | - | Error message to display |

## Column Definition

```typescript
interface ColumnDef<TData, TValue = unknown> {
  key: keyof TData | string;
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  headerClass?: string;
  cellClass?: string | ((row: TData, value: TValue) => string);
  render?: (value: TValue, row: TData, index: number) => unknown;
}
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| oncellclick | `{ row, column, value, rowIndex, event }` | Fired when a cell is clicked |
| onrowclick | `{ row, rowIndex, event }` | Fired when a row is clicked |

## States

The DataGrid supports three mutually exclusive states:

1. **Normal** - Shows data rows
2. **Loading** - Shows loading indicator (when `loading={true}`)
3. **Error** - Shows error message (when `errorMessage` is provided)
4. **Empty** - Shows empty message (when data array is empty)

Error state takes precedence over loading state.

## Accessibility

The DataGrid uses proper ARIA roles and attributes:
- Container has `role="grid"`
- `aria-rowcount` indicates total data rows
- `aria-colcount` indicates total columns
- Header cells have `role="columnheader"`
- Data cells have `role="gridcell"`

## Custom Snippets

Override default loading, empty, or error displays with snippets:

```svelte
<DataGrid {data} {columns}>
  {#snippet loadingSnippet()}
    <MyLoadingSpinner />
  {/snippet}

  {#snippet emptySnippet()}
    <MyEmptyState />
  {/snippet}

  {#snippet errorSnippet(message)}
    <MyErrorDisplay {message} />
  {/snippet}
</DataGrid>
```

## Notes

- The grid container must have a defined height for virtualization to work
- Column widths default to 150px if not specified
- The grid uses CSS custom properties for theming (see theming.md)
