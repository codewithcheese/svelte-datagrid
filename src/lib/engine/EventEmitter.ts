/**
 * Simple typed event emitter for state change notifications.
 * Replaces Svelte's reactive system for the engine.
 */

export type EventCallback<T = unknown> = (data: T) => void;

export class EventEmitter<TEvents extends object = Record<string, unknown>> {
	private listeners = new Map<keyof TEvents, Set<EventCallback<unknown>>>();

	/**
	 * Subscribe to an event
	 */
	on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(callback as EventCallback<unknown>);

		// Return unsubscribe function
		return () => {
			this.off(event, callback);
		};
	}

	/**
	 * Unsubscribe from an event
	 */
	off<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): void {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.delete(callback as EventCallback<unknown>);
		}
	}

	/**
	 * Emit an event to all listeners
	 */
	emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			for (const callback of callbacks) {
				try {
					callback(data);
				} catch (error) {
					console.error(`Error in event listener for "${String(event)}":`, error);
				}
			}
		}
	}

	/**
	 * Subscribe to an event for a single emission
	 */
	once<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): () => void {
		const unsubscribe = this.on(event, (data) => {
			unsubscribe();
			callback(data);
		});
		return unsubscribe;
	}

	/**
	 * Remove all listeners for an event, or all listeners if no event specified
	 */
	removeAllListeners(event?: keyof TEvents): void {
		if (event) {
			this.listeners.delete(event);
		} else {
			this.listeners.clear();
		}
	}

	/**
	 * Get the number of listeners for an event
	 */
	listenerCount(event: keyof TEvents): number {
		return this.listeners.get(event)?.size ?? 0;
	}
}
