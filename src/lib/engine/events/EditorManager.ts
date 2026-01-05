/**
 * EditorManager - Manages cell editor lifecycle.
 *
 * Creates, positions, and manages cell editors using DOM pooling.
 * Handles commit/cancel flow and validation.
 */

import type { StateManager } from '../state/StateManager.js';
import type { ColumnDef } from '../../types/index.js';

export interface EditorManagerOptions<TData extends Record<string, unknown>> {
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
	/** Keydown handler reference for cleanup */
	keydownHandler: (e: KeyboardEvent) => void;
	/** Blur handler reference for cleanup */
	blurHandler: () => void;
}

export class EditorManager<TData extends Record<string, unknown>> {
	private options: EditorManagerOptions<TData>;
	private editorPool: PooledEditor[] = [];
	private activeEditor: PooledEditor | null = null;
	private currentRowId: string | number | null = null;
	private currentColumnKey: string | null = null;
	private originalValue: unknown = null;

	// Track edit session to prevent blur race condition
	private editSessionId: number = 0;
	private pendingBlurTimeout: ReturnType<typeof setTimeout> | null = null;

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
		// Cancel any pending blur timeout from previous editor
		if (this.pendingBlurTimeout) {
			clearTimeout(this.pendingBlurTimeout);
			this.pendingBlurTimeout = null;
		}

		// Increment session ID to invalidate any stale blur handlers
		this.editSessionId++;

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

		// Clear any previous error
		editor.errorEl.textContent = '';
		editor.errorEl.style.display = 'none';

		// Position editor over cell
		this.positionEditor(editor, cellElement);

		// Set initial value
		editor.input.value = this.formatValueForInput(value, editorType);

		// Show editor
		editor.container.style.display = '';
		editor.container.classList.remove('has-error');
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
				// Edit callback is handled by StateManager, which notifies GridEngine
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

		// Create handler references for cleanup
		const keydownHandler = (e: KeyboardEvent) => this.handleEditorKeyDown(e);
		const blurHandler = () => this.handleEditorBlur();

		// Handle keyboard events
		input.addEventListener('keydown', keydownHandler);

		// Handle blur (commit on click outside)
		input.addEventListener('blur', blurHandler);

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
			type,
			keydownHandler,
			blurHandler
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
			event.preventDefault();
			event.stopPropagation();

			const direction = event.shiftKey ? -1 : 1;
			this.commitAndNavigate(direction);
		}
	}

	/**
	 * Commit current edit and navigate to next/previous editable cell.
	 */
	private async commitAndNavigate(direction: 1 | -1): Promise<void> {
		if (!this.currentRowId || !this.currentColumnKey) return;

		// Find next editable cell
		const nextCell = this.findNextEditableCell(
			this.currentRowId,
			this.currentColumnKey,
			direction
		);

		// Commit current edit
		const success = await this.commit();

		// If commit succeeded and we have a next cell, start editing it
		if (success && nextCell) {
			this.options.stateManager.startEdit(nextCell.rowId, nextCell.columnKey);
		}
	}

	/**
	 * Find the next editable cell in the given direction.
	 */
	private findNextEditableCell(
		currentRowId: string | number,
		currentColumnKey: string,
		direction: 1 | -1
	): { rowId: string | number; columnKey: string } | null {
		const state = this.options.stateManager;
		const rows = state.rows;
		const columns = state.visibleColumns.filter(col => col.editable !== false);

		if (columns.length === 0 || rows.length === 0) return null;

		// Find current position
		const currentRowIndex = rows.findIndex((row, i) =>
			state.getRowId(row, i) === currentRowId
		);
		const currentColIndex = columns.findIndex(col => col.key === currentColumnKey);

		if (currentRowIndex === -1 || currentColIndex === -1) return null;

		// Calculate next position
		let nextColIndex = currentColIndex + direction;
		let nextRowIndex = currentRowIndex;

		// Wrap to next/previous row
		if (nextColIndex >= columns.length) {
			nextColIndex = 0;
			nextRowIndex++;
		} else if (nextColIndex < 0) {
			nextColIndex = columns.length - 1;
			nextRowIndex--;
		}

		// Check bounds
		if (nextRowIndex < 0 || nextRowIndex >= rows.length) {
			return null; // Reached the end/beginning
		}

		const nextRow = rows[nextRowIndex];
		const nextColumn = columns[nextColIndex];

		return {
			rowId: state.getRowId(nextRow, nextRowIndex),
			columnKey: nextColumn.key
		};
	}

	/**
	 * Handle blur in editor (commit on click outside).
	 */
	private handleEditorBlur(): void {
		// Capture session ID to check if it's still valid after timeout
		const sessionId = this.editSessionId;

		// Use setTimeout to allow click events to fire first
		// (e.g., clicking on another cell should start new edit, not commit this one)
		this.pendingBlurTimeout = setTimeout(() => {
			this.pendingBlurTimeout = null;

			// Only commit if same session and editor is still active
			if (sessionId === this.editSessionId && this.activeEditor) {
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
		// Clear any pending blur timeout
		if (this.pendingBlurTimeout) {
			clearTimeout(this.pendingBlurTimeout);
			this.pendingBlurTimeout = null;
		}

		for (const editor of this.editorPool) {
			// Explicitly remove event listeners before removing DOM elements
			editor.input.removeEventListener('keydown', editor.keydownHandler);
			editor.input.removeEventListener('blur', editor.blurHandler);
			editor.container.remove();
		}
		this.editorPool = [];
		this.activeEditor = null;
	}
}

/**
 * Factory function to create an EditorManager instance.
 */
export function createEditorManager<TData extends Record<string, unknown>>(
	options: EditorManagerOptions<TData>
): EditorManager<TData> {
	return new EditorManager(options);
}
