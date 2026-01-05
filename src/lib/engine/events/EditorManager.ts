/**
 * EditorManager - Manages cell editor lifecycle.
 *
 * Creates, positions, and manages cell editors using DOM pooling.
 * Handles commit/cancel flow and validation.
 */

import type { StateManager } from '../state/StateManager.js';
import type { ColumnDef, GridCellEditEvent } from '../../types/index.js';

export interface EditorManagerOptions<TData> {
	/** StateManager instance */
	stateManager: StateManager<TData>;

	/** Container element for positioning editors */
	container: HTMLElement;

	/** Get row data by ID */
	getRowData: (rowId: string | number) => TData | undefined;

	/** Get column definition by key */
	getColumn: (columnKey: string) => ColumnDef<TData> | undefined;

	/** Get cell element for positioning */
	getCellElement: (rowId: string | number, columnKey: string) => HTMLElement | null;

	/** Cell edit callback */
	onCellEdit?: (event: GridCellEditEvent<TData>) => void;

	/** Cell validation callback */
	onCellValidate?: (rowId: string | number, columnKey: string, value: unknown) => string | null;
}

/**
 * Editor element pooling.
 */
interface PooledEditor {
	/** The editor container element */
	container: HTMLDivElement;
	/** The input element */
	input: HTMLInputElement;
	/** Error display element */
	errorEl: HTMLDivElement;
	/** Saving spinner element */
	savingEl: HTMLDivElement;
	/** Whether currently in use */
	inUse: boolean;
	/** Current editor type */
	type: 'text' | 'number';
}

export class EditorManager<TData = unknown> {
	private options: EditorManagerOptions<TData>;
	private editorPool: PooledEditor[] = [];
	private activeEditor: PooledEditor | null = null;
	private currentRowId: string | number | null = null;
	private currentColumnKey: string | null = null;
	private originalValue: unknown = null;

	constructor(options: EditorManagerOptions<TData>) {
		this.options = options;

		// Listen for edit state changes
		this.options.stateManager.on('edit', this.handleEditStateChange.bind(this));
	}

	/**
	 * Handle edit state changes from StateManager.
	 */
	private handleEditStateChange(data: { editState: { rowId: string | number; columnKey: string } | null }): void {
		const editState = data.editState;
		if (editState) {
			this.showEditor(editState.rowId, editState.columnKey);
		} else {
			this.hideEditor();
		}
	}

	/**
	 * Show editor for the given cell.
	 */
	showEditor(rowId: string | number, columnKey: string): void {
		const column = this.options.getColumn(columnKey);
		const rowData = this.options.getRowData(rowId);
		const cellElement = this.options.getCellElement(rowId, columnKey);

		if (!column || !rowData || !cellElement) {
			console.warn('[EditorManager] Cannot show editor - missing data', { rowId, columnKey });
			return;
		}

		// Get current value
		const value = this.getCellValue(rowData, column);
		this.originalValue = value;
		this.currentRowId = rowId;
		this.currentColumnKey = columnKey;

		// Determine editor type
		const editorType = this.getEditorType(column, value);

		// Acquire editor from pool
		const editor = this.acquireEditor(editorType);
		this.activeEditor = editor;

		// Position editor over cell
		this.positionEditor(editor, cellElement);

		// Set initial value
		editor.input.value = this.formatValueForInput(value, editorType);

		// Show editor
		editor.container.style.display = '';
		editor.errorEl.style.display = 'none';
		editor.savingEl.style.display = 'none';

		// Focus and select
		requestAnimationFrame(() => {
			editor.input.focus();
			editor.input.select();
		});
	}

	/**
	 * Hide the current editor.
	 */
	hideEditor(): void {
		if (!this.activeEditor) return;

		this.activeEditor.container.style.display = 'none';
		this.activeEditor.inUse = false;
		this.activeEditor = null;
		this.currentRowId = null;
		this.currentColumnKey = null;
		this.originalValue = null;
	}

