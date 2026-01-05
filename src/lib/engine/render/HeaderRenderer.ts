/**
 * HeaderRenderer - Renders the grid header row.
 *
 * Unlike the body, the header doesn't need pooling since
 * the number of columns is typically fixed and small.
 * However, we still use efficient DOM updates.
 */

import type { ColumnDef, SortState } from '../../types/index.js';
import type { StateManager } from '../state/StateManager.js';

export interface HeaderRendererOptions {
	/** Header height in pixels */
	headerHeight: number;
	/** Whether columns are sortable */
	sortable: boolean;
	/** Whether columns are resizable */
	resizable: boolean;
	/** Whether columns are reorderable */
	reorderable: boolean;
}

interface HeaderCell {
	element: HTMLDivElement;
	contentEl: HTMLSpanElement;
	sortIndicatorEl: HTMLSpanElement;
	resizeHandleEl: HTMLDivElement | null;
	columnKey: string;
}

/**
 * HeaderRenderer class - handles header row rendering.
 */
export class HeaderRenderer<TData extends Record<string, unknown>> {
	private container: HTMLElement;
	private headerRow: HTMLElement;
	private pinnedLeftEl: HTMLElement;
	private scrollableEl: HTMLElement;
	private state: StateManager<TData>;
	private options: HeaderRendererOptions;
	private headerCells = new Map<string, HeaderCell>();
	private isDestroyed = false;

	constructor(
		container: HTMLElement,
		state: StateManager<TData>,
		options: HeaderRendererOptions
	) {
		this.container = container;
		this.state = state;
		this.options = options;

		// Create header structure
		this.headerRow = document.createElement('div');
		this.headerRow.className = 'datagrid-header';
		this.headerRow.setAttribute('role', 'rowgroup');
		this.headerRow.style.display = 'flex';
		this.headerRow.style.height = `${options.headerHeight}px`;
		this.headerRow.style.borderBottom = '1px solid var(--datagrid-border-color, #e0e0e0)';
		this.headerRow.style.backgroundColor = 'var(--datagrid-header-bg, #f5f5f5)';
		this.headerRow.style.fontWeight = '600';
		this.container.appendChild(this.headerRow);

		// Create pinned left section
		this.pinnedLeftEl = document.createElement('div');
		this.pinnedLeftEl.className = 'datagrid-header-pinned-left';
		this.pinnedLeftEl.style.display = 'flex';
		this.pinnedLeftEl.style.flexShrink = '0';
		this.pinnedLeftEl.style.position = 'sticky';
		this.pinnedLeftEl.style.left = '0';
		this.pinnedLeftEl.style.zIndex = '2';
		this.pinnedLeftEl.style.backgroundColor = 'inherit';
		this.headerRow.appendChild(this.pinnedLeftEl);

		// Create scrollable section
		this.scrollableEl = document.createElement('div');
		this.scrollableEl.className = 'datagrid-header-scrollable';
		this.scrollableEl.style.display = 'flex';
		this.scrollableEl.style.willChange = 'transform';
		this.headerRow.appendChild(this.scrollableEl);

		// Subscribe to state changes
		this.state.on('columns', () => this.render());
		this.state.on('sort', () => this.updateSortIndicators());
		this.state.on('scroll', () => this.updateScrollPosition());

		// Initial render
		this.render();
	}

	/**
	 * Render the header.
	 */
	render(): void {
		if (this.isDestroyed) return;

		const { pinnedLeftColumns, scrollableColumns, columnWidths, pinnedLeftWidth, scrollLeft } = this.state;

		// Update pinned left section width
		if (pinnedLeftWidth > 0) {
			this.pinnedLeftEl.style.width = `${pinnedLeftWidth}px`;
			this.pinnedLeftEl.style.display = 'flex';
		} else {
			this.pinnedLeftEl.style.display = 'none';
		}

		// Track existing cells
		const existingKeys = new Set(this.headerCells.keys());
		const neededKeys = new Set<string>();

		// Render pinned left header cells
		for (const column of pinnedLeftColumns) {
			neededKeys.add(column.key);
			this.renderHeaderCell(column, columnWidths.get(column.key) ?? column.width ?? 150, true);
		}

		// Render scrollable header cells
		for (const column of scrollableColumns) {
			neededKeys.add(column.key);
			this.renderHeaderCell(column, columnWidths.get(column.key) ?? column.width ?? 150, false);
		}

		// Remove cells that are no longer needed
		for (const key of existingKeys) {
			if (!neededKeys.has(key)) {
				const cell = this.headerCells.get(key);
				if (cell) {
					cell.element.remove();
					this.headerCells.delete(key);
				}
			}
		}

		// Update scroll position
		this.updateScrollPosition();
	}

