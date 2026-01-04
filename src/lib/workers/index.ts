/**
 * Workers module - Web Workers for non-blocking operations
 *
 * Provides a generalized async operation framework for offloading
 * expensive operations to background threads.
 */

// Generalized async operation framework
export {
	AsyncOperationManager,
	createAsyncOperationManager,
	sortHandler,
	filterHandler,
	generateOperationId,
	type OperationType,
	type OperationRequest,
	type OperationResponse,
	type OperationError,
	type OperationProgress,
	type WorkerMessage,
	type OperationResult,
	type OperationHandler
} from './async-operation-manager.js';

// Sort-specific worker manager (for backwards compatibility)
export {
	SortWorkerManager,
	getSharedSortWorker,
	destroySharedSortWorker,
	type SortResult
} from './sort-worker-manager.js';
