/**
 * LocalDataSource - High-performance in-memory implementation of the DataSource interface
 *
 * Optimized for datasets up to 10M+ rows:
 * - Zero-copy data storage (references, not clones)
 * - Lazy evaluation with minimal allocations
 * - Cached sorting for repeated queries
 * - Direct array slicing for pagination
 *
 * ## IMPORTANT: Zero-Copy Semantics
 *
 * For maximum performance, LocalDataSource stores your data array by reference,
 * NOT a copy. This has important implications:
 *
 * 1. **Data Ownership**: You and LocalDataSource share the same array.
 *    Mutations you make to the array are visible to LocalDataSource.
 *
 * 2. **Cache Invalidation**: The sort cache is only invalidated when you call
 *    `setData()` or `mutate()`. Direct mutations to objects in the array
 *    will NOT invalidate the cache, potentially returning stale sorted results.
 *
 * 3. **Safe Usage Patterns**:
 *    - Use `mutate()` for all data modifications (insert/update/delete)
 *    - Use `setData()` to replace the entire dataset
 *    - If you must mutate objects directly, call `setData(data)` afterward
 *      to invalidate the cache
 *
 * 4. **Test Isolation**: When writing tests, pass a fresh copy of your data
 *    to each test: `createLocalDataSource([...testData], 'id')`
 *
 * Example:
 * ```typescript
 * const data = generateData(1000000);
 * const ds = createLocalDataSource(data, 'id'); // Zero-copy, data is shared
 *
 * // GOOD: Use mutate() for changes
 * await ds.mutate([{ type: 'update', rowId: 1, data: { name: 'New' } }]);
 *
 * // BAD: Direct mutation doesn't invalidate cache
 * data[0].name = 'Changed'; // Cache may return stale sort order!
 *
 * // If you must mutate directly, invalidate cache:
 * data[0].name = 'Changed';
 * ds.setData(data); // Re-set to invalidate cache
 * ```
 */

import type {
	DataSource,
	DataSourceCapabilities,
	DataSourceResult,
	FilterCondition,
	FilterExpression,
	FilterGroup,
	GridQueryRequest,
	GridQueryResponse,
	SortSpec,
	DataChangeEvent,
	MutableDataSource,
	RowMutation
} from './types.js';

/** Options for LocalDataSource */
export interface LocalDataSourceOptions<TRow> {
	/** Initial data */
	data: TRow[];

	/** Field to use as row ID (default: 'id') */
	idField?: keyof TRow;

	/** Custom comparator for sorting */
	comparator?: (a: TRow, b: TRow, sort: SortSpec) => number;

	/** Custom filter function */
	filterFn?: (row: TRow, filter: FilterExpression) => boolean;
}

/**
 * High-performance in-memory data source.
 * Optimized for large datasets (10M+ rows) with:
 * - Zero-copy storage
 * - Cached sort results
 * - Minimal allocations during queries
 */
