/**
 * Visual Regression Tests
 *
 * These tests capture screenshots of critical UI states to detect
 * unintended visual changes. Each test captures a specific state
 * that users would see during normal interaction.
 *
 * Running:
 * - pnpm e2e:visual - Run visual tests against existing baselines
 * - pnpm e2e:visual:update - Update baseline screenshots
 *
 * Baselines are stored per-browser in e2e/__screenshots__/{browser}/
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Wait for grid to fully render
		await page.waitForSelector('[data-testid="datagrid-body"]');
		await page.waitForTimeout(200); // Allow any animations to settle
	});

	test('default grid state', async ({ page }) => {
		const grid = page.getByTestId('datagrid');
		await expect(grid).toHaveScreenshot('grid-default.png');
	});

	test('grid with row selection', async ({ page }) => {
		// Select the first visible row
		const firstRow = page.getByTestId('datagrid-row').first();
		await firstRow.click();
		await expect(firstRow).toHaveClass(/selected/);

		const grid = page.getByTestId('datagrid');
		await expect(grid).toHaveScreenshot('grid-row-selected.png');
	});

	test('grid with multiple selection', async ({ page }) => {
		const rows = page.getByTestId('datagrid-row');

		// Select first row
		await rows.first().click();

		// Ctrl+click to add second and third rows
		await rows.nth(1).click({ modifiers: ['Control'] });
		await rows.nth(2).click({ modifiers: ['Control'] });

		const grid = page.getByTestId('datagrid');
		await expect(grid).toHaveScreenshot('grid-multi-select.png');
	});

	test('grid with sorted column', async ({ page }) => {
		// Click on a header to sort
		const idHeader = page.getByTestId('datagrid-header-cell').filter({ hasText: 'ID' });
		await idHeader.click();

		// Wait for sort to complete
		await expect(idHeader.locator('.datagrid-sort-indicator')).toBeVisible();

		const grid = page.getByTestId('datagrid');
		await expect(grid).toHaveScreenshot('grid-sorted-asc.png');

		// Click again for descending
		await idHeader.click();
		await expect(grid).toHaveScreenshot('grid-sorted-desc.png');
	});

	test('grid after scroll', async ({ page }) => {
		const body = page.getByTestId('datagrid-body');

		// Scroll down significantly
		await body.evaluate((el) => {
			el.scrollTop = 500;
		});

		// Wait for virtualization to update
		await page.waitForTimeout(150);

		const grid = page.getByTestId('datagrid');
		await expect(grid).toHaveScreenshot('grid-scrolled.png');
	});

	test('grid header cells', async ({ page }) => {
		// Capture just the header row for detailed comparison
		const header = page.locator('[data-testid="datagrid-header"]');
		await expect(header).toHaveScreenshot('grid-header.png');
	});

	test('grid with resized column', async ({ page }) => {
		const headerCell = page.getByTestId('datagrid-header-cell').filter({ hasText: 'First Name' });
		const resizeHandle = headerCell.locator('.datagrid-resize-handle');

		// Check if resize handle exists
		if ((await resizeHandle.count()) > 0) {
			const box = await resizeHandle.boundingBox();
			if (box) {
				// Drag to resize
				await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
				await page.mouse.down();
				await page.mouse.move(box.x + 100, box.y + box.height / 2, { steps: 5 });
				await page.mouse.up();

				await page.waitForTimeout(100);
			}
		}

		const grid = page.getByTestId('datagrid');
		await expect(grid).toHaveScreenshot('grid-column-resized.png');
	});
});
