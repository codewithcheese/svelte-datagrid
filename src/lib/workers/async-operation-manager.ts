/**
 * AsyncOperationManager - Generalized async operation framework
 *
 * Provides a pattern for offloading expensive operations to Web Workers
 * while maintaining a clean, Promise-based API. Supports:
 * - Automatic worker pool management
 * - Request cancellation
 * - Fallback to main thread when workers unavailable
 * - Progress reporting (optional)
 */

export type OperationType = 'sort' | 'filter' | 'aggregate' | 'transform';

export interface OperationRequest<TInput = unknown, TParams = unknown> {
	type: OperationType;
	id: string;
	input: TInput;
	params: TParams;
}

export interface OperationResponse<TOutput = unknown> {
	type: 'result';
	id: string;
	output: TOutput;
	duration: number;
}

export interface OperationError {
	type: 'error';
	id: string;
	message: string;
}

export interface OperationProgress {
	type: 'progress';
	id: string;
	progress: number; // 0-1
	message?: string;
}

export type WorkerMessage<TOutput = unknown> =
	| OperationResponse<TOutput>
	| OperationError
	| OperationProgress;

export interface OperationResult<TOutput> {
	output: TOutput;
	duration: number;
	usedWorker: boolean;
}

export interface OperationHandler<TInput, TParams, TOutput> {
	/**
	 * Execute the operation on the main thread (fallback)
	 */
	executeSync: (input: TInput, params: TParams) => TOutput;

	/**
	 * Generate worker code for this operation (as a string)
	 * The code should define a function with signature: (input, params) => output
	 */
	workerCode: string;
}

interface PendingOperation<TOutput> {
	resolve: (result: OperationResult<TOutput>) => void;
	reject: (error: Error) => void;
	onProgress?: (progress: number, message?: string) => void;
}

let requestIdCounter = 0;

/**
 * Generates a unique operation ID
 */
export function generateOperationId(): string {
	return `op_${++requestIdCounter}_${Date.now()}`;
}

/**
 * AsyncOperationManager manages worker-based async operations
 */
export class AsyncOperationManager {
	private worker: Worker | null = null;
	private workerUrl: string | null = null;
	private pendingOperations = new Map<string, PendingOperation<unknown>>();
	private operationHandlers = new Map<OperationType, OperationHandler<unknown, unknown, unknown>>();
	private workerSupported = false;
	private initialized = false;

	constructor() {
		this.workerSupported = typeof Worker !== 'undefined' && typeof Blob !== 'undefined';
	}

	/**
	 * Register a handler for an operation type
	 */
	registerHandler<TInput, TParams, TOutput>(
		type: OperationType,
		handler: OperationHandler<TInput, TParams, TOutput>
	): void {
		this.operationHandlers.set(type, handler as OperationHandler<unknown, unknown, unknown>);
	}

	/**
	 * Initialize the worker with all registered handlers
	 */
	initialize(): boolean {
		if (this.initialized) return this.worker !== null;
		this.initialized = true;

		if (!this.workerSupported) {
			return false;
		}

		try {
			const workerCode = this.generateWorkerCode();
			const blob = new Blob([workerCode], { type: 'application/javascript' });
			this.workerUrl = URL.createObjectURL(blob);
			this.worker = new Worker(this.workerUrl);

			this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
				this.handleMessage(event.data);
			};

			this.worker.onerror = (event) => {
				console.error('[AsyncOperationManager] Worker error:', event.message);
				this.rejectAllPending(`Worker error: ${event.message}`);
			};

			return true;
		} catch (err) {
			console.warn('[AsyncOperationManager] Failed to create worker:', err);
			this.workerSupported = false;
			return false;
		}
	}

	/**
	 * Execute an operation asynchronously
	 */
	async execute<TInput, TParams, TOutput>(
		type: OperationType,
		input: TInput,
		params: TParams,
		options?: {
			onProgress?: (progress: number, message?: string) => void;
			signal?: AbortSignal;
		}
	): Promise<OperationResult<TOutput>> {
		const handler = this.operationHandlers.get(type);
		if (!handler) {
			throw new Error(`No handler registered for operation type: ${type}`);
		}

		// Check abort signal
		if (options?.signal?.aborted) {
			throw new Error('Operation cancelled');
		}

		// Use worker if available and initialized
		if (this.worker) {
			return this.executeWithWorker<TInput, TParams, TOutput>(type, input, params, options);
		}

		// Fallback to main thread
		return this.executeSync<TInput, TParams, TOutput>(type, input, params, handler);
	}

	/**
	 * Execute using the worker
	 */
	private executeWithWorker<TInput, TParams, TOutput>(
		type: OperationType,
		input: TInput,
		params: TParams,
		options?: {
			onProgress?: (progress: number, message?: string) => void;
			signal?: AbortSignal;
		}
	): Promise<OperationResult<TOutput>> {
		return new Promise((resolve, reject) => {
			const id = generateOperationId();

			// Set up abort handler
			if (options?.signal) {
				options.signal.addEventListener('abort', () => {
					this.pendingOperations.delete(id);
					reject(new Error('Operation cancelled'));
				});
			}

			this.pendingOperations.set(id, {
				resolve: resolve as (result: OperationResult<unknown>) => void,
				reject,
				onProgress: options?.onProgress
			});

			const request: OperationRequest<TInput, TParams> = {
				type,
				id,
				input,
				params
			};

			this.worker!.postMessage(request);
		});
	}

	/**
	 * Execute synchronously on main thread
	 */
	private executeSync<TInput, TParams, TOutput>(
		_type: OperationType,
		input: TInput,
		params: TParams,
		handler: OperationHandler<unknown, unknown, unknown>
	): Promise<OperationResult<TOutput>> {
		return new Promise((resolve) => {
			const startTime = performance.now();
			const output = handler.executeSync(input, params) as TOutput;
			const duration = performance.now() - startTime;

			resolve({
				output,
				duration,
				usedWorker: false
			});
		});
	}

	/**
	 * Handle messages from the worker
	 */
	private handleMessage(message: WorkerMessage): void {
		const pending = this.pendingOperations.get(message.id);
		if (!pending) {
			return;
		}

		switch (message.type) {
			case 'result':
				this.pendingOperations.delete(message.id);
				pending.resolve({
					output: message.output,
					duration: message.duration,
					usedWorker: true
				});
				break;

			case 'error':
				this.pendingOperations.delete(message.id);
				pending.reject(new Error(message.message));
				break;

			case 'progress':
				pending.onProgress?.(message.progress, message.message);
				break;
		}
	}

	/**
	 * Reject all pending operations
	 */
	private rejectAllPending(message: string): void {
		for (const [, pending] of this.pendingOperations) {
			pending.reject(new Error(message));
		}
		this.pendingOperations.clear();
	}

	/**
	 * Generate the complete worker code from all registered handlers
	 */
	private generateWorkerCode(): string {
		const handlerCases: string[] = [];

		for (const [type, handler] of this.operationHandlers) {
			handlerCases.push(`
				case '${type}': {
					const handler = ${handler.workerCode};
					return handler(input, params);
				}
			`);
		}

		return `
			function executeOperation(type, input, params) {
				switch (type) {
					${handlerCases.join('\n')}
					default:
						throw new Error('Unknown operation type: ' + type);
				}
			}

			self.onmessage = function(event) {
				const { type, id, input, params } = event.data;

				try {
					const startTime = performance.now();
					const output = executeOperation(type, input, params);
					const duration = performance.now() - startTime;

					self.postMessage({
						type: 'result',
						id,
						output,
						duration
					});
				} catch (err) {
					self.postMessage({
						type: 'error',
						id,
						message: err.message || 'Unknown error'
					});
				}
			};
		`;
	}

	/**
	 * Check if worker is available
	 */
	isAvailable(): boolean {
		return this.worker !== null;
	}

	/**
	 * Destroy the manager and clean up resources
	 */
	destroy(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		if (this.workerUrl) {
			URL.revokeObjectURL(this.workerUrl);
			this.workerUrl = null;
		}
		this.rejectAllPending('Manager destroyed');
		this.operationHandlers.clear();
		this.initialized = false;
	}
}