export class LocalDataSource<TRow extends Record<string, unknown>>
	implements MutableDataSource<TRow>
{
	readonly name = 'LocalDataSource';

	readonly capabilities: DataSourceCapabilities = {
		pagination: {
			offset: true,
			cursor: false,
			range: true
		},
		sort: {
			enabled: true,
			multiColumn: true,
			nullsPosition: true
		},
		filter: {
			enabled: true,
			operators: [
				'eq',
				'neq',
				'gt',
				'gte',
				'lt',
				'lte',
				'in',
				'notIn',
				'between',
				'isNull',
				'isNotNull',
				'contains',
				'notContains',
				'startsWith',
				'endsWith'
			],
			logicalOperators: ['and', 'or', 'not'],
			nestedGroups: true
		},
		grouping: {
			enabled: false
		},
		search: {
			enabled: true,
			fullText: false
		},
		rowCount: true,
		cancellation: true,
		streaming: false
	};

	// Zero-copy: store reference directly
	private data: TRow[];
	private readonly idField: keyof TRow;
	private readonly customComparator?: (a: TRow, b: TRow, sort: SortSpec) => number;
	private readonly customFilterFn?: (row: TRow, filter: FilterExpression) => boolean;
	private subscribers: Set<(event: DataChangeEvent<TRow>) => void> = new Set();

	// Sort cache for repeated queries
	private sortCache: {
		key: string;
		sorted: TRow[];
		sourceLength: number;
	} | null = null;

	constructor(options: LocalDataSourceOptions<TRow>) {
		// Zero-copy: use reference directly (caller owns the data)
		this.data = options.data;
		this.idField = options.idField ?? ('id' as keyof TRow);
		this.customComparator = options.comparator;
		this.customFilterFn = options.filterFn;
	}

	/**
	 * Update the underlying data.
	 * Zero-copy: stores reference directly.
	 */
	setData(data: TRow[]): void {
		this.data = data;
		this.invalidateCache();
		this.notifySubscribers({ type: 'refresh' });
	}

	/**
	 * Get the current data (for debugging/testing).
	 */
	getData(): readonly TRow[] {
		return this.data;
	}

	async getRows(
		request: GridQueryRequest,
		signal?: AbortSignal
	): Promise<DataSourceResult<GridQueryResponse<TRow>>> {
		const startTime = performance.now();

		try {
			if (signal?.aborted) {
				return {
					success: false,
					error: { code: 'CANCELLED', message: 'Request cancelled' }
				};
			}

			// Start with reference to source data (no copy yet)
			let rows: TRow[] = this.data;
			let ownsArray = false; // True when we have our own array (from filter/search)

			// Apply search (creates new array via filter)
			if (request.search?.query) {
				rows = this.applySearch(rows, request.search.query, request.search.fields);
				ownsArray = true; // filter() created a new array we own
			}

			// Apply filter (creates new array via filter)
			if (request.filter) {
				rows = this.applyFilter(rows, request.filter);
				ownsArray = true; // filter() created a new array we own
			}

			// Get total count before pagination
			const rowCount = rows.length;

			// Apply sort (needs a copy since sort mutates in place)
			if (request.sort && request.sort.length > 0) {
				rows = this.applySortCached(rows, request.sort, ownsArray);
			}

			// Apply pagination (slice creates shallow copy of subset only)
			rows = this.applyPagination(rows, request.pagination);

			// Apply projection if requested
			if (request.projection && request.projection.length > 0) {
				rows = this.applyProjection(rows, request.projection);
			}

			// Get distinct values if requested
			let distinctValues: Record<string, unknown[]> | undefined;
			if (request.requires?.distinctValues) {
				distinctValues = {};
				for (const field of request.requires.distinctValues) {
					distinctValues[field] = this.getDistinctValuesSync(field);
				}
			}

			const duration = performance.now() - startTime;

			return {
				success: true,
				data: {
					rows,
					rowCount: request.requires?.rowCount ? rowCount : undefined,
					distinctValues,
					meta: {
						duration,
						cached: false
					}
				}
			};
		} catch (error) {
			return {
				success: false,
				error: {
					code: 'QUERY_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error',
					details: error
				}
			};
		}
	}

	async getDistinctValues(
		field: string,
		filter?: FilterExpression,
		signal?: AbortSignal
	): Promise<DataSourceResult<unknown[]>> {
		if (signal?.aborted) {
			return {
				success: false,
				error: { code: 'CANCELLED', message: 'Request cancelled' }
			};
		}

		try {
			let rows: readonly TRow[] = this.data;

			if (filter) {
				rows = this.applyFilter(rows as TRow[], filter);
			}

			const values = this.getDistinctValuesSync(field, rows);

			return { success: true, data: values };
		} catch (error) {
			return {
				success: false,
				error: {
					code: 'DISTINCT_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error'
				}
			};
		}
	}

	async mutate(
		mutations: RowMutation<TRow>[],
		signal?: AbortSignal
	): Promise<DataSourceResult<(string | number)[]>> {
		if (signal?.aborted) {
			return {
				success: false,
				error: { code: 'CANCELLED', message: 'Request cancelled' }
			};
		}

		try {
			const affectedIds: (string | number)[] = [];

			for (const mutation of mutations) {
				switch (mutation.type) {
					case 'insert': {
						if (!mutation.data) {
							throw new Error('Insert mutation requires data');
						}
						const newRow = mutation.data as TRow;
						const id = newRow[this.idField] as string | number;
						this.data.push(newRow);
						affectedIds.push(id);
						break;
					}

					case 'update': {
						if (mutation.rowId === undefined) {
							throw new Error('Update mutation requires rowId');
						}
						const index = this.findRowIndex(mutation.rowId);
						if (index === -1) {
							throw new Error(`Row not found: ${mutation.rowId}`);
						}
						this.data[index] = { ...this.data[index], ...mutation.data };
						affectedIds.push(mutation.rowId);
						break;
					}

					case 'delete': {
						if (mutation.rowId === undefined) {
							throw new Error('Delete mutation requires rowId');
						}
						const deleteIndex = this.findRowIndex(mutation.rowId);
						if (deleteIndex === -1) {
							throw new Error(`Row not found: ${mutation.rowId}`);
						}
						this.data.splice(deleteIndex, 1);
						affectedIds.push(mutation.rowId);
						break;
					}
				}
			}

			// Invalidate cache and notify
			this.invalidateCache();
			this.notifySubscribers({ type: 'refresh' });

			return { success: true, data: affectedIds };
		} catch (error) {
			return {
				success: false,
				error: {
					code: 'MUTATION_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error'
				}
			};
		}
	}

	subscribe(callback: (event: DataChangeEvent<TRow>) => void): () => void {
		this.subscribers.add(callback);
		return () => this.subscribers.delete(callback);
	}

	destroy(): void {
		this.subscribers.clear();
		this.invalidateCache();
	}

	// =========================================================================
	// Private implementation methods
	// =========================================================================

	private invalidateCache(): void {
		this.sortCache = null;
	}

	private findRowIndex(rowId: string | number): number {
		const idField = this.idField;
		const data = this.data;
		const len = data.length;
		for (let i = 0; i < len; i++) {
			if (data[i][idField] === rowId) {
				return i;
			}
		}
		return -1;
	}

	private notifySubscribers(event: DataChangeEvent<TRow>): void {
		for (const callback of this.subscribers) {
			callback(event);
		}
	}

	private applySearch(rows: TRow[], query: string, fields?: string[]): TRow[] {
		const lowerQuery = query.toLowerCase();
		const searchFields = fields ?? (rows.length > 0 ? Object.keys(rows[0]) : []);

		return rows.filter((row) => {
			for (let i = 0; i < searchFields.length; i++) {
				const value = row[searchFields[i]];
				if (value != null && String(value).toLowerCase().includes(lowerQuery)) {
					return true;
				}
			}
			return false;
		});
	}

	private applyFilter(rows: TRow[], filter: FilterExpression): TRow[] {
		if (this.customFilterFn) {
			return rows.filter((row) => this.customFilterFn!(row, filter));
		}
		return rows.filter((row) => this.evaluateFilter(row, filter));
	}

	private evaluateFilter(row: TRow, filter: FilterExpression): boolean {
		if (filter.type === 'condition') {
			return this.evaluateCondition(row, filter);
		} else {
			return this.evaluateGroup(row, filter);
		}
	}

	private evaluateCondition(row: TRow, condition: FilterCondition): boolean {
		const value = row[condition.field];
		const target = condition.value;
		const ignoreCase = condition.ignoreCase ?? true;

		switch (condition.operator) {
			case 'eq':
				return value === target;

			case 'neq':
				return value !== target;

			case 'gt':
				return (value as number) > (target as number);

			case 'gte':
				return (value as number) >= (target as number);

			case 'lt':
				return (value as number) < (target as number);

			case 'lte':
				return (value as number) <= (target as number);

			case 'in':
				return Array.isArray(target) && target.includes(value);

			case 'notIn':
				return Array.isArray(target) && !target.includes(value);

			case 'between': {
				const [min, max] = target as [number, number];
				const v = value as number;
				return v >= min && v <= max;
			}

			case 'isNull':
				return value == null;

			case 'isNotNull':
				return value != null;

			case 'contains': {
				const valStr = String(value ?? '');
				const targetStr = String(target);
				return ignoreCase
					? valStr.toLowerCase().includes(targetStr.toLowerCase())
					: valStr.includes(targetStr);
			}

			case 'notContains': {
				const valStr = String(value ?? '');
				const targetStr = String(target);
				return ignoreCase
					? !valStr.toLowerCase().includes(targetStr.toLowerCase())
					: !valStr.includes(targetStr);
			}

			case 'startsWith': {
				const valStr = String(value ?? '');
				const targetStr = String(target);
				return ignoreCase
					? valStr.toLowerCase().startsWith(targetStr.toLowerCase())
					: valStr.startsWith(targetStr);
			}

			case 'endsWith': {
				const valStr = String(value ?? '');
				const targetStr = String(target);
				return ignoreCase
					? valStr.toLowerCase().endsWith(targetStr.toLowerCase())
					: valStr.endsWith(targetStr);
			}

			case 'matches': {
				const regex = new RegExp(String(target), ignoreCase ? 'i' : '');
				return regex.test(String(value ?? ''));
			}

			default:
				return true;
		}
	}

	private evaluateGroup(row: TRow, group: FilterGroup): boolean {
		const conditions = group.conditions;
		switch (group.operator) {
			case 'and':
				for (let i = 0; i < conditions.length; i++) {
					if (!this.evaluateFilter(row, conditions[i])) return false;
				}
				return true;

			case 'or':
				for (let i = 0; i < conditions.length; i++) {
					if (this.evaluateFilter(row, conditions[i])) return true;
				}
				return false;

			case 'not':
				for (let i = 0; i < conditions.length; i++) {
					if (this.evaluateFilter(row, conditions[i])) return false;
				}
				return true;

			default:
				return true;
		}
	}

	/**
	 * Apply sort with caching for repeated queries on unchanged data.
	 * Cache is invalidated when data changes via setData() or mutate().
	 *
	 * @param rows - The rows to sort
	 * @param sorts - Sort specifications
	 * @param ownsArray - True if caller owns the array (from filter/search), can sort in place
	 */
	private applySortCached(rows: TRow[], sorts: SortSpec[], ownsArray: boolean): TRow[] {
		const sortKey = this.getSortCacheKey(sorts);
		const isFullDataset = rows === this.data;

		// Check if we can use cached result
		// Only valid if sorting the full dataset (no filters applied) and length matches
		if (
			isFullDataset &&
			this.sortCache &&
			this.sortCache.key === sortKey &&
			this.sortCache.sourceLength === rows.length
		) {
			return this.sortCache.sorted;
		}

		// Need to sort - copy if we don't own the array
		const toSort = ownsArray ? rows : rows.slice();

		// Sort in place (we own this array now)
		this.sortInPlace(toSort, sorts);

		// Cache if this was the full dataset (no filters applied)
		if (isFullDataset) {
			this.sortCache = {
				key: sortKey,
				sorted: toSort,
				sourceLength: rows.length
			};
		}

		return toSort;
	}

	private getSortCacheKey(sorts: SortSpec[]): string {
		// Fast key generation for cache lookup
		let key = '';
		for (let i = 0; i < sorts.length; i++) {
			const s = sorts[i];
			key += s.field + ':' + s.direction + (s.nulls || '') + ';';
		}
		return key;
	}

	private sortInPlace(rows: TRow[], sorts: SortSpec[]): void {
		if (this.customComparator) {
			rows.sort((a, b) => {
				for (let i = 0; i < sorts.length; i++) {
					const result = this.customComparator!(a, b, sorts[i]);
					if (result !== 0) return result;
				}
				return 0;
			});
		} else {
			rows.sort((a, b) => {
				for (let i = 0; i < sorts.length; i++) {
					const result = this.defaultCompare(a, b, sorts[i]);
					if (result !== 0) return result;
				}
				return 0;
			});
		}
	}

	private defaultCompare(a: TRow, b: TRow, sort: SortSpec): number {
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
			result = aVal.localeCompare(bVal);
		} else if (aVal instanceof Date && bVal instanceof Date) {
			result = aVal.getTime() - bVal.getTime();
		} else {
			result = String(aVal).localeCompare(String(bVal));
		}

		return sort.direction === 'desc' ? -result : result;
	}

	private applyPagination(rows: TRow[], pagination: GridQueryRequest['pagination']): TRow[] {
		switch (pagination.type) {
			case 'offset':
				return rows.slice(pagination.offset, pagination.offset + pagination.limit);

			case 'range':
				return rows.slice(pagination.startRow, pagination.endRow);

			case 'cursor':
				return rows.slice(0, pagination.limit);

			default:
				return rows;
		}
	}

	private applyProjection(rows: TRow[], fields: string[]): TRow[] {
		const len = rows.length;
		const result = new Array<TRow>(len);
		for (let i = 0; i < len; i++) {
			const row = rows[i];
			const projected: Record<string, unknown> = {};
			for (let j = 0; j < fields.length; j++) {
				projected[fields[j]] = row[fields[j]];
			}
			result[i] = projected as TRow;
		}
		return result;
	}

	private getDistinctValuesSync(field: string, rows?: readonly TRow[]): unknown[] {
		const source = rows ?? this.data;
		const uniqueValues = new Set<unknown>();
		const len = source.length;

		for (let i = 0; i < len; i++) {
			const value = source[i][field];
			if (value != null) {
				uniqueValues.add(value);
			}
		}

		return Array.from(uniqueValues).sort((a, b) => {
			if (typeof a === 'number' && typeof b === 'number') {
				return a - b;
			}
			if (typeof a === 'string' && typeof b === 'string') {
				return a.localeCompare(b);
			}
			return String(a).localeCompare(String(b));
		});
	}
}

/**
 * Create a LocalDataSource from an array.
 * Zero-copy: stores reference directly for maximum performance.
 */
export function createLocalDataSource<TRow extends Record<string, unknown>>(
	data: TRow[],
	idField?: keyof TRow
): LocalDataSource<TRow> {
	return new LocalDataSource({ data, idField });
}
