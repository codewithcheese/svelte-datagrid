/**
 * RowPool - DOM element pooling for grid rows.
 *
 * Instead of creating/destroying DOM elements during scroll,
 * we maintain a pool of reusable row elements.
 *
 * Benefits:
 * - Eliminates createElement/removeChild during scroll
 * - Reduces garbage collection pressure
 * - Maintains consistent frame timing
 */

import type { CellPool } from './CellPool.js';
import { createCellPool } from './CellPool.js';

export interface PooledRow {
	/** The row's container element */
	element: HTMLDivElement;
	/** Pinned left section element */
	pinnedLeftEl: HTMLDivElement;
	/** Scrollable section element */
	scrollableEl: HTMLDivElement;
	/** Cell pool for this row */
	cells: CellPool;
	/** Currently assigned row ID (null if in pool) */
	rowId: string | number | null;
	/** Whether this row is currently in use */
	inUse: boolean;
}

export interface RowPoolOptions {
	/** Initial pool size (default: 50) */
	initialSize?: number;
	/** Row height in pixels */
	rowHeight: number;
}

export class RowPool {
	private pool: PooledRow[] = [];
	private activeRows = new Map<string | number, PooledRow>();
	private container: HTMLElement;
	private rowHeight: number;

	constructor(container: HTMLElement, options: RowPoolOptions) {
		this.container = container;
		this.rowHeight = options.rowHeight;
	}

	/**
	 * Pre-allocate row elements for smooth scrolling.
	 * Call this after construction to warm up the pool.
	 */
	warmup(count: number): void {
		for (let i = 0; i < count; i++) {
			const row = this.createRow();
			row.element.style.display = 'none';
			this.pool.push(row);
		}
	}

	/**
	 * Get or create a row element for the given rowId.
	 * If the row is already active, returns it.
	 * Otherwise, acquires from pool or creates new.
	 */
	acquire(rowId: string | number): PooledRow {
		// Check if already active
		const existing = this.activeRows.get(rowId);
		if (existing) {
			return existing;
		}

		// Find unused row in pool
		let row = this.pool.find((r) => !r.inUse);

		// Create new if pool exhausted
		if (!row) {
			row = this.createRow();
			this.pool.push(row);
		}

		// Activate the row
		row.inUse = true;
		row.rowId = rowId;
		row.element.style.display = '';
		row.element.dataset.rowId = String(rowId);
		this.activeRows.set(rowId, row);

		return row;
	}

	/**
	 * Release a row back to the pool.
	 * The row is hidden but kept in DOM for reuse.
	 */
	release(rowId: string | number): void {
		const row = this.activeRows.get(rowId);
		if (!row) return;

		row.inUse = false;
		row.rowId = null;
		row.element.style.display = 'none';
		row.element.dataset.rowId = '';
		row.element.dataset.rowIndex = '';

		// Reset visual state
		row.element.classList.remove('selected', 'focused', 'editing');
		row.element.setAttribute('aria-selected', 'false');

		// Release all cells in this row
		row.cells.releaseAll();

		this.activeRows.delete(rowId);
	}

	/**
	 * Release all rows back to the pool.
	 */
	releaseAll(): void {
		for (const rowId of [...this.activeRows.keys()]) {
			this.release(rowId);
		}
	}

	/**
	 * Release all rows not in the keep set.
	 * Efficient batch release for scroll updates.
	 */
	releaseExcept(keepIds: Set<string | number>): void {
		const toRelease: (string | number)[] = [];

		for (const rowId of this.activeRows.keys()) {
			if (!keepIds.has(rowId)) {
				toRelease.push(rowId);
			}
		}

		for (const rowId of toRelease) {
			this.release(rowId);
		}
	}

	/**
	 * Get all currently active rows.
	 */
	getActiveRows(): Map<string | number, PooledRow> {
		return this.activeRows;
	}

	/**
	 * Get pool statistics for debugging/monitoring.
	 */
	getStats(): { poolSize: number; activeCount: number; inactiveCount: number } {
		return {
			poolSize: this.pool.length,
			activeCount: this.activeRows.size,
			inactiveCount: this.pool.filter((r) => !r.inUse).length
		};
	}

	/**
	 * Create a new row element with proper structure.
	 */
	private createRow(): PooledRow {
		const element = document.createElement('div');
		element.className = 'datagrid-row';
		element.setAttribute('role', 'row');
		element.setAttribute('data-testid', 'datagrid-row');
		element.style.height = `${this.rowHeight}px`;
		element.style.display = 'flex';
		element.style.position = 'relative';

		// Create pinned left section
		const pinnedLeftEl = document.createElement('div');
		pinnedLeftEl.className = 'datagrid-row-pinned-left';
		pinnedLeftEl.style.display = 'flex';
		pinnedLeftEl.style.flexShrink = '0';
		pinnedLeftEl.style.position = 'sticky';
		pinnedLeftEl.style.left = '0';
		pinnedLeftEl.style.zIndex = '1';
		element.appendChild(pinnedLeftEl);

		// Create scrollable section
		const scrollableEl = document.createElement('div');
		scrollableEl.className = 'datagrid-row-scrollable';
		scrollableEl.style.display = 'flex';
		scrollableEl.style.willChange = 'transform';
		element.appendChild(scrollableEl);

		// Append to container
		this.container.appendChild(element);

		return {
			element,
			pinnedLeftEl,
			scrollableEl,
			cells: createCellPool(),
			rowId: null,
			inUse: false
		};
	}

	/**
	 * Destroy the pool and remove all elements from DOM.
	 */
	destroy(): void {
		for (const row of this.pool) {
			row.element.remove();
			row.cells.destroy();
		}
		this.pool = [];
		this.activeRows.clear();
	}
}

/**
 * Factory function to create a RowPool instance.
 */
export function createRowPool(container: HTMLElement, options: RowPoolOptions): RowPool {
	return new RowPool(container, options);
}