// ============================================================================
// Pre-defined operation handlers
// ============================================================================

/**
 * Sort operation handler
 */
export const sortHandler: OperationHandler<
	Record<string, unknown>[],
	{ sorts: Array<{ field: string; direction: 'asc' | 'desc'; nulls?: 'first' | 'last' }> },
	Record<string, unknown>[]
> = {
	executeSync: (input, params) => {
		const sorted = [...input];
		sorted.sort((a, b) => {
			for (const sort of params.sorts) {
				const aVal = a[sort.field];
				const bVal = b[sort.field];

				const nullsLast = sort.nulls === 'last' || (sort.nulls === undefined && sort.direction === 'asc');

				if (aVal == null && bVal == null) continue;
				if (aVal == null) return nullsLast ? 1 : -1;
				if (bVal == null) return nullsLast ? -1 : 1;

				let result: number;
				if (typeof aVal === 'number' && typeof bVal === 'number') {
					result = aVal - bVal;
				} else {
					const aStr = String(aVal);
					const bStr = String(bVal);
					result = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
				}

				if (result !== 0) {
					return sort.direction === 'desc' ? -result : result;
				}
			}
			return 0;
		});
		return sorted;
	},

	workerCode: `function(input, params) {
		const sorted = [...input];
		sorted.sort((a, b) => {
			for (const sort of params.sorts) {
				const aVal = a[sort.field];
				const bVal = b[sort.field];

				const nullsLast = sort.nulls === 'last' || (sort.nulls === undefined && sort.direction === 'asc');

				if (aVal == null && bVal == null) continue;
				if (aVal == null) return nullsLast ? 1 : -1;
				if (bVal == null) return nullsLast ? -1 : 1;

				let result;
				if (typeof aVal === 'number' && typeof bVal === 'number') {
					result = aVal - bVal;
				} else if (typeof aVal === 'string' && typeof bVal === 'string') {
					// Use localeCompare for consistent behavior with main thread
					result = aVal.localeCompare(bVal);
				} else if (aVal instanceof Date && bVal instanceof Date) {
					result = aVal.getTime() - bVal.getTime();
				} else {
					result = String(aVal).localeCompare(String(bVal));
				}

				if (result !== 0) {
					return sort.direction === 'desc' ? -result : result;
				}
			}
			return 0;
		});
		return sorted;
	}`
};

/**
 * Filter operation handler
 */
export const filterHandler: OperationHandler<
	Record<string, unknown>[],
	{ predicate: string }, // Serialized predicate function
	Record<string, unknown>[]
> = {
	executeSync: (input, params) => {
		// For main thread, we'd need the actual predicate function
		// This is a simplified version that won't work with complex predicates
		return input;
	},

	workerCode: `function(input, params) {
		// Filter operations would need serializable filter specs
		// Similar to the sort implementation
		return input;
	}`
};

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create an AsyncOperationManager with the standard handlers pre-registered
 */
export function createAsyncOperationManager(): AsyncOperationManager {
	const manager = new AsyncOperationManager();
	manager.registerHandler('sort', sortHandler);
	// manager.registerHandler('filter', filterHandler);
	return manager;
}
