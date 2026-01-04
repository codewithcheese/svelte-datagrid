<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import type { ColumnDef } from '../../../types/index.js';
	import TextEditor from './editors/TextEditor.svelte';
	import NumberEditor from './editors/NumberEditor.svelte';

	interface Props {
		column: ColumnDef<unknown>;
		value: unknown;
		rowId: string | number;
		width: number;
	}

	let { column, value, rowId, width }: Props = $props();

	const gridState = getContext<GridStateInstance<unknown>>('datagrid');

	// Get the appropriate editor type based on column config or value type
	const editorType = $derived.by(() => {
		if (column.filterType === 'number') return 'number';
		if (column.filterType === 'date') return 'date';
		if (typeof value === 'number') return 'number';
		return 'text';
	});

	function handleCommit(newValue: unknown) {
		gridState.setEditValue(newValue);
		gridState.commitEdit();
	}

	function handleCancel() {
		gridState.cancelEdit();
	}

	function handleChange(newValue: unknown) {
		gridState.setEditValue(newValue);
	}

	const editError = $derived(gridState.editState?.error);
</script>

<div
	class="datagrid-cell-editor"
	class:has-error={!!editError}
	style="width: {width}px;"
>
	{#if editorType === 'number'}
		<NumberEditor
			value={value as number}
			oncommit={handleCommit}
			oncancel={handleCancel}
			onchange={handleChange}
		/>
	{:else}
		<TextEditor
			value={String(value ?? '')}
			oncommit={handleCommit}
			oncancel={handleCancel}
			onchange={handleChange}
		/>
	{/if}

	{#if editError}
		<div class="editor-error" title={editError}>
			{editError}
		</div>
	{/if}
</div>

<style>
	.datagrid-cell-editor {
		position: relative;
		display: flex;
		align-items: center;
		height: 100%;
		padding: 0 4px;
		box-sizing: border-box;
	}

	.datagrid-cell-editor.has-error {
		background: var(--datagrid-edit-error-bg, #fef2f2);
	}

	.editor-error {
		position: absolute;
		bottom: -20px;
		left: 0;
		right: 0;
		font-size: 11px;
		color: var(--datagrid-edit-error-color, #dc2626);
		background: var(--datagrid-edit-error-bg, #fef2f2);
		padding: 2px 6px;
		border-radius: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		z-index: 10;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
</style>
