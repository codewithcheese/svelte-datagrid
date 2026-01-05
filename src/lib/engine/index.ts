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
