/**
 * Web Worker for non-blocking sort operations.
 *
 * This worker handles sorting of large datasets off the main thread,
 * preventing UI blocking during sort operations.
 */

import type { SortSpec } from '../query/types.js';

export interface SortWorkerRequest {
	type: 'sort';
	id: string;
	data: Record<string, unknown>[];
	sorts: SortSpec[];
}

export interface SortWorkerResponse {
	type: 'sorted';
	id: string;
	data: Record<string, unknown>[];
	duration: number;
}

export interface SortWorkerError {
	type: 'error';
	id: string;
	message: string;
}

export type SortWorkerMessage = SortWorkerResponse | SortWorkerError;

/**
 * Default comparison function for sorting
 */
function defaultCompare(a: Record<string, unknown>, b: Record<string, unknown>, sort: SortSpec): number {
	const aVal = a[sort.field];
	const bVal = b[sort.field];

	// Handle nulls
	const nullsLast = sort.nulls === 'last' || (sort.nulls === undefined && sort.direction === 'asc');

	if (aVal == null && bVal == null) return 0;
	if (aVal == null) return nullsLast ? 1 : -1;
	if (bVal == null) return nullsLast ? -1 : 1;

	// Compare values
	let result: number;

	if (typeof aVal === 'number' && typeof bVal === 'number') {
		result = aVal - bVal;
	} else if (typeof aVal === 'string' && typeof bVal === 'string') {
		// Use simple comparison for performance - localeCompare is slow
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
 * Sort data array by multiple sort specifications
 */
function sortData(data: Record<string, unknown>[], sorts: SortSpec[]): Record<string, unknown>[] {
	// Clone array to avoid mutating the original
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

// Worker message handler
self.onmessage = (event: MessageEvent<SortWorkerRequest>) => {
	const { type, id, data, sorts } = event.data;

	if (type !== 'sort') {
		const error: SortWorkerError = {
			type: 'error',
			id,
			message: `Unknown message type: ${type}`
		};
		self.postMessage(error);
		return;
	}

	try {
		const startTime = performance.now();
		const sorted = sortData(data, sorts);
		const duration = performance.now() - startTime;

		const response: SortWorkerResponse = {
			type: 'sorted',
			id,
			data: sorted,
			duration
		};

		self.postMessage(response);
	} catch (err) {
		const error: SortWorkerError = {
			type: 'error',
			id,
			message: err instanceof Error ? err.message : 'Unknown error'
		};
		self.postMessage(error);
	}
};
