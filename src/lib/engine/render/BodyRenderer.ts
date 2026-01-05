/**
 * BodyRenderer - Renders the grid body using DOM pooling.
 *
 * Key responsibilities:
 * - Manages RowPool for efficient row element reuse
 * - Handles virtual scrolling (only renders visible rows)
 * - Updates cell content efficiently (only when changed)
 * - Batches DOM updates via requestAnimationFrame
 */

import type { ColumnDef } from '../../types/index.js';
import type { StateManager } from '../state/StateManager.js';
import { RowPool, type PooledRow } from './RowPool.js';

export interface BodyRendererOptions {
	/** Row height in pixels */
	rowHeight: number;
	/** Function to get row ID */
	getRowId: (row: unknown, index: number) => string | number;
	/** Custom cell renderer (optional) */
	cellRenderer?: (context: CellRenderContext) => string;
	/** Custom row class function (optional) */
	rowClass?: (row: unknown, index: number) => string;
}

export interface CellRenderContext {
	value: unknown;
	displayValue: string;
	row: unknown;
	column: ColumnDef<unknown>;
	rowIndex: number;
	columnKey: string;
}

/**
 * BodyRenderer class - handles virtualized body rendering with DOM pooling.
 */
export class BodyRenderer<TData extends Record<string, unknown>> {
	private container: HTMLElement;
	private rowsContainer: HTMLElement;
	private scrollContainer: HTMLElement;
	private rowPool: RowPool;
	private state: StateManager<TData>;
	private options: BodyRendererOptions;
	private pendingRender: number | null = null;
	private isDestroyed = false;

	constructor(
		container: HTMLElement,
		state: StateManager<TData>,
		options: BodyRendererOptions
	) {
		this.container = container;
		this.state = state;
		this.options = options;

		// Create scroll container structure
		this.scrollContainer = document.createElement('div');
		this.scrollContainer.className = 'datagrid-scroll-container';
		this.scrollContainer.style.position = 'relative';
		this.scrollContainer.style.overflow = 'hidden';
		this.container.appendChild(this.scrollContainer);

		// Create rows container (will be translated for virtual scroll)
		this.rowsContainer = document.createElement('div');
		this.rowsContainer.className = 'datagrid-rows';
		this.rowsContainer.style.position = 'absolute';
		this.rowsContainer.style.left = '0';
		this.rowsContainer.style.right = '0';
		this.rowsContainer.style.willChange = 'transform';
		this.scrollContainer.appendChild(this.rowsContainer);

		// Initialize row pool
		this.rowPool = new RowPool(this.rowsContainer, {
			rowHeight: options.rowHeight,
			initialSize: 50
		});

		// Warmup pool for smooth initial scroll
		this.rowPool.warmup(50);

		// Subscribe to state changes
		this.state.on('scroll', () => this.scheduleRender());
		this.state.on('data', () => this.scheduleRender());
		this.state.on('selection', () => this.scheduleRender());
		this.state.on('columns', () => this.scheduleRender());
		this.state.on('resize', () => this.scheduleRender());

		// Trigger initial render after a microtask to ensure data is available
		// This handles cases where data loads before the event subscription
		queueMicrotask(() => {
			if (!this.isDestroyed) {
				this.render();
			}
		});

		// Also schedule via setTimeout(0) as a backup for environments
		// where queueMicrotask might not fire reliably
		setTimeout(() => {
			if (!this.isDestroyed && this.state.rows.length > 0) {
				this.render();
			}
		}, 0);
	}

	/**
	 * Schedule a render on next animation frame.
	 * Multiple calls before the frame are coalesced.
	 * Uses both rAF and setTimeout fallback to ensure rendering in headless browsers.
	 */
	scheduleRender(): void {
		if (this.isDestroyed) return;
		if (this.pendingRender !== null) return;

		const doRender = () => {
			if (this.pendingRender !== null) {
				cancelAnimationFrame(this.pendingRender);
			}
			if (this.pendingFallback !== null) {
				clearTimeout(this.pendingFallback);
			}
			this.pendingRender = null;
			this.pendingFallback = null;
			if (!this.isDestroyed) {
				this.render();
			}
		};

		// Primary: requestAnimationFrame for smooth rendering
		this.pendingRender = requestAnimationFrame(doRender);

		// Fallback: setTimeout(0) for headless browsers where rAF may be throttled
		// Using 0ms ensures the callback runs in the next event loop iteration
		this.pendingFallback = window.setTimeout(doRender, 0);
	}

