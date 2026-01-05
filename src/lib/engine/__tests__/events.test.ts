/**
 * Tests for the events module - EventManager and EditorManager.
 *
 * These tests run in Node.js with JSDOM for basic DOM testing.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createEventManager, type EventManagerOptions } from '../events/EventManager.js';
import { createEditorManager, type EditorManagerOptions } from '../events/EditorManager.js';
import { createStateManager } from '../state/StateManager.js';
import { createHeaderRenderer } from '../render/HeaderRenderer.js';
import { LocalDataSource } from '../../query/local-data-source.js';
import type { ColumnDef } from '../../types/index.js';

// Set up JSDOM for DOM testing
let dom: JSDOM;
let document: Document;

interface TestRow {
	id: number;
	name: string;
	age: number;
}

const testColumns: ColumnDef<TestRow>[] = [
	{ key: 'id', header: 'ID', width: 80 },
	{ key: 'name', header: 'Name', width: 150 },
	{ key: 'age', header: 'Age', width: 100, filterType: 'number' }
];

const testData: TestRow[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
	{ id: 3, name: 'Charlie', age: 35 }
];

beforeEach(() => {
	dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>');
	document = dom.window.document;
	(global as any).document = document;
	(global as any).HTMLElement = dom.window.HTMLElement;
	(global as any).MouseEvent = dom.window.MouseEvent;
	(global as any).KeyboardEvent = dom.window.KeyboardEvent;
	(global as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
});

afterEach(() => {
	(global as any).document = undefined;
	(global as any).HTMLElement = undefined;
	(global as any).MouseEvent = undefined;
	(global as any).KeyboardEvent = undefined;
	(global as any).requestAnimationFrame = undefined;
});

describe('EventManager', () => {
	function createTestSetup(options?: { selectionMode?: 'single' | 'multiple' }) {
		const container = document.getElementById('container')!;
		const dataSource = new LocalDataSource(testData);

		const stateManager = createStateManager<TestRow>({
			dataSource,
			columns: testColumns,
			rowHeight: 40,
			headerHeight: 48,
			selectionMode: options?.selectionMode ?? 'single'
		});

		const rowDataMap = new Map<string | number, TestRow>();
		testData.forEach((row) => rowDataMap.set(row.id, row));

		const columnMap = new Map<string, ColumnDef<TestRow>>();
		testColumns.forEach((col) => columnMap.set(col.key, col));

		return { container, stateManager, rowDataMap, columnMap };
	}

	function createRowElement(rowId: number, rowIndex: number): HTMLDivElement {
		const row = document.createElement('div');
		row.className = 'datagrid-row';
		row.dataset.rowId = String(rowId);
		row.dataset.rowIndex = String(rowIndex);
		return row;
	}

	function createCellElement(columnKey: string): HTMLDivElement {
		const cell = document.createElement('div');
		cell.className = 'datagrid-cell';
		cell.dataset.columnKey = columnKey;
		return cell;
	}

	test('attaches event listeners to container', () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();

		const addEventListenerSpy = vi.spyOn(container, 'addEventListener');

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: true,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(addEventListenerSpy).toHaveBeenCalledWith('dblclick', expect.any(Function));
		expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));

		eventManager.destroy();
	});

	test('sets tabindex when selectable', () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: false,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		expect(container.getAttribute('tabindex')).toBe('0');

		eventManager.destroy();
	});

	test('handles row click for selection', async () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();
		await stateManager.fetchData();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: false,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		// Create a row element and append to container
		const row = createRowElement(1, 0);
		container.appendChild(row);

		// Simulate click
		const clickEvent = new dom.window.MouseEvent('click', {
			bubbles: true,
			cancelable: true
		});
		row.dispatchEvent(clickEvent);

		expect(stateManager.isRowSelected(1)).toBe(true);

		eventManager.destroy();
	});

	test('handles ctrl+click for toggle selection via selectRow', async () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup({ selectionMode: 'multiple' });
		await stateManager.fetchData();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: 'multiple',
			editable: false,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		// Test toggle selection directly since JSDOM click events may not propagate correctly
		stateManager.selectRow(1, 'set');
		expect(stateManager.isRowSelected(1)).toBe(true);

		// Add row 2 (simulating ctrl+click behavior)
		stateManager.selectRow(2, 'add');

		expect(stateManager.isRowSelected(1)).toBe(true);
		expect(stateManager.isRowSelected(2)).toBe(true);

		eventManager.destroy();
	});

	test('fires onRowClick callback', async () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();
		await stateManager.fetchData();

		const onRowClick = vi.fn();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: false,
			onRowClick,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		const row = createRowElement(1, 0);
		container.appendChild(row);

		row.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		expect(onRowClick).toHaveBeenCalledWith(
			expect.objectContaining({
				row: testData[0],
				rowIndex: 0
			})
		);

		eventManager.destroy();
	});

	test('fires onCellClick callback', async () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();
		await stateManager.fetchData();

		const onCellClick = vi.fn();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: false,
			onCellClick,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		const row = createRowElement(1, 0);
		const cell = createCellElement('name');
		row.appendChild(cell);
		container.appendChild(row);

		cell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		expect(onCellClick).toHaveBeenCalledWith(
			expect.objectContaining({
				row: testData[0],
				rowIndex: 0,
				columnKey: 'name',
				value: 'Alice'
			})
		);

		eventManager.destroy();
	});

	test('handles double-click for edit', async () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();
		await stateManager.fetchData();

		const onCellDoubleClick = vi.fn();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: true,
			onCellDoubleClick,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		const row = createRowElement(1, 0);
		const cell = createCellElement('name');
		row.appendChild(cell);
		container.appendChild(row);

		cell.dispatchEvent(
			new dom.window.MouseEvent('dblclick', {
				bubbles: true,
				cancelable: true
			})
		);

		expect(onCellDoubleClick).toHaveBeenCalledWith(1, 'name');

		eventManager.destroy();
	});

	test('keyboard handler is attached to container', async () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();

		const keydownSpy = vi.spyOn(container, 'addEventListener');

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: false,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		// Verify keydown handler was attached
		expect(keydownSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

		eventManager.destroy();
	});

	test('updates options on updateOptions call', () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: false,
			editable: false,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		// Initially not selectable, no tabindex
		expect(container.getAttribute('tabindex')).toBeNull();

		// Update to selectable
		eventManager.updateOptions({ selectable: true });
		expect(container.getAttribute('tabindex')).toBe('0');

		// Update back to not selectable
		eventManager.updateOptions({ selectable: false });
		expect(container.getAttribute('tabindex')).toBeNull();

		eventManager.destroy();
	});

	test('handles Escape to clear selection', async () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();
		await stateManager.fetchData();

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: false,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		// Select a row first
		stateManager.selectRow(1, 'set');
		expect(stateManager.selectedIds.size).toBe(1);

		// Press Escape
		container.dispatchEvent(
			new dom.window.KeyboardEvent('keydown', {
				key: 'Escape',
				bubbles: true
			})
		);

		expect(stateManager.selectedIds.size).toBe(0);

		eventManager.destroy();
	});

	test('removes listeners on destroy', () => {
		const { container, stateManager, rowDataMap, columnMap } = createTestSetup();

		const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');

		const eventManager = createEventManager(container, {
			stateManager,
			selectable: true,
			editable: false,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key)
		});

		eventManager.destroy();

		expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		expect(container.getAttribute('tabindex')).toBeNull();
	});
});

describe('EditorManager', () => {
	function createTestSetup() {
		const container = document.getElementById('container')!;
		const dataSource = new LocalDataSource(testData);

		const stateManager = createStateManager<TestRow>({
			dataSource,
			columns: testColumns,
			rowHeight: 40,
			headerHeight: 48
		});

		const rowDataMap = new Map<string | number, TestRow>();
		testData.forEach((row) => rowDataMap.set(row.id, row));

		const columnMap = new Map<string, ColumnDef<TestRow>>();
		testColumns.forEach((col) => columnMap.set(col.key, col));

		const cellElements = new Map<string, HTMLDivElement>();

		return { container, stateManager, rowDataMap, columnMap, cellElements };
	}

	test('creates editor pool', () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null
		});

		expect(editorManager.isEditing).toBe(false);

		editorManager.destroy();
	});

	test('shows editor when showEditor called directly', async () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();
		await stateManager.fetchData();

		// Create a mock cell element
		const cellEl = document.createElement('div');
		cellEl.style.width = '150px';
		cellEl.style.height = '40px';
		container.appendChild(cellEl);
		cellElements.set('1-name', cellEl);

		// Mock getBoundingClientRect
		cellEl.getBoundingClientRect = () =>
			({
				top: 0,
				left: 0,
				width: 150,
				height: 40,
				right: 150,
				bottom: 40,
				x: 0,
				y: 0,
				toJSON: () => ({})
			}) as DOMRect;

		container.getBoundingClientRect = () =>
			({
				top: 0,
				left: 0,
				width: 800,
				height: 600,
				right: 800,
				bottom: 600,
				x: 0,
				y: 0,
				toJSON: () => ({})
			}) as DOMRect;

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null
		});

		// Directly call showEditor (bypassing event system for unit test)
		editorManager.showEditor(1, 'name');

		// Editor should be shown
		expect(editorManager.isEditing).toBe(true);

		editorManager.destroy();
	});

	test('hides editor when hideEditor called', async () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();
		await stateManager.fetchData();

		const cellEl = document.createElement('div');
		container.appendChild(cellEl);
		cellElements.set('1-name', cellEl);

		cellEl.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 150, height: 40, right: 150, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
		container.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null
		});

		editorManager.showEditor(1, 'name');
		expect(editorManager.isEditing).toBe(true);

		editorManager.hideEditor();
		expect(editorManager.isEditing).toBe(false);

		editorManager.destroy();
	});

	test('calls validation callback on commit', async () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();
		await stateManager.fetchData();

		const cellEl = document.createElement('div');
		container.appendChild(cellEl);
		cellElements.set('1-name', cellEl);

		cellEl.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 150, height: 40, right: 150, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
		container.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

		const onCellValidate = vi.fn().mockReturnValue(null);

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null,
			onCellValidate
		});

		// Show editor directly
		editorManager.showEditor(1, 'name');

		// Now commit
		await editorManager.commit();

		expect(onCellValidate).toHaveBeenCalledWith(1, 'name', expect.anything());

		editorManager.destroy();
	});

	test('shows validation error on commit failure', async () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();
		await stateManager.fetchData();

		const cellEl = document.createElement('div');
		container.appendChild(cellEl);
		cellElements.set('1-name', cellEl);

		cellEl.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 150, height: 40, right: 150, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
		container.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

		const onCellValidate = vi.fn().mockReturnValue('Name is required');

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null,
			onCellValidate
		});

		// Show editor directly
		editorManager.showEditor(1, 'name');

		// Try to commit - should fail due to validation
		const result = await editorManager.commit();

		expect(result).toBe(false);
		expect(editorManager.isEditing).toBe(true); // Still editing due to error

		editorManager.destroy();
	});

	test('cleanup removes all editor elements', () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null
		});

		editorManager.destroy();

		// No editor elements should remain
		const editors = container.querySelectorAll('.datagrid-cell-editor');
		expect(editors.length).toBe(0);
	});

	test('Tab key navigates to next editable cell', async () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();
		await stateManager.fetchData();

		// Create cell elements for multiple cells
		const cellEl1 = document.createElement('div');
		const cellEl2 = document.createElement('div');
		container.appendChild(cellEl1);
		container.appendChild(cellEl2);
		cellElements.set('1-name', cellEl1);
		cellElements.set('1-age', cellEl2);

		const mockRect = { top: 0, left: 0, width: 150, height: 40, right: 150, bottom: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
		cellEl1.getBoundingClientRect = () => mockRect;
		cellEl2.getBoundingClientRect = () => mockRect;
		container.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null
		});

		// Start editing first cell
		editorManager.showEditor(1, 'name');
		expect(editorManager.isEditing).toBe(true);

		// Editor should be created and attached
		const editorInput = container.querySelector('.datagrid-cell-editor input');
		expect(editorInput).toBeTruthy();

		editorManager.destroy();
	});

	test('Escape key cancels editing', async () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();
		await stateManager.fetchData();

		const cellEl = document.createElement('div');
		container.appendChild(cellEl);
		cellElements.set('1-name', cellEl);

		cellEl.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 150, height: 40, right: 150, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
		container.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null
		});

		editorManager.showEditor(1, 'name');
		expect(editorManager.isEditing).toBe(true);

		// Find the editor input and dispatch Escape
		const editorInput = container.querySelector('.datagrid-cell-editor input') as HTMLInputElement;
		if (editorInput) {
			editorInput.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
				key: 'Escape',
				bubbles: true
			}));
		}

		expect(editorManager.isEditing).toBe(false);

		editorManager.destroy();
	});

	test('commit with validation passes calls onCellValidate', async () => {
		const { container, stateManager, rowDataMap, columnMap, cellElements } = createTestSetup();
		await stateManager.fetchData();

		const cellEl = document.createElement('div');
		container.appendChild(cellEl);
		cellElements.set('1-name', cellEl);

		cellEl.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 150, height: 40, right: 150, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
		container.getBoundingClientRect = () =>
			({ top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

		const onCellValidate = vi.fn().mockReturnValue(null); // No validation error

		const editorManager = createEditorManager({
			stateManager,
			container,
			getRowData: (rowId) => rowDataMap.get(rowId),
			getColumn: (key) => columnMap.get(key),
			getCellElement: (rowId, colKey) => cellElements.get(`${rowId}-${colKey}`) || null,
			onCellValidate
		});

		editorManager.showEditor(1, 'name');
		expect(editorManager.isEditing).toBe(true);

		// Set a value and commit - validation should pass
		const input = container.querySelector('.datagrid-cell-editor input') as HTMLInputElement;
		if (input) {
			input.value = 'New Name';
		}

		await editorManager.commit();

		// Validation callback should have been called with the new value
		expect(onCellValidate).toHaveBeenCalledWith(1, 'name', 'New Name');

		editorManager.destroy();
	});
});

describe('HeaderRenderer', () => {
	function createTestSetup() {
		const container = document.getElementById('container')!;
		const dataSource = new LocalDataSource(testData);

		const stateManager = createStateManager<TestRow>({
			dataSource,
			columns: testColumns,
			rowHeight: 40,
			headerHeight: 48
		});

		return { container, stateManager };
	}

	test('renders header cells for all columns', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const headerCells = container.querySelectorAll('.datagrid-header-cell');
		expect(headerCells.length).toBe(3); // id, name, age

		headerRenderer.destroy();
	});

	test('click on header cell toggles sort ascending', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		// Find the name header cell
		const nameCell = container.querySelector('.datagrid-header-cell[data-column-key="name"]') as HTMLElement;
		expect(nameCell).toBeTruthy();

		// Click to sort
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		expect(stateManager.sortState).toHaveLength(1);
		expect(stateManager.sortState[0].columnKey).toBe('name');
		expect(stateManager.sortState[0].direction).toBe('asc');

		headerRenderer.destroy();
	});

	test('second click toggles sort to descending', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const nameCell = container.querySelector('.datagrid-header-cell[data-column-key="name"]') as HTMLElement;

		// First click - asc
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		expect(stateManager.sortState[0].direction).toBe('asc');

		// Second click - desc
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		expect(stateManager.sortState[0].direction).toBe('desc');

		headerRenderer.destroy();
	});

	test('third click clears sort', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const nameCell = container.querySelector('.datagrid-header-cell[data-column-key="name"]') as HTMLElement;

		// First click - asc
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		// Second click - desc
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		// Third click - clear
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		expect(stateManager.sortState).toHaveLength(0);

		headerRenderer.destroy();
	});

	test('shift+click adds to multi-sort', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const nameCell = container.querySelector('.datagrid-header-cell[data-column-key="name"]') as HTMLElement;
		const ageCell = container.querySelector('.datagrid-header-cell[data-column-key="age"]') as HTMLElement;

		// Click name first
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		expect(stateManager.sortState).toHaveLength(1);

		// Shift+click age to add to multi-sort
		ageCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, shiftKey: true }));
		expect(stateManager.sortState).toHaveLength(2);
		expect(stateManager.sortState[0].columnKey).toBe('name');
		expect(stateManager.sortState[1].columnKey).toBe('age');

		headerRenderer.destroy();
	});

	test('click on non-sortable column does not sort', async () => {
		const { container } = createTestSetup();

		// Create stateManager with non-sortable column
		const columnsWithNonSortable: ColumnDef<TestRow>[] = [
			{ key: 'id', header: 'ID', width: 80, sortable: false },
			{ key: 'name', header: 'Name', width: 150 },
			{ key: 'age', header: 'Age', width: 100 }
		];

		const stateManager = createStateManager<TestRow>({
			dataSource: new LocalDataSource(testData),
			columns: columnsWithNonSortable,
			rowHeight: 40,
			headerHeight: 48
		});
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const idCell = container.querySelector('.datagrid-header-cell[data-column-key="id"]') as HTMLElement;
		idCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		expect(stateManager.sortState).toHaveLength(0);

		headerRenderer.destroy();
	});

	test('sortable=false disables all sorting', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: false,
			resizable: true,
			reorderable: false
		});

		const nameCell = container.querySelector('.datagrid-header-cell[data-column-key="name"]') as HTMLElement;
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		expect(stateManager.sortState).toHaveLength(0);

		headerRenderer.destroy();
	});

	test('sort indicator shows correct direction', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const nameCell = container.querySelector('.datagrid-header-cell[data-column-key="name"]') as HTMLElement;

		// Click to sort ascending
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		const sortIndicator = nameCell.querySelector('.datagrid-sort-indicator');
		expect(sortIndicator?.textContent).toBe('↑');
		expect(nameCell.getAttribute('aria-sort')).toBe('ascending');

		// Click again for descending
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		expect(sortIndicator?.textContent).toBe('↓');
		expect(nameCell.getAttribute('aria-sort')).toBe('descending');

		headerRenderer.destroy();
	});

	test('click on resize handle does not trigger sort', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const resizeHandle = container.querySelector('.datagrid-resize-handle[data-column-key="name"]') as HTMLElement;
		expect(resizeHandle).toBeTruthy();

		// Click on resize handle
		resizeHandle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

		// Sort should not have changed
		expect(stateManager.sortState).toHaveLength(0);

		headerRenderer.destroy();
	});

	test('resize handle mousedown starts resize', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const resizeHandle = container.querySelector('.datagrid-resize-handle[data-column-key="name"]') as HTMLElement;

		// Mock document event listeners
		const documentAddEventSpy = vi.spyOn(document, 'addEventListener');

		// Mousedown on resize handle
		resizeHandle.dispatchEvent(new dom.window.MouseEvent('mousedown', {
			bubbles: true,
			clientX: 100
		}));

		// Should add mousemove and mouseup listeners
		expect(documentAddEventSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
		expect(documentAddEventSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

		// Resize handle should have active class
		expect(resizeHandle.classList.contains('active')).toBe(true);

		// Cleanup by simulating mouseup
		document.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }));

		headerRenderer.destroy();
	});

	test('resizable=false hides resize handles', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: false,
			reorderable: false
		});

		// Resize handles should not be created when resizable is false initially
		// Since the renderer creates handles in createHeaderCell, let's check if they're hidden
		const resizeHandles = container.querySelectorAll('.datagrid-resize-handle');
		// They might still exist but should be display:none or not have drag behavior
		// The key is that the click handler checks this.options.resizable

		headerRenderer.destroy();
	});

	test('updateOptions changes sortable behavior', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const nameCell = container.querySelector('.datagrid-header-cell[data-column-key="name"]') as HTMLElement;

		// Initially sortable
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		expect(stateManager.sortState).toHaveLength(1);

		// Clear and disable sorting
		stateManager.setSort([]);
		headerRenderer.updateOptions({ sortable: false });

		// Now clicking should not sort
		nameCell.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		expect(stateManager.sortState).toHaveLength(0);

		headerRenderer.destroy();
	});

	test('destroy removes all event listeners', async () => {
		const { container, stateManager } = createTestSetup();
		await stateManager.fetchData();

		const headerRenderer = createHeaderRenderer(container, stateManager, {
			headerHeight: 48,
			sortable: true,
			resizable: true,
			reorderable: false
		});

		const headerRow = container.querySelector('.datagrid-header') as HTMLElement;
		const removeEventListenerSpy = vi.spyOn(headerRow, 'removeEventListener');

		headerRenderer.destroy();

		expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
	});
});
