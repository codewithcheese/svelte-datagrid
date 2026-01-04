/**
 * Sort Worker Manager
 *
 * Manages a Web Worker for sorting operations, providing a Promise-based API.
 * Falls back to main thread sorting if Web Workers are not available.
 */

import type { SortSpec } from '../query/types.js';
import type { SortWorkerRequest, SortWorkerMessage } from './sort-worker.js';

export interface SortResult<TRow> {
	data: TRow[];
	duration: number;
	usedWorker: boolean;
}

let requestIdCounter = 0;

/**
 * Manager for sort worker operations.
 * Provides a Promise-based API for sorting data off the main thread.
 */
export class SortWorkerManager<TRow extends Record<string, unknown>> {
	private worker: Worker | null = null;
	private pendingRequests = new Map<
		string,
		{
			resolve: (result: SortResult<TRow>) => void;
			reject: (error: Error) => void;
		}
	>();
	private workerSupported = false;
	private workerUrl: string | null = null;

	constructor() {
		// Check for Worker support
		this.workerSupported = typeof Worker !== 'undefined' && typeof Blob !== 'undefined';
	}

	/**
	 * Initialize the worker. Must be called before sorting.
	 * Returns true if worker was successfully initialized.
	 */
	initialize(): boolean {
		if (!this.workerSupported) {
			return false;
		}

		try {
			// Create worker from inline script
			const workerCode = this.getWorkerCode();
			const blob = new Blob([workerCode], { type: 'application/javascript' });
			this.workerUrl = URL.createObjectURL(blob);
			this.worker = new Worker(this.workerUrl);

			this.worker.onmessage = (event: MessageEvent<SortWorkerMessage>) => {
				this.handleMessage(event.data);
			};

			this.worker.onerror = (event) => {
				console.error('[SortWorkerManager] Worker error:', event.message);
				// Reject all pending requests
				for (const [id, { reject }] of this.pendingRequests) {
					reject(new Error(`Worker error: ${event.message}`));
				}
				this.pendingRequests.clear();
			};

			return true;
		} catch (err) {
			console.warn('[SortWorkerManager] Failed to create worker:', err);
			this.workerSupported = false;
			return false;
		}
	}

	/**
	 * Sort data using the worker or fallback to main thread.
	 */
	async sort(data: TRow[], sorts: SortSpec[]): Promise<SortResult<TRow>> {
		// If no sorts, return original array
		if (!sorts || sorts.length === 0) {
			return { data, duration: 0, usedWorker: false };
		}

		// Try worker first
		if (this.worker) {
			return this.sortWithWorker(data, sorts);
		}

		// Fallback to main thread sorting
		return this.sortOnMainThread(data, sorts);
	}

	/**
	 * Sort using the Web Worker
	 */
	private sortWithWorker(data: TRow[], sorts: SortSpec[]): Promise<SortResult<TRow>> {
		return new Promise((resolve, reject) => {
			const id = `sort_${++requestIdCounter}`;

			this.pendingRequests.set(id, { resolve, reject });

			const request: SortWorkerRequest = {
				type: 'sort',
				id,
				data: data as Record<string, unknown>[],
				sorts
			};

			this.worker!.postMessage(request);
		});
	}

	/**
	 * Fallback: sort on main thread
	 */
	private sortOnMainThread(data: TRow[], sorts: SortSpec[]): Promise<SortResult<TRow>> {
		return new Promise((resolve) => {
			const startTime = performance.now();
			const sorted = [...data];

			sorted.sort((a, b) => {
				for (let i = 0; i < sorts.length; i++) {
					const result = this.compare(a, b, sorts[i]);
					if (result !== 0) return result;
				}
				return 0;
			});

			const duration = performance.now() - startTime;
			resolve({ data: sorted, duration, usedWorker: false });
		});
	}

