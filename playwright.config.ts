import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: './e2e',
	testIgnore: ['**/visual.spec.ts'], // Visual tests have separate config
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['json', { outputFile: 'test-results/results.json' }]
	],
	use: {
		baseURL: 'http://localhost:4173',
		// Capture trace on first retry for debugging CI failures
		trace: 'on-first-retry',
		// Capture screenshot on failure for quick visual inspection
		screenshot: 'only-on-failure',
		// Capture video on first retry (helps debug flaky tests)
		video: 'on-first-retry'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],
	webServer: {
		command: 'pnpm build && pnpm preview --port 4173',
		url: 'http://localhost:4173',
		reuseExistingServer: !isCI,
		timeout: 60_000
	}
});