	/**
	 * Render or update a single header cell.
	 */
	private renderHeaderCell(column: ColumnDef<TData>, width: number, isPinned: boolean): void {
		let cell = this.headerCells.get(column.key);
		const targetContainer = isPinned ? this.pinnedLeftEl : this.scrollableEl;

		if (!cell) {
			// Create new cell
			cell = this.createHeaderCell(column.key);
			this.headerCells.set(column.key, cell);
		}

		// Move to correct container if needed
		if (cell.element.parentNode !== targetContainer) {
			targetContainer.appendChild(cell.element);
		}

		// Update content
		cell.contentEl.textContent = column.header;

		// Update width
		cell.element.style.width = `${width}px`;
		cell.element.style.minWidth = `${width}px`;
		cell.element.style.maxWidth = `${width}px`;

		// Update sort indicator
		this.updateCellSortIndicator(cell, column.key);

		// Update sortable class
		cell.element.classList.toggle('sortable', this.options.sortable && column.sortable !== false);

		// Show/hide resize handle
		if (cell.resizeHandleEl) {
			cell.resizeHandleEl.style.display = this.options.resizable ? '' : 'none';
		}

		// Update draggable state
		if (this.options.reorderable && column.reorderable !== false) {
			cell.element.draggable = true;
		} else {
			cell.element.draggable = false;
		}
	}

	/**
	 * Create a new header cell element.
	 */
	private createHeaderCell(columnKey: string): HeaderCell {
		const element = document.createElement('div');
		element.className = 'datagrid-header-cell';
		element.setAttribute('role', 'columnheader');
		element.style.display = 'flex';
		element.style.alignItems = 'center';
		element.style.padding = '0 12px';
		element.style.boxSizing = 'border-box';
		element.style.position = 'relative';
		element.style.cursor = 'pointer';
		element.style.userSelect = 'none';
		element.dataset.columnKey = columnKey;

		// Content span
		const contentEl = document.createElement('span');
		contentEl.className = 'datagrid-header-content';
		contentEl.style.overflow = 'hidden';
		contentEl.style.textOverflow = 'ellipsis';
		contentEl.style.whiteSpace = 'nowrap';
		contentEl.style.flex = '1';
		element.appendChild(contentEl);

		// Sort indicator
		const sortIndicatorEl = document.createElement('span');
		sortIndicatorEl.className = 'datagrid-sort-indicator';
		sortIndicatorEl.style.marginLeft = '4px';
		sortIndicatorEl.style.fontSize = '12px';
		sortIndicatorEl.style.opacity = '0.7';
		element.appendChild(sortIndicatorEl);

		// Resize handle (if resizable)
		let resizeHandleEl: HTMLDivElement | null = null;
		if (this.options.resizable) {
			resizeHandleEl = document.createElement('div');
			resizeHandleEl.className = 'datagrid-resize-handle';
			resizeHandleEl.setAttribute('role', 'separator');
			resizeHandleEl.setAttribute('aria-orientation', 'vertical');
			resizeHandleEl.style.position = 'absolute';
			resizeHandleEl.style.right = '0';
			resizeHandleEl.style.top = '0';
			resizeHandleEl.style.bottom = '0';
			resizeHandleEl.style.width = '6px';
			resizeHandleEl.style.cursor = 'col-resize';
			resizeHandleEl.style.background = 'transparent';
			resizeHandleEl.dataset.columnKey = columnKey;
			element.appendChild(resizeHandleEl);
		}

		return {
			element,
			contentEl,
			sortIndicatorEl,
			resizeHandleEl,
			columnKey
		};
	}

	/**
	 * Update sort indicators for all cells.
	 */
	private updateSortIndicators(): void {
		for (const [columnKey, cell] of this.headerCells) {
			this.updateCellSortIndicator(cell, columnKey);
		}
	}

	/**
	 * Update sort indicator for a single cell.
	 */
	private updateCellSortIndicator(cell: HeaderCell, columnKey: string): void {
		const sortState = this.state.sortState.find((s) => s.columnKey === columnKey);

		if (sortState?.direction === 'asc') {
			cell.sortIndicatorEl.textContent = '↑';
			cell.element.setAttribute('aria-sort', 'ascending');
		} else if (sortState?.direction === 'desc') {
			cell.sortIndicatorEl.textContent = '↓';
			cell.element.setAttribute('aria-sort', 'descending');
		} else {
			cell.sortIndicatorEl.textContent = '';
			cell.element.setAttribute('aria-sort', 'none');
		}
	}

	/**
	 * Update horizontal scroll position.
	 */
	private updateScrollPosition(): void {
		const { scrollLeft } = this.state;
		this.scrollableEl.style.transform = `translateX(${-scrollLeft}px)`;
	}

	/**
	 * Get the header row element (for attaching event listeners).
	 */
	getHeaderRow(): HTMLElement {
		return this.headerRow;
	}

	/**
	 * Get a header cell element by column key.
	 */
	getHeaderCell(columnKey: string): HTMLElement | null {
		return this.headerCells.get(columnKey)?.element ?? null;
	}

	/**
	 * Destroy the renderer.
	 */
	destroy(): void {
		this.isDestroyed = true;
		this.headerCells.clear();
		this.headerRow.remove();
	}
}

/**
 * Factory function to create a HeaderRenderer.
 */
export function createHeaderRenderer<TData extends Record<string, unknown>>(
	container: HTMLElement,
	state: StateManager<TData>,
	options: HeaderRendererOptions
): HeaderRenderer<TData> {
	return new HeaderRenderer(container, state, options);
}