	/**
	 * Compare function for main thread sorting
	 */
	private compare(a: TRow, b: TRow, sort: SortSpec): number {
		const aVal = a[sort.field];
		const bVal = b[sort.field];

		const nullsLast = sort.nulls === 'last' || (sort.nulls === undefined && sort.direction === 'asc');

		if (aVal == null && bVal == null) return 0;
		if (aVal == null) return nullsLast ? 1 : -1;
		if (bVal == null) return nullsLast ? -1 : 1;

		let result: number;

		if (typeof aVal === 'number' && typeof bVal === 'number') {
			result = aVal - bVal;
		} else if (typeof aVal === 'string' && typeof bVal === 'string') {
			result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
		} else if (aVal instanceof Date && bVal instanceof Date) {
			result = aVal.getTime() - bVal.getTime();
		} else {
			const aStr = String(aVal);
			const bStr = String(bVal);
			result = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
		}

		return sort.direction === 'desc' ? -result : result;
	}

	/**
	 * Handle messages from the worker
	 */
	private handleMessage(message: SortWorkerMessage) {
		const pending = this.pendingRequests.get(message.id);
		if (!pending) {
			console.warn('[SortWorkerManager] Received response for unknown request:', message.id);
			return;
		}

		this.pendingRequests.delete(message.id);

		if (message.type === 'error') {
			pending.reject(new Error(message.message));
		} else {
			pending.resolve({
				data: message.data as TRow[],
				duration: message.duration,
				usedWorker: true
			});
		}
	}

	/**
	 * Terminate the worker and clean up resources
	 */
	destroy() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		if (this.workerUrl) {
			URL.revokeObjectURL(this.workerUrl);
			this.workerUrl = null;
		}
		// Reject pending requests
		for (const [, { reject }] of this.pendingRequests) {
			reject(new Error('Worker destroyed'));
		}
		this.pendingRequests.clear();
	}

	/**
	 * Check if worker is available and initialized
	 */
	isAvailable(): boolean {
		return this.worker !== null;
	}

	/**
	 * Get inline worker code
	 */
	private getWorkerCode(): string {
		return `
			function defaultCompare(a, b, sort) {
				const aVal = a[sort.field];
				const bVal = b[sort.field];

				const nullsLast = sort.nulls === 'last' || (sort.nulls === undefined && sort.direction === 'asc');

				if (aVal == null && bVal == null) return 0;
				if (aVal == null) return nullsLast ? 1 : -1;
				if (bVal == null) return nullsLast ? -1 : 1;

				let result;

				if (typeof aVal === 'number' && typeof bVal === 'number') {
					result = aVal - bVal;
				} else if (typeof aVal === 'string' && typeof bVal === 'string') {
					result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
				} else if (aVal instanceof Date && bVal instanceof Date) {
					result = aVal.getTime() - bVal.getTime();
				} else {
					const aStr = String(aVal);
					const bStr = String(bVal);
					result = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
				}

				return sort.direction === 'desc' ? -result : result;
			}

			function sortData(data, sorts) {
				const sorted = [...data];
				sorted.sort((a, b) => {
					for (let i = 0; i < sorts.length; i++) {
						const result = defaultCompare(a, b, sorts[i]);
						if (result !== 0) return result;
					}
					return 0;
				});
				return sorted;
			}

			self.onmessage = function(event) {
				const { type, id, data, sorts } = event.data;

				if (type !== 'sort') {
					self.postMessage({ type: 'error', id, message: 'Unknown message type: ' + type });
					return;
				}

				try {
					const startTime = performance.now();
					const sorted = sortData(data, sorts);
					const duration = performance.now() - startTime;

					self.postMessage({ type: 'sorted', id, data: sorted, duration });
				} catch (err) {
					self.postMessage({ type: 'error', id, message: err.message || 'Unknown error' });
				}
			};
		`;
	}
}

// Singleton instance for shared use
let sharedManager: SortWorkerManager<Record<string, unknown>> | null = null;

/**
 * Get or create a shared SortWorkerManager instance
 */
export function getSharedSortWorker<TRow extends Record<string, unknown>>(): SortWorkerManager<TRow> {
	if (!sharedManager) {
		sharedManager = new SortWorkerManager();
		sharedManager.initialize();
	}
	return sharedManager as SortWorkerManager<TRow>;
}

/**
 * Destroy the shared worker instance
 */
export function destroySharedSortWorker(): void {
	if (sharedManager) {
		sharedManager.destroy();
		sharedManager = null;
	}
}