	// Fallback timeout handle
	private pendingFallback: number | null = null;

	/**
	 * Perform immediate render (call sparingly).
	 */
	render(): void {
		if (this.isDestroyed) return;

		const { visibleRows, visibleRange, totalRowCount, scrollLeft, pinnedLeftWidth } = this.state;
		const { startIndex } = visibleRange;
		const { rowHeight, getRowId } = this.options;

		// Update scroll container size
		this.scrollContainer.style.height = `${this.state.renderHeight}px`;
		this.scrollContainer.style.width = `${this.state.totalWidth}px`;

		// Update rows container transform for virtual scrolling
		const offsetY = startIndex * rowHeight;
		this.rowsContainer.style.transform = `translateY(${offsetY}px)`;

		// Track which rows we need
		const neededRowIds = new Set<string | number>();

		// Render each visible row
		visibleRows.forEach((row, i) => {
			const rowIndex = startIndex + i;
			const rowId = getRowId(row, rowIndex);
			neededRowIds.add(rowId);

			this.renderRow(row as TData, rowId, rowIndex, scrollLeft, pinnedLeftWidth);
		});

		// Release unused rows back to pool
		this.rowPool.releaseExcept(neededRowIds);
	}

	/**
	 * Render a single row.
	 */
	private renderRow(
		row: TData,
		rowId: string | number,
		rowIndex: number,
		scrollLeft: number,
		pinnedLeftWidth: number
	): void {
		const pooledRow = this.rowPool.acquire(rowId);
		const { element, pinnedLeftEl, scrollableEl, cells } = pooledRow;
		const { rowHeight, rowClass } = this.options;

		// Set up cell containers
		cells.setContainers(pinnedLeftEl, scrollableEl);

		// Update row position and visibility
		element.style.height = `${rowHeight}px`;

		// Update data attributes
		element.dataset.rowIndex = String(rowIndex);

		// Update classes
		const isSelected = this.state.selectedIds.has(rowId);
		const isFocused = this.state.focusedRowId === rowId;
		const isEven = rowIndex % 2 === 0;

		element.classList.toggle('selected', isSelected);
		element.classList.toggle('focused', isFocused);
		element.classList.toggle('even', isEven);
		element.classList.toggle('odd', !isEven);

		// Update aria-selected for accessibility
		element.setAttribute('aria-selected', String(isSelected));

		// Apply custom row class
		if (rowClass) {
			const customClass = rowClass(row, rowIndex);
			if (customClass) {
				// Remove previous custom classes and add new one
				element.className = `datagrid-row ${customClass}`;
				if (isSelected) element.classList.add('selected');
				if (isFocused) element.classList.add('focused');
				if (isEven) element.classList.add('even');
				else element.classList.add('odd');
			}
		}

		// Update pinned left section width
		if (pinnedLeftWidth > 0) {
			pinnedLeftEl.style.width = `${pinnedLeftWidth}px`;
			pinnedLeftEl.style.display = 'flex';
		} else {
			pinnedLeftEl.style.display = 'none';
		}

		// Update scrollable section transform
		scrollableEl.style.transform = `translateX(${-scrollLeft}px)`;

		// Render cells
		this.renderCells(pooledRow, row, rowId, rowIndex);
	}

	/**
	 * Render cells for a row.
	 */
	private renderCells(
		pooledRow: PooledRow,
		row: TData,
		rowId: string | number,
		rowIndex: number
	): void {
		const { visibleColumns, pinnedLeftColumns, scrollableColumns, columnWidths } = this.state;
		const { cells } = pooledRow;
		const { cellRenderer } = this.options;

		// Track which columns we need
		const neededColumnKeys = new Set<string>();

		// Render pinned left cells
		for (const column of pinnedLeftColumns) {
			neededColumnKeys.add(column.key);
			const cell = cells.acquire(column.key, true);
			this.renderCell(cell, row, column, rowIndex, columnWidths.get(column.key) ?? column.width ?? 150);
		}

		// Render scrollable cells
		for (const column of scrollableColumns) {
			neededColumnKeys.add(column.key);
			const cell = cells.acquire(column.key, false);
			this.renderCell(cell, row, column, rowIndex, columnWidths.get(column.key) ?? column.width ?? 150);
		}

		// Release unused cells
		cells.releaseExcept(neededColumnKeys);
	}

