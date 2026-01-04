import { test, expect } from '@playwright/test';

test.describe('DataGrid', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('renders the grid with data', async ({ page }) => {
		const grid = page.getByTestId('datagrid');
		await expect(grid).toBeVisible();
	});

	test('displays column headers', async ({ page }) => {
		await expect(page.getByText('ID')).toBeVisible();
		await expect(page.getByText('First Name')).toBeVisible();
		await expect(page.getByText('Last Name')).toBeVisible();
	});

	test('renders rows with data', async ({ page }) => {
		const rows = page.getByTestId('datagrid-row');
		// Should have some visible rows (virtualized)
		await expect(rows.first()).toBeVisible();
	});

	test('shows row count in controls', async ({ page }) => {
		await expect(page.getByText(/Showing.*1,000.*rows/)).toBeVisible();
	});

	test('can change row count', async ({ page }) => {
		const input = page.locator('input[type="number"]');
		await input.fill('500');
		await input.press('Enter');
		await expect(page.getByText(/Showing.*500.*rows/)).toBeVisible();
	});

	test.describe('sorting', () => {
		test('can sort by clicking header', async ({ page }) => {
			const idHeader = page.getByTestId('datagrid-header-cell').filter({ hasText: 'ID' });
			await idHeader.click();

			// Check for sort indicator
			await expect(idHeader.locator('.datagrid-sort-indicator')).toHaveText('↑');
		});

		test('can toggle sort direction', async ({ page }) => {
			const idHeader = page.getByTestId('datagrid-header-cell').filter({ hasText: 'ID' });

			// First click - ascending
			await idHeader.click();
			await expect(idHeader.locator('.datagrid-sort-indicator')).toHaveText('↑');

			// Second click - descending
			await idHeader.click();
			await expect(idHeader.locator('.datagrid-sort-indicator')).toHaveText('↓');

			// Third click - no sort
			await idHeader.click();
			await expect(idHeader.locator('.datagrid-sort-indicator')).not.toBeVisible();
		});
	});

	test.describe('selection', () => {
		test('can select a row by clicking', async ({ page }) => {
			const firstRow = page.getByTestId('datagrid-row').first();
			await firstRow.click();

			await expect(firstRow).toHaveClass(/selected/);
			await expect(page.getByText('1 selected')).toBeVisible();
		});

		test('can select multiple rows with ctrl+click', async ({ page }) => {
			const rows = page.getByTestId('datagrid-row');
			const firstRow = rows.first();
			const secondRow = rows.nth(1);

			await firstRow.click();
			await secondRow.click({ modifiers: ['Control'] });

			await expect(firstRow).toHaveClass(/selected/);
			await expect(secondRow).toHaveClass(/selected/);
			await expect(page.getByText('2 selected')).toBeVisible();
		});

		test('clicking without modifier deselects other rows', async ({ page }) => {
			const rows = page.getByTestId('datagrid-row');
			const firstRow = rows.first();
			const secondRow = rows.nth(1);

			await firstRow.click();
			await secondRow.click({ modifiers: ['Control'] });
			await expect(page.getByText('2 selected')).toBeVisible();

			// Click without ctrl - should select only that row
			const thirdRow = rows.nth(2);
			await thirdRow.click();

			await expect(firstRow).not.toHaveClass(/selected/);
			await expect(secondRow).not.toHaveClass(/selected/);
			await expect(thirdRow).toHaveClass(/selected/);
			await expect(page.getByText('1 selected')).toBeVisible();
		});
	});

	test.describe('column resizing', () => {
		test('can resize columns by dragging', async ({ page }) => {
			const headerCell = page.getByTestId('datagrid-header-cell').filter({ hasText: 'First Name' });
			const resizeHandle = headerCell.locator('.datagrid-resize-handle');

			// Get initial width
			const initialBox = await headerCell.boundingBox();
			const initialWidth = initialBox?.width ?? 0;

			// Drag to resize
			await resizeHandle.hover();
			await page.mouse.down();
			await page.mouse.move(initialBox!.x + initialWidth + 50, initialBox!.y + 20);
			await page.mouse.up();

			// Check new width
			const newBox = await headerCell.boundingBox();
			expect(newBox!.width).toBeGreaterThan(initialWidth);
		});
	});

	test.describe('scrolling', () => {
		test('can scroll through data', async ({ page }) => {
			const body = page.getByTestId('datagrid-body');

			// Scroll down
			await body.evaluate((el) => {
				el.scrollTop = 1000;
			});

			// Wait for virtualization to update
			await page.waitForTimeout(100);

			// Check that different rows are now visible
			const visibleRows = page.getByTestId('datagrid-row');
			const firstVisibleRow = visibleRows.first();
			const rowIndex = await firstVisibleRow.getAttribute('data-row-index');

			// Should not be row 0 after scrolling
			expect(parseInt(rowIndex ?? '0')).toBeGreaterThan(10);
		});
	});

	test.describe('performance', () => {
		test('handles large dataset without lag', async ({ page }) => {
			// Set row count to 100K
			const input = page.locator('input[type="number"]');
			await input.fill('100000');
			await input.press('Enter');

			// Wait for data to load
			await expect(page.getByText(/Showing.*100,000.*rows/)).toBeVisible({ timeout: 10000 });

			// Grid should still be responsive
			const grid = page.getByTestId('datagrid');
			await expect(grid).toBeVisible();

			// Scrolling should work
			const body = page.getByTestId('datagrid-body');
			await body.evaluate((el) => {
				el.scrollTop = 50000;
			});

			// Check virtualization is working - should not have 100K DOM nodes
			const rowCount = await page.getByTestId('datagrid-row').count();
			expect(rowCount).toBeLessThan(100);
		});
	});
});
