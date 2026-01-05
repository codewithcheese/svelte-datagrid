/**
 * CellPool - DOM element pooling for grid cells within a row.
 *
 * Each row maintains its own CellPool for efficient cell reuse.
 * Cells are identified by column key and reused across row reassignments.
 */

export interface PooledCell {
	/** The cell's container element */
	element: HTMLDivElement;
	/** Content span for text display */
	contentEl: HTMLSpanElement;
	/** Currently assigned column key (null if in pool) */
	columnKey: string | null;
	/** Whether this cell is currently in use */
	inUse: boolean;
	/** Current displayed value (for change detection) */
	currentValue: string;
}

export class CellPool {
	private pool: PooledCell[] = [];
	private activeCells = new Map<string, PooledCell>();
	private pinnedContainer: HTMLElement | null = null;
	private scrollableContainer: HTMLElement | null = null;

	/**
	 * Set the container elements for pinned and scrollable cells.
	 * Must be called before acquiring cells.
	 */
	setContainers(pinnedContainer: HTMLElement, scrollableContainer: HTMLElement): void {
		this.pinnedContainer = pinnedContainer;
		this.scrollableContainer = scrollableContainer;
	}

	/**
	 * Acquire a cell for the given column.
	 * @param columnKey - The column key
	 * @param isPinned - Whether this is a pinned column
	 */
	acquire(columnKey: string, isPinned: boolean): PooledCell {
		// Check if already active
		const existing = this.activeCells.get(columnKey);
		if (existing) {
			return existing;
		}

		// Find unused cell in pool
		let cell = this.pool.find((c) => !c.inUse);

		// Create new if pool exhausted
		if (!cell) {
			cell = this.createCell();
			this.pool.push(cell);
		}

		// Activate the cell
		cell.inUse = true;
		cell.columnKey = columnKey;
		cell.element.style.display = '';
		cell.element.dataset.columnKey = columnKey;
		this.activeCells.set(columnKey, cell);

		// Move to correct container if needed
		const targetContainer = isPinned ? this.pinnedContainer : this.scrollableContainer;
		if (targetContainer && cell.element.parentNode !== targetContainer) {
			targetContainer.appendChild(cell.element);
		}

		return cell;
	}

	/**
	 * Release a cell back to the pool.
	 */
	release(columnKey: string): void {
		const cell = this.activeCells.get(columnKey);
		if (!cell) return;

		cell.inUse = false;
		cell.columnKey = null;
		cell.element.style.display = 'none';
		cell.element.dataset.columnKey = '';
		cell.currentValue = '';

		// Reset visual state
		cell.element.classList.remove('editable', 'editing', 'align-right', 'align-center');

		this.activeCells.delete(columnKey);
	}

	/**
	 * Release all cells back to the pool.
	 */
	releaseAll(): void {
		for (const columnKey of [...this.activeCells.keys()]) {
			this.release(columnKey);
		}
	}

	/**
	 * Release cells not in the keep set.
	 */
	releaseExcept(keepKeys: Set<string>): void {
		for (const columnKey of [...this.activeCells.keys()]) {
			if (!keepKeys.has(columnKey)) {
				this.release(columnKey);
			}
		}
	}

	/**
	 * Get all currently active cells.
	 */
	getActiveCells(): Map<string, PooledCell> {
		return this.activeCells;
	}

	/**
	 * Update cell content efficiently (only if changed).
	 */
	updateContent(cell: PooledCell, value: string): boolean {
		if (cell.currentValue === value) {
			return false; // No change
		}
		cell.contentEl.textContent = value;
		cell.currentValue = value;
		return true;
	}

	/**
	 * Create a new cell element.
	 */
	private createCell(): PooledCell {
		const element = document.createElement('div');
		element.className = 'datagrid-cell';
		element.setAttribute('role', 'gridcell');
		element.style.display = 'none';
		element.style.overflow = 'hidden';
		element.style.textOverflow = 'ellipsis';
		element.style.whiteSpace = 'nowrap';
		element.style.padding = '0 12px';
		element.style.boxSizing = 'border-box';
		element.style.display = 'flex';
		element.style.alignItems = 'center';

		const contentEl = document.createElement('span');
		contentEl.className = 'datagrid-cell-content';
		contentEl.style.overflow = 'hidden';
		contentEl.style.textOverflow = 'ellipsis';
		contentEl.style.whiteSpace = 'nowrap';
		contentEl.style.flex = '1';
		contentEl.style.minWidth = '0';
		element.appendChild(contentEl);

		return {
			element,
			contentEl,
			columnKey: null,
			inUse: false,
			currentValue: ''
		};
	}

	/**
	 * Destroy the pool.
	 */
	destroy(): void {
		for (const cell of this.pool) {
			cell.element.remove();
		}
		this.pool = [];
		this.activeCells.clear();
	}
}

/**
 * Factory function to create a CellPool instance.
 */
export function createCellPool(): CellPool {
	return new CellPool();
}
