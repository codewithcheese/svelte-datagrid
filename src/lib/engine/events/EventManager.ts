/**
 * EventManager - Centralized event handling using event delegation.
 *
 * Instead of attaching event listeners to each row/cell, we attach
 * a single listener on the body container and use event delegation.
 *
 * Benefits:
 * - Minimal memory footprint (1 listener vs 1000s)
 * - No listener cleanup needed when rows are pooled
 * - Consistent event handling across all rows
 */

import type { StateManager } from '../state/StateManager.js';
import type { ColumnDef, GridCellClickEvent, GridRowClickEvent } from '../../types/index.js';

export interface EventManagerOptions<TData extends Record<string, unknown>> {
	/** StateManager instance */
	stateManager: StateManager<TData>;

	/** Whether selection is enabled */
	selectable: boolean | 'single' | 'multiple';

	/** Whether editing is enabled */
	editable: boolean;

	/** Cell click callback */
	onCellClick?: (event: GridCellClickEvent<TData>) => void;

	/** Row click callback */
	onRowClick?: (event: GridRowClickEvent<TData>) => void;

	/** Cell double-click callback (for edit start) */
	onCellDoubleClick?: (rowId: string | number, columnKey: string) => void;

	/** Get row data by ID */
	getRowData: (rowId: string | number) => TData | undefined;

	/** Get column definition by key */
	getColumn: (columnKey: string) => ColumnDef<TData> | undefined;
}

/**
 * Target info extracted from delegated event
 */
interface EventTarget {
	rowId: string | number | null;
	rowIndex: number | null;
	columnKey: string | null;
	element: HTMLElement;
	isCell: boolean;
	isRow: boolean;
}

export class EventManager<TData extends Record<string, unknown>> {
	private container: HTMLElement;
	private options: EventManagerOptions<TData>;
	private boundHandlers: Map<string, EventListener> = new Map();

	constructor(container: HTMLElement, options: EventManagerOptions<TData>) {
		this.container = container;
		this.options = options;
		this.attachListeners();
	}

	/**
	 * Attach all event listeners to the container.
	 */
	private attachListeners(): void {
		// Click events (row/cell click, selection)
		const clickHandler = this.handleClick.bind(this) as EventListener;
		this.container.addEventListener('click', clickHandler);
		this.boundHandlers.set('click', clickHandler);

		// Double-click for editing
		const dblClickHandler = this.handleDoubleClick.bind(this) as EventListener;
		this.container.addEventListener('dblclick', dblClickHandler);
		this.boundHandlers.set('dblclick', dblClickHandler);

		// Keyboard navigation
		const keydownHandler = this.handleKeyDown.bind(this) as EventListener;
		this.container.addEventListener('keydown', keydownHandler);
		this.boundHandlers.set('keydown', keydownHandler);

		// Scroll events
		const scrollHandler = this.handleScroll.bind(this) as EventListener;
		this.container.addEventListener('scroll', scrollHandler);
		this.boundHandlers.set('scroll', scrollHandler);

		// Touch events for mobile
		const touchStartHandler = this.handleTouchStart.bind(this) as EventListener;
		const touchMoveHandler = this.handleTouchMove.bind(this) as EventListener;
		this.container.addEventListener('touchstart', touchStartHandler, { passive: true });
		this.container.addEventListener('touchmove', touchMoveHandler, { passive: true });
		this.boundHandlers.set('touchstart', touchStartHandler);
		this.boundHandlers.set('touchmove', touchMoveHandler);

		// Wheel events for scrolling
		const wheelHandler = this.handleWheel.bind(this) as EventListener;
		this.container.addEventListener('wheel', wheelHandler, { passive: true });
		this.boundHandlers.set('wheel', wheelHandler);

		// Make container focusable if selectable
		if (this.options.selectable) {
			this.container.setAttribute('tabindex', '0');
		}
	}

	/**
	 * Extract target info from event using delegation.
	 */
	private getEventTarget(event: Event): EventTarget | null {
		const target = event.target as HTMLElement;
		if (!target) return null;

		// Find the cell element (if clicking on cell content)
		const cellEl = target.closest('.datagrid-cell') as HTMLElement | null;

		// Find the row element
		const rowEl = target.closest('.datagrid-row') as HTMLElement | null;

		if (!rowEl) return null;

		const rowIdStr = rowEl.dataset.rowId;
		const rowIndexStr = rowEl.dataset.rowIndex;

		// Parse rowId (could be number or string)
		let rowId: string | number | null = null;
		if (rowIdStr !== undefined && rowIdStr !== '') {
			rowId = /^\d+$/.test(rowIdStr) ? parseInt(rowIdStr, 10) : rowIdStr;
		}

		const rowIndex = rowIndexStr ? parseInt(rowIndexStr, 10) : null;
		const columnKey = cellEl?.dataset.columnKey ?? null;

		return {
			rowId,
			rowIndex,
			columnKey,
			element: cellEl ?? rowEl,
			isCell: !!cellEl,
			isRow: !cellEl
		};
	}

