---
title: Virtualization
---

# Virtualization

This document explains how the grid renders large datasets efficiently using row virtualization.

## The Problem

A naive approach renders every row:

```svelte
{#each data as row}
  <Row {row} />
{/each}
```

With 10,000 rows, this creates 10,000 DOM elements. Problems:
- Initial render takes seconds
- Scrolling is janky (too many nodes to update)
- Memory usage is high
- Browser layout is slow

## The Solution: Virtualization

Only render rows that are visible in the viewport:

```
┌────────────────────────────────┐
│        (not rendered)          │  Rows 0-99
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │ Row 100                  │  │  ◄─ Viewport
│  │ Row 101                  │  │     (visible)
│  │ Row 102                  │  │
│  │ ...                      │  │
│  │ Row 119                  │  │
│  └──────────────────────────┘  │
├────────────────────────────────┤
│        (not rendered)          │  Rows 120-9999
└────────────────────────────────┘

10,000 rows, but only ~20 DOM nodes
```

## How It Works

### 1. Calculate Visible Range

Given scroll position and row height, calculate which rows are visible:

```typescript
const viewportHeight = 600;  // px
const rowHeight = 40;        // px
const scrollTop = 4000;      // px (user scrolled down)

const startIndex = Math.floor(scrollTop / rowHeight);
// = Math.floor(4000 / 40) = 100

const visibleCount = Math.ceil(viewportHeight / rowHeight);
// = Math.ceil(600 / 40) = 15

const endIndex = startIndex + visibleCount;
// = 100 + 15 = 115
```

### 2. Add Overscan Buffer

Render extra rows above and below to prevent flashing during fast scroll:

```typescript
const overscan = 5;

const renderStart = Math.max(0, startIndex - overscan);
// = Math.max(0, 100 - 5) = 95

const renderEnd = Math.min(totalRows, endIndex + overscan);
// = Math.min(10000, 115 + 5) = 120
```

Now we render rows 95-120 (25 rows) instead of 0-9999.

### 3. Position with Transform

The rendered rows need to appear in the correct position:

```svelte
<div class="scroll-container" style="height: {totalRows * rowHeight}px">
  <div class="rows" style="transform: translateY({renderStart * rowHeight}px)">
    {#each visibleRows as row}
      <Row {row} />
    {/each}
  </div>
</div>
```

The outer container has the full scrollable height (10,000 × 40 = 400,000px).
The inner div is translated to the correct Y position.

### 4. Update on Scroll

When the user scrolls, recalculate and re-render:

```typescript
function handleScroll(event) {
  scrollTop = event.target.scrollTop;
  // Svelte's reactivity updates visibleRows automatically
}
```

## Visual Explanation

```
Scroll position: 0 (top)

┌─ Total Height (400,000px) ─────────────────┐
│ ┌── Rendered Rows ──┐                      │
│ │ Row 0  (visible)  │ ◄─ Viewport          │
│ │ Row 1  (visible)  │                      │
│ │ ...               │                      │
│ │ Row 19 (visible)  │                      │
│ │ Row 20 (overscan) │                      │
│ │ Row 21 (overscan) │                      │
│ └───────────────────┘                      │
│                                            │
│     (empty space - not rendered)           │
│                                            │
└────────────────────────────────────────────┘

Scroll position: 4000px

┌─ Total Height (400,000px) ─────────────────┐
│     (empty space - not rendered)           │
│ ┌── Rendered Rows ──┐ ◄─ translateY(3800px)│
│ │ Row 95 (overscan) │                      │
│ │ Row 96 (overscan) │                      │
│ │ Row 97 (overscan) │                      │
│ │ Row 100 (visible) │ ◄─ Viewport          │
│ │ Row 101 (visible) │                      │
│ │ ...               │                      │
│ │ Row 119 (visible) │                      │
│ │ Row 120 (overscan)│                      │
│ └───────────────────┘                      │
│     (empty space - not rendered)           │
└────────────────────────────────────────────┘
```

## Fixed vs Variable Height

### Fixed Height (current)

All rows have the same height. Benefits:
- O(1) index calculation: `index = scrollTop / rowHeight`
- No layout measurement needed
- Predictable scroll behavior
- Simple implementation

### Variable Height (future)

Rows can have different heights. Challenges:
- Need to track height of each row
- Index calculation requires cumulative heights
- May need to measure content
- More complex scroll position mapping

We chose fixed height for simplicity and performance.

## Performance Characteristics

| Dataset Size | DOM Nodes | Scroll FPS | Memory |
|-------------|-----------|------------|--------|
| 100 rows | ~25 | 60 | Low |
| 10,000 rows | ~25 | 60 | Low |
| 100,000 rows | ~25 | 60 | Medium |
| 1,000,000 rows | ~25 | 60 | Medium-High |

DOM nodes stay constant regardless of data size. Memory increases with data array size, not rendered elements.

## Trade-offs

### Pros

- Constant DOM size regardless of data
- Smooth 60fps scrolling
- Low memory footprint for rendered content
- Works with any data size

### Cons

- Fixed row heights required (for now)
- Jump-to-row requires knowing target position
- Some CSS effects (e.g., nth-child) don't work correctly
- Screen readers may not see all rows

### Mitigations

- ARIA attributes help screen readers understand total row count
- Programmatic scrollToRow() API for jumping
- Future: variable height support

## See also

- [Architecture Overview](/docs/explanation/architecture) - Overall structure
- [Performance](/docs/explanation/performance) - Optimization strategies
- [Reference: DataGrid](/docs/reference/datagrid) - rowHeight, overscan props
