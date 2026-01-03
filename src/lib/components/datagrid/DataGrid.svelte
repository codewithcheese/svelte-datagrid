<script lang="ts" module>
	import type { ColumnDef, GridCellClickEvent, GridRowClickEvent, GridSortEvent, GridSelectionChangeEvent, SelectionMode } from '../../types/index.js';

	export interface DataGridProps<TData> {
		/** Data rows to display */
		data: TData[];
		/** Column definitions */
		columns: ColumnDef<TData, any>[];
		/** Grid height (number for pixels, string for CSS value) */
		height?: number | string;
		/** Grid width (number for pixels, string for CSS value) */
		width?: number | string;
		/** Row height in pixels */
		rowHeight?: number;
		/** Header height in pixels */
		headerHeight?: number;
		/** Enable column sorting */
		sortable?: boolean;
		/** Enable column filtering */
		filterable?: boolean;
		/** Enable column resizing */
		resizable?: boolean;
		/** Enable row selection */
		selectable?: boolean | SelectionMode;
		/** Number of rows to render outside the viewport */
		overscan?: number;
		/** Function to get unique row ID */
		getRowId?: (row: TData, index: number) => string | number;
		/** Additional CSS class */
		class?: string;
		/** Row CSS class */
		rowClass?: string | ((row: TData, index: number) => string);
		/** Show loading state */
		loading?: boolean;
		/** Message to show when no data */
		emptyMessage?: string;
		/** Error message to display */
		errorMessage?: string;
	}
</script>

<script lang="ts" generics="TData">
	import { setContext, type Snippet } from 'svelte';
	import { createGridState } from '../../state/grid-state.svelte.js';
	import Header from './core/Header.svelte';
	import Body from './core/Body.svelte';

	type Props = DataGridProps<TData> & {
		oncellclick?: (event: GridCellClickEvent<TData>) => void;
		onrowclick?: (event: GridRowClickEvent<TData>) => void;
		onsortchange?: (event: GridSortEvent) => void;
		onselectionchange?: (event: GridSelectionChangeEvent) => void;
		loadingSnippet?: Snippet;
		emptySnippet?: Snippet;
		errorSnippet?: Snippet<[string]>;
	};

	let {
		data,
		columns,
		height = 400,
		width = '100%',
		rowHeight = 40,
		headerHeight = 48,
		sortable = true,
		filterable = false,
		resizable = true,
		selectable = false,
		overscan = 5,
		getRowId,
		class: className = '',
		rowClass,
		loading = false,
		emptyMessage = 'No data to display',
		errorMessage,
		oncellclick,
		onrowclick,
		onsortchange,
		onselectionchange,
		loadingSnippet,
		emptySnippet,
		errorSnippet
	}: Props = $props();

	// Determine selection mode
	const selectionMode: SelectionMode = $derived(
		typeof selectable === 'string' ? selectable : selectable ? 'single' : 'none'
	);

	// Create grid state - use $derived for reactive options
	const gridStateOptions = $derived({
		data,
		columns: columns as ColumnDef<TData>[],
		rowHeight,
		headerHeight,
		overscan,
		getRowId,
		selectionMode,
		onSortChange: (sort: any) => {
			if (sort.length > 0) {
				onsortchange?.({
					columnKey: sort[0].columnKey,
					direction: sort[0].direction,
					multiSort: sort.length > 1
				});
			}
		},
		onSelectionChange: (selected: Set<string | number>) => {
			onselectionchange?.({
				selected,
				added: [],
				removed: []
			});
		}
	});

	const gridState = createGridState<TData>(gridStateOptions);

	// Provide grid state to child components
	setContext('datagrid', gridState);

	// Set options context - must be done synchronously
	// Wrap in a function to allow child components to get latest values
	setContext('datagrid-options', {
		get sortable() { return sortable; },
		get filterable() { return filterable; },
		get resizable() { return resizable; },
		get selectable() { return selectionMode !== 'none'; },
		get rowClass() { return rowClass; },
		get oncellclick() { return oncellclick; },
		get onrowclick() { return onrowclick; }
	});

	// Sync external data/columns changes
	$effect(() => {
		gridState.updateData(data);
	});

	$effect(() => {
		gridState.updateColumns(columns as ColumnDef<TData>[]);
	});

	// Container element reference
	let containerEl: HTMLDivElement | undefined = $state();

	// ResizeObserver for container size
	$effect(() => {
		if (!containerEl) return;

		const observer = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			gridState.setContainerSize(width, height - headerHeight);
		});

		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	// Computed styles
	const containerStyle = $derived(
		`height: ${typeof height === 'number' ? `${height}px` : height}; width: ${typeof width === 'number' ? `${width}px` : width};`
	);
</script>

<div
	class="datagrid {className}"
	style={containerStyle}
	bind:this={containerEl}
	role="grid"
	aria-rowcount={gridState.processedData.length}
	aria-colcount={columns.length}
	data-testid="datagrid"
>
	<Header {headerHeight} />

	{#if errorMessage}
		<div class="datagrid-error" role="alert" data-testid="datagrid-error">
			{#if errorSnippet}
				{@render errorSnippet(errorMessage)}
			{:else}
				<span class="datagrid-error-icon">!</span>
				<span>{errorMessage}</span>
			{/if}
		</div>
	{:else if loading}
		<div class="datagrid-loading" data-testid="datagrid-loading">
			{#if loadingSnippet}
				{@render loadingSnippet()}
			{:else}
				<span class="datagrid-spinner"></span>
				<span>Loading...</span>
			{/if}
		</div>
	{:else if gridState.processedData.length === 0}
		<div class="datagrid-empty" data-testid="datagrid-empty">
			{#if emptySnippet}
				{@render emptySnippet()}
			{:else}
				{emptyMessage}
			{/if}
		</div>
	{:else}
		<Body />
	{/if}
</div>

<style>
	.datagrid {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--datagrid-border-color, #e0e0e0);
		border-radius: var(--datagrid-border-radius, 4px);
		overflow: hidden;
		font-family: var(--datagrid-font-family, system-ui, -apple-system, sans-serif);
		font-size: var(--datagrid-font-size, 14px);
		background: var(--datagrid-bg, #fff);
		color: var(--datagrid-color, #333);
	}

	.datagrid-loading,
	.datagrid-empty,
	.datagrid-error {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 8px;
		color: var(--datagrid-muted-color, #666);
		padding: 24px;
		text-align: center;
	}

	.datagrid-error {
		color: var(--datagrid-error-color, #d32f2f);
		background: var(--datagrid-error-bg, #ffebee);
	}

	.datagrid-error-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--datagrid-error-color, #d32f2f);
		color: white;
		font-weight: bold;
		font-size: 12px;
	}

	.datagrid-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--datagrid-border-color, #e0e0e0);
		border-top-color: var(--datagrid-primary-color, #1976d2);
		border-radius: 50%;
		animation: datagrid-spin 0.8s linear infinite;
	}

	@keyframes datagrid-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
