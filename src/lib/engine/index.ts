/**
 * Grid Engine - Pure TypeScript rendering engine for svelte-datagrid.
 *
 * This module provides a framework-agnostic grid implementation that can be
 * wrapped by any UI framework (Svelte, React, Vue, vanilla JS).
 */

// Core utilities
export { EventEmitter, type EventCallback } from './EventEmitter.js';

// Types
export type {
	EditState,
	VisibleRange,
	StateChangeEvents,
	StateManagerOptions,
	AutoSizeOptions
} from './types.js';

// State management
export { StateManager, createStateManager, isMutableDataSource } from './state/StateManager.js';

// Rendering
export {
	// Pooling
	RowPool,
	createRowPool,
	CellPool,
	createCellPool,
	// Renderers
	BodyRenderer,
	createBodyRenderer,
	HeaderRenderer,
	createHeaderRenderer,
	// Types
	type PooledRow,
	type RowPoolOptions,
	type PooledCell,
	type BodyRendererOptions,
	type CellRenderContext,
	type HeaderRendererOptions
} from './render/index.js';

// Events and Editors
export {
	EventManager,
	createEventManager,
	EditorManager,
	createEditorManager,
	type EventManagerOptions,
	type EditorManagerOptions
} from './events/index.js';

// Main GridEngine (orchestrator)
export { GridEngine, createGridEngine, type GridEngineOptions } from './GridEngine.js';
