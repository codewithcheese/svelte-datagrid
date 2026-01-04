<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { GridStateInstance } from '../../../state/grid-state.svelte.js';
	import type { ColumnDef } from '../../../types/index.js';
	import TextEditor from './editors/TextEditor.svelte';
	import NumberEditor from './editors/NumberEditor.svelte';

	interface Props {
		column: ColumnDef<Record<string, unknown>>;
		value: unknown;
		rowId: string | number;
		width: number;
	}

	let { column, value, rowId, width }: Props = $props();

	const gridState = getContext<GridStateInstance<Record<string, unknown>>>('datagrid');

	// Get the appropriate editor type based on column config or value type
	const editorType = $derived.by(() => {
		if (column.filterType === 'number') return 'number';
		if (column.filterType === 'date') return 'date';
		if (typeof value === 'number') return 'number';
		return 'text';
	});

	async function handleCommit(newValue: unknown) {
		gridState.setEditValue(newValue);
		// commitEdit is now async and handles DataSource mutations
		await gridState.commitEdit();
	}

	function handleCancel() {
		// Don't allow cancel while saving
		if (gridState.editState?.saving) return;
		gridState.cancelEdit();
	}

	function handleChange(newValue: unknown) {
		gridState.setEditValue(newValue);
	}

	const editError = $derived(gridState.editState?.error);
	const isSaving = $derived(gridState.editState?.saving ?? false);
</script>

<div
	class="datagrid-cell-editor"
	class:has-error={!!editError}
	class:is-saving={isSaving}
	style="width: {width}px;"
>
	{#if editorType === 'number'}
		<NumberEditor
			value={value as number}
			oncommit={handleCommit}
			oncancel={handleCancel}
			onchange={handleChange}
			disabled={isSaving}
		/>
	{:else}
		<TextEditor
			value={String(value ?? '')}
			oncommit={handleCommit}
			oncancel={handleCancel}
			onchange={handleChange}
			disabled={isSaving}
		/>
	{/if}

	{#if isSaving}
		<div class="editor-saving">
			<span class="saving-spinner"></span>
		</div>
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

	.datagrid-cell-editor.is-saving {
		opacity: 0.7;
		pointer-events: none;
	}

	.editor-saving {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
	}

	.saving-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid var(--datagrid-border-color, #e0e0e0);
		border-top-color: var(--datagrid-primary-color, #1976d2);
		border-radius: 50%;
		animation: editor-spin 0.8s linear infinite;
	}

	@keyframes editor-spin {
		to {
			transform: rotate(360deg);
		}
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
