<script lang="ts" module>
	import type {
		ColumnDef,
		GridCellClickEvent,
		GridRowClickEvent,
		GridSortEvent,
		GridSelectionChangeEvent,
		GridCellEditEvent,
		SelectionMode
	} from '../../types/index.js';
	import type { DataSource } from '../../query/types.js';

	export interface DataGridProps<TData extends Record<string, unknown>> {
		/** Data rows to display (alternative to dataSource) */
		data?: TData[];
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
		/** Enable global search bar */
		searchable?: boolean;
		/** Enable column resizing */
		resizable?: boolean;
		/** Enable column reordering via drag-and-drop */
		reorderable?: boolean;
		/** Enable row selection */
		selectable?: boolean | SelectionMode;
		/** Enable cell editing */
		editable?: boolean;
		/** Number of rows to render outside the viewport */
		overscan?: number;
		/** Function to get unique row ID */
		getRowId?: (row: TData, index: number) => string | number;
		/** Additional CSS class */
		class?: string;
		/** Row CSS class */
		rowClass?: string | ((row: TData, index: number) => string);
		/** Show loading state (overrides internal loading state) */
		loading?: boolean;
		/** Message to show when no data */
		emptyMessage?: string;
		/** Error message to display (overrides internal error state) */
		errorMessage?: string;
		/**
		 * DataSource for data fetching and persistence (alternative to data prop).
		 * When provided, the grid fetches data from this source.
		 * If it's a MutableDataSource, edits are automatically persisted.
		 */
		dataSource?: DataSource<TData>;
	}
</script>

