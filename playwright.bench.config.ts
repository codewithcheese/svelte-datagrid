/**
 * Playwright configuration for benchmark tests
 *
 * Key differences from regular Playwright config:
 * - Runs against production build (build + preview), not dev server
 * - BENCH=1 environment variable enables benchmark instrumentation
 * - Uses a dedicated port (4173) for preview server
 * - Chromium-only for consistent, comparable results
 * - Longer timeouts for large dataset operations
 */

import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: './bench',
	fullyParallel: false, // Benchmarks need sequential execution for accuracy
	forbidOnly: isCI,
	retries: 0, // No retries for benchmarks - failures indicate real issues
	workers: 1, // Single worker for consistent timing
	timeout: 120_000, // 2 minutes per test (large datasets take time)
	reporter: [
		['html', { outputFolder: 'bench-results/html' }],
		['json', { outputFile: 'bench-results/results.json' }]
	],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'off', // Tracing affects performance
		video: 'off',
		screenshot: 'off'
	},
	projects: [
		{
			name: 'chromium-benchmark',
			use: {
				...devices['Desktop Chrome'],
				// Disable animations and other features that affect timing
				launchOptions: {
					args: ['--disable-animations', '--disable-gpu-vsync']
				}
			}
		}
	],
	webServer: {
		// Build with BENCH=1 and run preview
		command: 'BENCH=1 pnpm build && pnpm preview --port 4173',
		url: 'http://localhost:4173',
		reuseExistingServer: !isCI,
		timeout: 120_000 // Allow time for build
	}
});
