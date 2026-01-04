import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ColumnDef } from '../../../types/index.js';

interface TestRow {
	id: number;
	name: string;
	value: number;
}

const mockColumns: ColumnDef<TestRow, any>[] = [
	{ key: 'id', header: 'ID', width: 80 },
	{ key: 'name', header: 'Name', width: 200 },
	{ key: 'value', header: 'Value', width: 120, align: 'right' }
];

const mockData: TestRow[] = Array.from({ length: 100 }, (_, i) => ({
	id: i + 1,
	name: `Item ${i + 1}`,
	value: (i + 1) * 100
}));

/**
 * DataGrid Component Tests
 *
 * NOTE: Component tests are skipped in jsdom because Svelte 5 runes don't work properly
 * in the jsdom environment. Use E2E tests (Playwright) for component testing instead.
 *
 * See e2e/datagrid.spec.ts for component integration tests.
 */
describe('DataGrid', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.skip('component tests require E2E environment (Playwright)', () => {
		// Svelte 5 runes ($state, $derived, $effect) don't work in jsdom
		// Component rendering tests are in e2e/datagrid.spec.ts
		expect(true).toBe(true);
	});

	it('has correct test data shape', () => {
		expect(mockData.length).toBe(100);
		expect(mockData[0]).toEqual({ id: 1, name: 'Item 1', value: 100 });
		expect(mockColumns.length).toBe(3);
		expect(mockColumns.map((c) => c.key)).toEqual(['id', 'name', 'value']);
	});
});