<script lang="ts" generics="TData extends Record<string, unknown>">
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { GridEngine, createGridEngine } from '../../engine/index.js';

	// Convert SelectionMode to GridEngine selectable format
	function normalizeSelectable(
		selectable: boolean | SelectionMode | undefined
	): boolean | 'single' | 'multiple' | undefined {
		if (selectable === 'none') return false;
		return selectable as boolean | 'single' | 'multiple' | undefined;
	}

	type Props = DataGridProps<TData> & {
		oncellclick?: (event: GridCellClickEvent<TData>) => void;
		onrowclick?: (event: GridRowClickEvent<TData>) => void;
		onsortchange?: (event: GridSortEvent) => void;
		onselectionchange?: (event: GridSelectionChangeEvent) => void;
		oncelledit?: (event: GridCellEditEvent<TData>) => void;
		oncellvalidate?: (rowId: string | number, columnKey: string, value: unknown) => string | null;
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
		searchable = false,
		resizable = true,
		reorderable = false,
		selectable = false,
		editable = false,
		overscan = 5,
		getRowId,
		class: className = '',
		rowClass,
		loading,
		emptyMessage = 'No data to display',
		errorMessage,
		dataSource,
		oncellclick,
		onrowclick,
		onsortchange,
		onselectionchange,
		oncelledit,
		oncellvalidate,
		loadingSnippet,
		emptySnippet,
		errorSnippet
	}: Props = $props();

	// Container element
	let containerEl: HTMLDivElement | undefined = $state();

	// GridEngine instance
	let engine: GridEngine<TData> | null = $state(null);

	// Computed styles
	const containerStyle = $derived(
		`height: ${typeof height === 'number' ? `${height}px` : height}; width: ${typeof width === 'number' ? `${width}px` : width};`
	);

	// Effective loading/error states
	// Note: explicit type casting needed due to Svelte 5 generic type inference issue
	const isLoading = $derived(loading ?? (engine as GridEngine<TData> | null)?.isLoading ?? false);
	const displayError = $derived(errorMessage ?? null);
	const isEmpty = $derived.by(() => {
		const e = engine as GridEngine<TData> | null;
		return e ? e.rows.length === 0 && !isLoading : true;
	});
	const rowCount = $derived((engine as GridEngine<TData> | null)?.totalRowCount ?? 0);

	// Initialize engine on mount
	onMount(() => {
		if (!containerEl) return;

		engine = createGridEngine<TData>(containerEl, {
			data,
			dataSource,
			columns: columns as ColumnDef<TData>[],
			rowHeight,
			headerHeight,
			overscan,
			getRowId,
			sortable,
			filterable,
			searchable,
			resizable,
			reorderable,
			selectable: normalizeSelectable(selectable),
			editable,
			rowClass,
			onCellClick: oncellclick,
			onRowClick: onrowclick,
			onSortChange: (sort) => {
				if (sort.length > 0 && sort[0].direction) {
					onsortchange?.({
						columnKey: sort[0].columnKey,
						direction: sort[0].direction,
						multiSort: sort.length > 1
					});
				}
			},
			onSelectionChange: (selected) => {
				// Compute added and removed items
				const added: (string | number)[] = [];
				const removed: (string | number)[] = [];

				for (const id of selected) {
					if (!prevSelection.has(id)) {
						added.push(id);
					}
				}
				for (const id of prevSelection) {
					if (!selected.has(id)) {
						removed.push(id);
					}
				}

				prevSelection = new Set(selected);

				onselectionchange?.({
					selected,
					added,
					removed
				});
			},
			onCellEdit: oncelledit,
			onCellValidate: oncellvalidate
		});
	});

	// Track previous values for prop updates
	let prevData: TData[] | undefined;
	let prevColumns: ColumnDef<TData, any>[] | undefined;
	let prevSelection: Set<string | number> = new Set();

	// Sync data changes
	$effect(() => {
		if (engine && prevData !== undefined && data !== undefined && data !== prevData) {
			engine.updateData(data);
		}
		prevData = data;
	});

	// Sync column changes
	$effect(() => {
		if (engine && prevColumns !== undefined && columns !== prevColumns) {
			engine.updateOptions({ columns: columns as ColumnDef<TData>[] });
		}
		prevColumns = columns;
	});

	// Sync option changes
	$effect(() => {
		if (engine) {
			engine.updateOptions({
				sortable,
				resizable,
				selectable: normalizeSelectable(selectable),
				editable
			});
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		engine?.destroy();
		engine = null;
	});

	// === Exposed API ===

	export function getEngine(): GridEngine<TData> | null {
		return engine;
	}

	export function selectRow(rowId: string | number, mode?: 'toggle' | 'add' | 'remove' | 'set') {
		engine?.selectRow(rowId, mode);
	}

	export function selectAll() {
		engine?.selectAll();
	}

	export function clearSelection() {
		engine?.clearSelection();
	}

	export function scrollToRow(index: number) {
		engine?.scrollToRow(index);
	}

	export function refresh(): Promise<void> {
		return engine?.refresh() ?? Promise.resolve();
	}

	export function startEdit(rowId: string | number, columnKey: string): boolean {
		return engine?.startEdit(rowId, columnKey) ?? false;
	}

	export function commitEdit(): Promise<boolean> {
		return engine?.commitEdit() ?? Promise.resolve(false);
	}

	export function cancelEdit() {
		engine?.cancelEdit();
	}
</script>

<div
	class="datagrid datagrid-engine {className}"
	style={containerStyle}
	bind:this={containerEl}
	role="grid"
	aria-rowcount={rowCount}
	aria-colcount={columns.length}
	data-testid="datagrid"
>
	{#if displayError}
		<div class="datagrid-error" role="alert" data-testid="datagrid-error">
			{#if errorSnippet}
				{@render errorSnippet(displayError)}
			{:else}
				<span class="datagrid-error-icon">!</span>
				<span>{displayError}</span>
			{/if}
		</div>
	{:else if isLoading && !engine}
		<div class="datagrid-loading" data-testid="datagrid-loading">
			{#if loadingSnippet}
				{@render loadingSnippet()}
			{:else}
				<span class="datagrid-spinner"></span>
				<span>Loading...</span>
			{/if}
		</div>
	{:else if isEmpty && engine}
		<div class="datagrid-empty" data-testid="datagrid-empty">
			{#if emptySnippet}
				{@render emptySnippet()}
			{:else}
				{emptyMessage}
			{/if}
		</div>
	{/if}
	<!-- GridEngine renders directly into this container -->
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
		position: relative;
	}

	/* GridEngine renders into these containers */
	.datagrid :global(.datagrid-header-container) {
		flex-shrink: 0;
		border-bottom: 1px solid var(--datagrid-border-color, #e0e0e0);
		background: var(--datagrid-header-bg, #fafafa);
	}

	.datagrid :global(.datagrid-body-container) {
		flex: 1;
		overflow: auto;
		position: relative;
	}

	/* Row styles */
	.datagrid :global(.datagrid-row) {
		display: flex;
		border-bottom: 1px solid var(--datagrid-row-border-color, #f0f0f0);
		background: var(--datagrid-row-bg, #fff);
		transition: background-color 0.1s;
	}

	.datagrid :global(.datagrid-row:nth-child(odd)) {
		background: var(--datagrid-row-alt-bg, #fafafa);
	}

	.datagrid :global(.datagrid-row:hover) {
		background: var(--datagrid-row-hover-bg, #f5f5f5);
	}

	.datagrid :global(.datagrid-row.selected) {
		background: var(--datagrid-row-selected-bg, #e3f2fd);
	}

	.datagrid :global(.datagrid-row.selected:hover) {
		background: var(--datagrid-row-selected-hover-bg, #bbdefb);
	}

	/* Cell styles */
	.datagrid :global(.datagrid-cell) {
		display: flex;
		align-items: center;
		padding: 0 12px;
		overflow: hidden;
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.datagrid :global(.datagrid-cell-content) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	/* Header styles */
	.datagrid :global(.datagrid-header-row) {
		display: flex;
		font-weight: 600;
	}

	.datagrid :global(.datagrid-header-cell) {
		display: flex;
		align-items: center;
		padding: 0 12px;
		box-sizing: border-box;
		flex-shrink: 0;
		user-select: none;
	}

	.datagrid :global(.datagrid-header-cell.sortable) {
		cursor: pointer;
	}

	.datagrid :global(.datagrid-header-cell.sortable:hover) {
		background: var(--datagrid-header-hover-bg, #f0f0f0);
	}

	/* Sort indicator */
	.datagrid :global(.sort-indicator) {
		margin-left: 4px;
		font-size: 10px;
		color: var(--datagrid-primary-color, #1976d2);
	}

	/* Resize handle */
	.datagrid :global(.resize-handle) {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 6px;
		cursor: col-resize;
		z-index: 1;
	}

	.datagrid :global(.resize-handle:hover),
	.datagrid :global(.resize-handle.resizing) {
		background: var(--datagrid-primary-color, #1976d2);
	}

	/* Editor styles */
	.datagrid :global(.datagrid-cell-editor) {
		position: absolute;
		display: flex;
		align-items: center;
		background: var(--datagrid-bg, #fff);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 100;
	}

	.datagrid :global(.datagrid-editor-input) {
		width: 100%;
		height: 100%;
		padding: 4px 8px;
		border: 2px solid var(--datagrid-primary-color, #1976d2);
		border-radius: 2px;
		font-size: inherit;
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}

	.datagrid :global(.editor-error) {
		position: absolute;
		bottom: -20px;
		left: 0;
		right: 0;
		font-size: 11px;
		color: var(--datagrid-error-color, #dc2626);
		background: var(--datagrid-error-bg, #fef2f2);
		padding: 2px 6px;
		border-radius: 2px;
		z-index: 101;
	}

	.datagrid :global(.editor-saving) {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
	}

	.datagrid :global(.saving-spinner) {
		width: 14px;
		height: 14px;
		border: 2px solid var(--datagrid-border-color, #e0e0e0);
		border-top-color: var(--datagrid-primary-color, #1976d2);
		border-radius: 50%;
		animation: datagrid-spin 0.8s linear infinite;
	}

	/* Loading/Empty/Error states */
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
		position: absolute;
		inset: 0;
		z-index: 50;
		background: var(--datagrid-bg, #fff);
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

	/* Pinned column shadow */
	.datagrid :global(.datagrid-row-pinned-left)::after {
		content: '';
		position: absolute;
		right: -6px;
		top: 0;
		bottom: 0;
		width: 6px;
		background: linear-gradient(to right, rgba(0, 0, 0, 0.08), transparent);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.datagrid :global(.datagrid-row.has-scroll .datagrid-row-pinned-left)::after {
		opacity: 1;
	}
</style>
