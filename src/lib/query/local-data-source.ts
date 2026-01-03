/**
 * LocalDataSource - In-memory implementation of the DataSource interface
 *
 * This allows the grid to work without a query engine for:
 * - Small datasets (< 10K rows)
 * - Offline/demo mode
 * - Testing
 * - Static data
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
 * In-memory data source that executes queries locally.
 * Implements the full DataSource interface without needing a backend.
 */
export class LocalDataSource<TRow extends Record<string, unknown>>
	implements MutableDataSource<TRow>
{
	readonly name = 'LocalDataSource';

	readonly capabilities: DataSourceCapabilities = {
		pagination: {
			offset: true,
			cursor: false, // Cursor doesn't make sense for in-memory
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
			enabled: false // TODO: Implement local grouping
		},
		search: {
			enabled: true,
			fullText: false
		},
		rowCount: true,
		cancellation: true,
		streaming: false
	};

	private data: TRow[];
	private readonly idField: keyof TRow;
	private readonly customComparator?: (a: TRow, b: TRow, sort: SortSpec) => number;
	private readonly customFilterFn?: (row: TRow, filter: FilterExpression) => boolean;
	private subscribers: Set<(event: DataChangeEvent<TRow>) => void> = new Set();

	constructor(options: LocalDataSourceOptions<TRow>) {
		this.data = [...options.data];
		this.idField = options.idField ?? ('id' as keyof TRow);
		this.customComparator = options.comparator;
		this.customFilterFn = options.filterFn;
	}

	/**
	 * Update the underlying data.
	 * Useful for reactive updates from Svelte stores.
	 */
	setData(data: TRow[]): void {
		this.data = [...data];
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
			// Check for cancellation
			if (signal?.aborted) {
				return {
					success: false,
					error: { code: 'CANCELLED', message: 'Request cancelled' }
				};
			}

			let rows = [...this.data];

			// Apply search
			if (request.search?.query) {
				rows = this.applySearch(rows, request.search.query, request.search.fields);
			}

			// Apply filter
			if (request.filter) {
				rows = this.applyFilter(rows, request.filter);
			}

			// Get total count before pagination
			const rowCount = rows.length;

			// Apply sort
			if (request.sort && request.sort.length > 0) {
				rows = this.applySort(rows, request.sort);
			}

			// Apply pagination
			rows = this.applyPagination(rows, request.pagination);

			// Apply projection
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
			let rows = this.data;

			if (filter) {
				rows = this.applyFilter(rows, filter);
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
						const index = this.data.findIndex(
							(row) => row[this.idField] === mutation.rowId
						);
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
						const deleteIndex = this.data.findIndex(
							(row) => row[this.idField] === mutation.rowId
						);
						if (deleteIndex === -1) {
							throw new Error(`Row not found: ${mutation.rowId}`);
						}
						this.data.splice(deleteIndex, 1);
						affectedIds.push(mutation.rowId);
						break;
					}
				}
			}

			// Notify subscribers of changes
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
	}

	// =========================================================================
	// Private implementation methods
	// =========================================================================

	private notifySubscribers(event: DataChangeEvent<TRow>): void {
		for (const callback of this.subscribers) {
			callback(event);
		}
	}

	private applySearch(rows: TRow[], query: string, fields?: string[]): TRow[] {
		const lowerQuery = query.toLowerCase();
		const searchFields = fields ?? Object.keys(rows[0] ?? {});

		return rows.filter((row) =>
			searchFields.some((field) => {
				const value = row[field];
				if (value == null) return false;
				return String(value).toLowerCase().includes(lowerQuery);
			})
		);
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

		// Normalize strings for comparison
		const normalizeString = (v: unknown): string => {
			const str = String(v ?? '');
			return ignoreCase ? str.toLowerCase() : str;
		};

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

			case 'contains':
				return normalizeString(value).includes(normalizeString(target));

			case 'notContains':
				return !normalizeString(value).includes(normalizeString(target));

			case 'startsWith':
				return normalizeString(value).startsWith(normalizeString(target));

			case 'endsWith':
				return normalizeString(value).endsWith(normalizeString(target));

			case 'matches': {
				const regex = new RegExp(String(target), ignoreCase ? 'i' : '');
				return regex.test(String(value ?? ''));
			}

			default:
				return true;
		}
	}

	private evaluateGroup(row: TRow, group: FilterGroup): boolean {
		switch (group.operator) {
			case 'and':
				return group.conditions.every((c) => this.evaluateFilter(row, c));

			case 'or':
				return group.conditions.some((c) => this.evaluateFilter(row, c));

			case 'not':
				return !group.conditions.some((c) => this.evaluateFilter(row, c));

			default:
				return true;
		}
	}

	private applySort(rows: TRow[], sorts: SortSpec[]): TRow[] {
		return [...rows].sort((a, b) => {
			for (const sort of sorts) {
				let result: number;

				if (this.customComparator) {
					result = this.customComparator(a, b, sort);
				} else {
					result = this.defaultCompare(a, b, sort);
				}

				if (result !== 0) {
					return result;
				}
			}
			return 0;
		});
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

		if (typeof aVal === 'string' && typeof bVal === 'string') {
			result = aVal.localeCompare(bVal);
		} else if (typeof aVal === 'number' && typeof bVal === 'number') {
			result = aVal - bVal;
		} else if (aVal instanceof Date && bVal instanceof Date) {
			result = aVal.getTime() - bVal.getTime();
		} else {
			result = String(aVal).localeCompare(String(bVal));
		}

		return sort.direction === 'desc' ? -result : result;
	}

	private applyPagination(
		rows: TRow[],
		pagination: GridQueryRequest['pagination']
	): TRow[] {
		switch (pagination.type) {
			case 'offset':
				return rows.slice(pagination.offset, pagination.offset + pagination.limit);

			case 'range':
				return rows.slice(pagination.startRow, pagination.endRow);

			case 'cursor':
				// Cursor pagination doesn't make sense for in-memory
				// Fall back to offset-like behavior
				return rows.slice(0, pagination.limit);

			default:
				return rows;
		}
	}

	private applyProjection(rows: TRow[], fields: string[]): TRow[] {
		return rows.map((row) => {
			const projected: Record<string, unknown> = {};
			for (const field of fields) {
				projected[field] = row[field];
			}
			return projected as TRow;
		});
	}

	private getDistinctValuesSync(field: string, rows?: TRow[]): unknown[] {
		const source = rows ?? this.data;
		const uniqueValues = new Set<unknown>();

		for (const row of source) {
			const value = row[field];
			if (value != null) {
				uniqueValues.add(value);
			}
		}

		return Array.from(uniqueValues).sort((a, b) => {
			if (typeof a === 'string' && typeof b === 'string') {
				return a.localeCompare(b);
			}
			return String(a).localeCompare(String(b));
		});
	}
}

/**
 * Create a LocalDataSource from an array.
 * Convenience function for simple use cases.
 */
export function createLocalDataSource<TRow extends Record<string, unknown>>(
	data: TRow[],
	idField?: keyof TRow
): LocalDataSource<TRow> {
	return new LocalDataSource({ data, idField });
}