	/**
	 * Commit the current edit.
	 */
	async commit(): Promise<boolean> {
		if (!this.activeEditor || this.currentRowId === null || !this.currentColumnKey) {
			return false;
		}

		const editor = this.activeEditor;
		const column = this.options.getColumn(this.currentColumnKey);
		if (!column) return false;

		// Parse the new value
		const editorType = this.getEditorType(column, this.originalValue);
		const newValue = this.parseInputValue(editor.input.value, editorType);

		// Validate if validator provided
		if (this.options.onCellValidate) {
			const error = this.options.onCellValidate(this.currentRowId, this.currentColumnKey, newValue);
			if (error) {
				this.showError(error);
				return false;
			}
		}

		// Show saving state
		this.showSaving(true);

		try {
			// Update the state manager
			this.options.stateManager.setEditValue(newValue);
			const success = await this.options.stateManager.commitEdit();

			if (success) {
				// Fire edit callback
				const rowData = this.options.getRowData(this.currentRowId);
				if (rowData && this.options.onCellEdit) {
					this.options.onCellEdit({
						row: rowData,
						rowId: this.currentRowId,
						columnKey: this.currentColumnKey,
						oldValue: this.originalValue,
						newValue,
						column
					});
				}

				this.hideEditor();
				return true;
			} else {
				const editState = this.options.stateManager.editState;
				if (editState?.error) {
					this.showError(editState.error);
				}
				return false;
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Save failed';
			this.showError(message);
			return false;
		} finally {
			this.showSaving(false);
		}
	}

	/**
	 * Cancel the current edit.
	 */
	cancel(): void {
		const editState = this.options.stateManager.editState;
		if (editState?.saving) {
			// Don't allow cancel while saving
			return;
		}

		this.options.stateManager.cancelEdit();
		// hideEditor will be called via event
	}

	/**
	 * Show validation error.
	 */
	private showError(message: string): void {
		if (!this.activeEditor) return;

		this.activeEditor.errorEl.textContent = message;
		this.activeEditor.errorEl.title = message;
		this.activeEditor.errorEl.style.display = '';
		this.activeEditor.container.classList.add('has-error');
	}

	/**
	 * Show/hide saving state.
	 */
	private showSaving(saving: boolean): void {
		if (!this.activeEditor) return;

		this.activeEditor.savingEl.style.display = saving ? '' : 'none';
		this.activeEditor.container.classList.toggle('is-saving', saving);
		this.activeEditor.input.disabled = saving;
	}

	/**
	 * Position editor over cell.
	 */
	private positionEditor(editor: PooledEditor, cellElement: HTMLElement): void {
		const rect = cellElement.getBoundingClientRect();
		const containerRect = this.options.container.getBoundingClientRect();

		// Position relative to container
		const top = rect.top - containerRect.top + this.options.container.scrollTop;
		const left = rect.left - containerRect.left + this.options.container.scrollLeft;

		editor.container.style.position = 'absolute';
		editor.container.style.top = `${top}px`;
		editor.container.style.left = `${left}px`;
		editor.container.style.width = `${rect.width}px`;
		editor.container.style.height = `${rect.height}px`;
		editor.container.style.zIndex = '100';
	}

	/**
	 * Acquire an editor from the pool or create new.
	 */
	private acquireEditor(type: 'text' | 'number'): PooledEditor {
		// Try to find matching unused editor
		let editor = this.editorPool.find((e) => !e.inUse && e.type === type);

		if (!editor) {
			// Try to reuse any unused editor
			editor = this.editorPool.find((e) => !e.inUse);
			if (editor) {
				// Update type
				editor.type = type;
				editor.input.type = type;
			}
		}

		if (!editor) {
			// Create new editor
			editor = this.createEditor(type);
			this.editorPool.push(editor);
		}

		editor.inUse = true;
		editor.container.classList.remove('has-error', 'is-saving');
		return editor;
	}

	/**
	 * Create a new editor element.
	 */
	private createEditor(type: 'text' | 'number'): PooledEditor {
		const container = document.createElement('div');
		container.className = 'datagrid-cell-editor';
		container.style.display = 'none';

		const input = document.createElement('input');
		input.type = type;
		input.className = 'datagrid-editor-input';

		// Handle keyboard events
		input.addEventListener('keydown', (e) => this.handleEditorKeyDown(e));

		// Handle blur (commit on click outside)
		input.addEventListener('blur', () => this.handleEditorBlur());

		const savingEl = document.createElement('div');
		savingEl.className = 'editor-saving';
		savingEl.innerHTML = '<span class="saving-spinner"></span>';
		savingEl.style.display = 'none';

		const errorEl = document.createElement('div');
		errorEl.className = 'editor-error';
		errorEl.style.display = 'none';

		container.appendChild(input);
		container.appendChild(savingEl);
		container.appendChild(errorEl);
		this.options.container.appendChild(container);

		return {
			container,
			input,
			errorEl,
			savingEl,
			inUse: false,
			type
		};
	}

	/**
	 * Handle keydown in editor.
	 */
	private handleEditorKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			this.commit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			this.cancel();
		} else if (event.key === 'Tab') {
			// Commit and let default tab behavior happen
			this.commit();
		}
	}

	/**
	 * Handle blur in editor (commit on click outside).
	 */
	private handleEditorBlur(): void {
		// Use setTimeout to allow click events to fire first
		setTimeout(() => {
			if (this.activeEditor) {
				this.commit();
			}
		}, 100);
	}

	/**
	 * Get editor type based on column config or value type.
	 */
	private getEditorType(column: ColumnDef<TData>, value: unknown): 'text' | 'number' {
		if (column.filterType === 'number') return 'number';
		if (typeof value === 'number') return 'number';
		return 'text';
	}

	/**
	 * Format value for display in input.
	 */
	private formatValueForInput(value: unknown, type: 'text' | 'number'): string {
		if (value === null || value === undefined) return '';
		if (type === 'number' && typeof value === 'number') {
			return String(value);
		}
		return String(value);
	}

	/**
	 * Parse input value to appropriate type.
	 */
	private parseInputValue(value: string, type: 'text' | 'number'): unknown {
		if (type === 'number') {
			const num = parseFloat(value);
			return isNaN(num) ? null : num;
		}
		return value;
	}

	/**
	 * Get cell value from row data using column accessor.
	 */
	private getCellValue(row: TData, column: ColumnDef<TData>): unknown {
		if (typeof column.accessor === 'function') {
			return column.accessor(row);
		}
		if (column.accessor) {
			return (row as Record<string, unknown>)[column.accessor as string];
		}
		return (row as Record<string, unknown>)[column.key];
	}

	/**
	 * Check if currently editing.
	 */
	get isEditing(): boolean {
		return this.activeEditor !== null;
	}

	/**
	 * Cleanup all editors.
	 */
	destroy(): void {
		for (const editor of this.editorPool) {
			editor.container.remove();
		}
		this.editorPool = [];
		this.activeEditor = null;
	}
}

/**
 * Factory function to create an EditorManager instance.
 */
export function createEditorManager<TData>(options: EditorManagerOptions<TData>): EditorManager<TData> {
	return new EditorManager(options);
}