	/**
	 * Render a single cell.
	 */
	private renderCell(
		cell: { element: HTMLDivElement; contentEl: HTMLSpanElement; currentValue: string },
		row: TData,
		column: ColumnDef<TData>,
		rowIndex: number,
		width: number
	): void {
		const { cellRenderer } = this.options;

		// Update width
		cell.element.style.width = `${width}px`;
		cell.element.style.minWidth = `${width}px`;
		cell.element.style.maxWidth = `${width}px`;

		// Get value
		const value = this.getCellValue(row, column);
		const displayValue = this.formatValue(value, column);

		// Use custom renderer if provided
		let content = displayValue;
		if (cellRenderer) {
			content = cellRenderer({
				value,
				displayValue,
				row,
				column: column as ColumnDef<unknown>,
				rowIndex,
				columnKey: column.key
			});
		}

		// Only update if changed
		if (cell.currentValue !== content) {
			cell.contentEl.textContent = content;
			cell.currentValue = content;
		}

		// Update alignment classes
		cell.element.classList.toggle('align-right', column.align === 'right');
		cell.element.classList.toggle('align-center', column.align === 'center');

		// Apply cell class if defined
		if (column.cellClass) {
			const cellClass = typeof column.cellClass === 'function'
				? column.cellClass(row, value)
				: column.cellClass;
			if (cellClass) {
				// We need to be careful not to remove our base classes
				const baseClasses = ['datagrid-cell'];
				if (column.align === 'right') baseClasses.push('align-right');
				if (column.align === 'center') baseClasses.push('align-center');
				cell.element.className = `${baseClasses.join(' ')} ${cellClass}`;
			}
		}
	}

	/**
	 * Get cell value from row using column definition.
	 */
	private getCellValue(row: TData, column: ColumnDef<TData>): unknown {
		if (typeof column.accessor === 'function') {
			return column.accessor(row);
		}
		if (column.accessor) {
			return row[column.accessor as keyof TData];
		}
		return row[column.key as keyof TData];
	}

	/**
	 * Format value for display.
	 */
	private formatValue(value: unknown, column: ColumnDef<TData>): string {
		if (column.formatter) {
			return column.formatter(value as never);
		}
		if (value === null || value === undefined) {
			return '';
		}
		if (value instanceof Date) {
			return value.toLocaleDateString();
		}
		if (typeof value === 'boolean') {
			return value ? 'Yes' : 'No';
		}
		if (typeof value === 'number') {
			return value.toLocaleString();
		}
		return String(value);
	}

	/**
	 * Get pool statistics for debugging.
	 */
	getPoolStats(): { poolSize: number; activeCount: number; inactiveCount: number } {
		return this.rowPool.getStats();
	}

	/**
	 * Get the scroll container element (for attaching scroll listeners).
	 */
	getScrollContainer(): HTMLElement {
		return this.scrollContainer;
	}

	/**
	 * Get the rows container element.
	 */
	getRowsContainer(): HTMLElement {
		return this.rowsContainer;
	}

	/**
	 * Destroy the renderer and clean up.
	 */
	destroy(): void {
		this.isDestroyed = true;

		if (this.pendingRender !== null) {
			cancelAnimationFrame(this.pendingRender);
			this.pendingRender = null;
		}

		if (this.pendingFallback !== null) {
			clearTimeout(this.pendingFallback);
			this.pendingFallback = null;
		}

		this.rowPool.destroy();
		this.scrollContainer.remove();
	}
}

/**
 * Factory function to create a BodyRenderer.
 */
export function createBodyRenderer<TData extends Record<string, unknown>>(
	container: HTMLElement,
	state: StateManager<TData>,
	options: BodyRendererOptions
): BodyRenderer<TData> {
	return new BodyRenderer(container, state, options);
}
