/**
 * Virtual item representing a row in the virtual list.
 */
export interface VirtualItem {
	/** Index in the source data array */
	index: number;
	/** Pixel offset from the top of the scroll container */
	start: number;
	/** End position (start + size) */
	end: number;
	/** Height of this item in pixels */
	size: number;
	/** Unique key for this item */
	key: string | number;
}

/**
 * Configuration options for the virtualizer.
 */
export interface VirtualizerOptions {
	/** Total number of items */
	count: number;
	/** Item height (fixed) or function to get height by index */
	itemSize: number | ((index: number) => number);
	/** Number of items to render outside the visible area */
	overscan?: number;
	/** Padding at the start of the list */
	paddingStart?: number;
	/** Padding at the end of the list */
	paddingEnd?: number;
	/** Custom key getter for items */
	getItemKey?: (index: number) => string | number;
}

/**
 * Result of virtualization calculations.
 */
export interface VirtualizerResult {
	/** Total height of all items in pixels */
	totalSize: number;
	/** Virtual items that should be rendered */
	virtualItems: VirtualItem[];
	/** Start index of rendered items (including overscan) */
	startIndex: number;
	/** End index of rendered items (including overscan) */
	endIndex: number;
}

/**
 * Creates a virtualizer for efficient rendering of large lists.
 * Calculates which items should be rendered based on scroll position.
 */
export function createVirtualizer(options: VirtualizerOptions) {
	const { count, itemSize, overscan = 5, paddingStart = 0, paddingEnd = 0, getItemKey = (i) => i } = options;

	const isFixedSize = typeof itemSize === 'number';
	const getItemSize = isFixedSize ? () => itemSize as number : (itemSize as (index: number) => number);

	/**
	 * Calculate total size of all items.
	 * For fixed-size items, this is O(1). For variable-size, O(n).
	 */
	function getTotalSize(): number {
		if (isFixedSize) {
			return paddingStart + count * (itemSize as number) + paddingEnd;
		}

		let total = paddingStart + paddingEnd;
		for (let i = 0; i < count; i++) {
			total += getItemSize(i);
		}
		return total;
	}

	/**
	 * Calculate which items should be rendered given the current scroll position.
	 * @param scrollOffset - Current scroll position in pixels
	 * @param containerSize - Height of the visible container
	 */
	function getVirtualItems(scrollOffset: number, containerSize: number): VirtualizerResult {
		if (count === 0) {
			return {
				totalSize: paddingStart + paddingEnd,
				virtualItems: [],
				startIndex: 0,
				endIndex: 0
			};
		}

		const items: VirtualItem[] = [];

		// For fixed-size items, use fast O(1) calculation
		if (isFixedSize) {
			const size = itemSize as number;
			const totalSize = paddingStart + count * size + paddingEnd;

			// Calculate visible range
			const startIndex = Math.max(0, Math.floor((scrollOffset - paddingStart) / size) - overscan);
			const endIndex = Math.min(count - 1, Math.ceil((scrollOffset + containerSize - paddingStart) / size) + overscan);

			// Generate virtual items
			for (let i = startIndex; i <= endIndex; i++) {
				const start = paddingStart + i * size;
				items.push({
					index: i,
					start,
					end: start + size,
					size,
					key: getItemKey(i)
				});
			}

			return { totalSize, virtualItems: items, startIndex, endIndex };
		}

		// For variable-size items, iterate to find visible range
		let offset = paddingStart;
		let startIndex = -1;
		let endIndex = -1;

		// Find the range of visible items
		for (let i = 0; i < count; i++) {
			const size = getItemSize(i);
			const itemEnd = offset + size;

			// Found first visible item (with overscan)
			if (startIndex === -1 && itemEnd > scrollOffset) {
				startIndex = Math.max(0, i - overscan);
			}

			// Still within visible area (with overscan)
			if (startIndex !== -1 && offset < scrollOffset + containerSize) {
				endIndex = Math.min(count - 1, i + overscan);
			}

			offset = itemEnd;
		}

		if (startIndex === -1) {
			return {
				totalSize: offset + paddingEnd,
				virtualItems: [],
				startIndex: 0,
				endIndex: 0
			};
		}

		// Calculate offset for first visible item
		let itemOffset = paddingStart;
		for (let i = 0; i < startIndex; i++) {
			itemOffset += getItemSize(i);
		}

		// Generate virtual items
		for (let i = startIndex; i <= endIndex; i++) {
			const size = getItemSize(i);
			items.push({
				index: i,
				start: itemOffset,
				end: itemOffset + size,
				size,
				key: getItemKey(i)
			});
			itemOffset += size;
		}

		return {
			totalSize: offset + paddingEnd,
			virtualItems: items,
			startIndex,
			endIndex
		};
	}

	/**
	 * Calculate the scroll offset needed to bring an item into view.
	 * @param index - Index of the item to scroll to
	 * @param align - Where to position the item in the viewport
	 * @param containerSize - Height of the visible container
	 */
	function getScrollOffset(index: number, align: 'start' | 'center' | 'end' = 'start', containerSize = 0): number {
		if (index < 0 || index >= count) {
			return 0;
		}

		let offset = paddingStart;

		if (isFixedSize) {
			const size = itemSize as number;
			offset = paddingStart + index * size;

			switch (align) {
				case 'center':
					return Math.max(0, offset - containerSize / 2 + size / 2);
				case 'end':
					return Math.max(0, offset - containerSize + size);
				default:
					return offset;
			}
		}

		// Variable size: calculate by iterating
		for (let i = 0; i < index; i++) {
			offset += getItemSize(i);
		}

		const size = getItemSize(index);

		switch (align) {
			case 'center':
				return Math.max(0, offset - containerSize / 2 + size / 2);
			case 'end':
				return Math.max(0, offset - containerSize + size);
			default:
				return offset;
		}
	}

	/**
	 * Find the item index at a given scroll offset.
	 * @param offset - Scroll offset in pixels
	 */
	function getIndexAtOffset(offset: number): number {
		if (count === 0) return 0;

		const adjustedOffset = offset - paddingStart;

		if (isFixedSize) {
			const size = itemSize as number;
			return Math.max(0, Math.min(count - 1, Math.floor(adjustedOffset / size)));
		}

		let currentOffset = 0;
		for (let i = 0; i < count; i++) {
			const size = getItemSize(i);
			if (currentOffset + size > adjustedOffset) {
				return i;
			}
			currentOffset += size;
		}

		return count - 1;
	}

	return {
		getTotalSize,
		getVirtualItems,
		getScrollOffset,
		getIndexAtOffset
	};
}

export type Virtualizer = ReturnType<typeof createVirtualizer>;