	/**
	 * Handle click events (selection, row/cell click callbacks).
	 */
	private handleClick(event: MouseEvent): void {
		const target = this.getEventTarget(event);
		if (!target || target.rowId === null) return;

		const { stateManager } = this.options;
		const rowId = target.rowId;

		// Handle selection
		if (this.options.selectable) {
			if (event.ctrlKey || event.metaKey) {
				stateManager.selectRow(rowId, 'toggle');
			} else if (event.shiftKey) {
				stateManager.selectRange(rowId);
			} else {
				stateManager.selectRow(rowId, 'set');
			}
		}

		// Fire row click callback
		if (this.options.onRowClick && target.rowIndex !== null) {
			const rowData = this.options.getRowData(rowId);
			if (rowData) {
				this.options.onRowClick({
					row: rowData,
					rowIndex: target.rowIndex,
					originalEvent: event
				});
			}
		}

		// Fire cell click callback
		if (target.isCell && target.columnKey && this.options.onCellClick && target.rowIndex !== null) {
			const rowData = this.options.getRowData(rowId);
			const column = this.options.getColumn(target.columnKey);
			if (rowData && column) {
				const value = this.getCellValue(rowData, column);
				this.options.onCellClick({
					row: rowData,
					rowIndex: target.rowIndex,
					column,
					columnKey: target.columnKey,
					value,
					originalEvent: event
				});
			}
		}
	}

	/**
	 * Handle double-click events (start editing).
	 */
	private handleDoubleClick(event: MouseEvent): void {
		if (!this.options.editable) return;

		const target = this.getEventTarget(event);
		if (!target || !target.isCell || target.rowId === null || !target.columnKey) return;

		const column = this.options.getColumn(target.columnKey);
		if (!column || column.editable === false) return;

		// Prevent text selection
		event.preventDefault();
		event.stopPropagation();

		// Fire callback for edit start
		this.options.onCellDoubleClick?.(target.rowId, target.columnKey);
	}

	/**
	 * Handle keyboard events (navigation, selection, editing).
	 */
	private handleKeyDown(event: KeyboardEvent): void {
		// Don't handle if we're in an input/editor
		const target = event.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
			return;
		}

		const { stateManager } = this.options;
		let handled = false;

		// F2 for editing works independently of selectable (when editable is true)
		if (event.key === 'F2') {
			if (this.options.editable && stateManager.focusedRowId !== null && stateManager.focusedColumnKey) {
				const column = this.options.getColumn(stateManager.focusedColumnKey);
				if (column && column.editable !== false) {
					this.options.onCellDoubleClick?.(stateManager.focusedRowId, stateManager.focusedColumnKey);
					event.preventDefault();
					return;
				}
			}
		}

		// Selection/navigation keys require selectable to be true
		if (!this.options.selectable) return;

		const extendSelection = event.shiftKey;

		switch (event.key) {
			case 'ArrowDown':
				stateManager.navigateRow(1, true, extendSelection);
				handled = true;
				break;
			case 'ArrowUp':
				stateManager.navigateRow(-1, true, extendSelection);
				handled = true;
				break;
			case 'Home':
				if (event.ctrlKey) {
					stateManager.navigateToFirst(true);
					handled = true;
				}
				break;
			case 'End':
				if (event.ctrlKey) {
					stateManager.navigateToLast(true);
					handled = true;
				}
				break;
			case 'PageDown':
				stateManager.navigateByPage('down', true);
				handled = true;
				break;
			case 'PageUp':
				stateManager.navigateByPage('up', true);
				handled = true;
				break;
			case 'a':
				if (event.ctrlKey || event.metaKey) {
					stateManager.selectAll();
					handled = true;
				}
				break;
			case 'Escape':
				stateManager.clearSelection();
				handled = true;
				break;
			case 'Enter':
			case ' ':
				// Toggle selection on focused row
				if (stateManager.focusedRowId !== null) {
					stateManager.selectRow(stateManager.focusedRowId, 'toggle');
					handled = true;
				}
				break;
			// Note: F2 is handled above to work independently of selectable
		}

		if (handled) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
	 * Handle scroll events.
	 */
	private handleScroll(event: Event): void {
		const target = event.target as HTMLElement;
		this.options.stateManager.setScroll(target.scrollTop, target.scrollLeft);
	}

	// Touch handling state
	private touchStartY: number = 0;
	private touchStartScrollTop: number = 0;

	/**
	 * Handle touch start for mobile scrolling.
	 */
	private handleTouchStart(event: TouchEvent): void {
		this.touchStartY = event.touches[0].clientY;
		this.touchStartScrollTop = this.options.stateManager.scrollTop;
	}

	/**
	 * Handle touch move for mobile scrolling.
	 */
	private handleTouchMove(event: TouchEvent): void {
		const touchY = event.touches[0].clientY;
		const deltaY = this.touchStartY - touchY;
		const newScrollTop = this.touchStartScrollTop + deltaY;
		this.options.stateManager.setScroll(newScrollTop, this.options.stateManager.scrollLeft);
	}

	/**
	 * Handle wheel events for scrolling.
	 * This ensures wheel events work reliably across all environments.
	 */
	private handleWheel(event: WheelEvent): void {
		const { stateManager } = this.options;
		const newScrollTop = stateManager.scrollTop + event.deltaY;
		const newScrollLeft = stateManager.scrollLeft + event.deltaX;
		stateManager.setScroll(newScrollTop, newScrollLeft);
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
	 * Update options (e.g., when props change).
	 */
	updateOptions(options: Partial<EventManagerOptions<TData>>): void {
		Object.assign(this.options, options);

		// Update tabindex based on selectable
		if (options.selectable !== undefined) {
			if (options.selectable) {
				this.container.setAttribute('tabindex', '0');
			} else {
				this.container.removeAttribute('tabindex');
			}
		}
	}

	/**
	 * Remove all event listeners and cleanup.
	 */
	destroy(): void {
		for (const [eventType, handler] of this.boundHandlers) {
			this.container.removeEventListener(eventType, handler);
		}
		this.boundHandlers.clear();
		this.container.removeAttribute('tabindex');
	}
}

/**
 * Factory function to create an EventManager instance.
 */
export function createEventManager<TData extends Record<string, unknown>>(
	container: HTMLElement,
	options: EventManagerOptions<TData>
): EventManager<TData> {
	return new EventManager(container, options);
}
