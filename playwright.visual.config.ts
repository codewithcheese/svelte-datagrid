/**
 * Playwright configuration for visual regression tests
 *
 * Visual regression tests capture screenshots of critical UI states
 * and compare them against baseline images to detect unintended
 * visual changes across browsers.
 *
 * Usage:
 * - Run tests: pnpm e2e:visual
 * - Update baselines: pnpm e2e:visual:update
 */

import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: './e2e',
	testMatch: 'visual.spec.ts',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: [
		['html', { outputFolder: 'visual-report' }],
		['json', { outputFile: 'visual-results/results.json' }]
	],
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		// Consistent viewport for visual comparisons
		viewport: { width: 1280, height: 720 }
	},
	// Snapshot configuration
	expect: {
		toHaveScreenshot: {
			// Allow small pixel differences due to anti-aliasing
			maxDiffPixelRatio: 0.01,
			// Animation timeout before screenshot
			animations: 'disabled'
		}
	},
	snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !isCI
	}
});
