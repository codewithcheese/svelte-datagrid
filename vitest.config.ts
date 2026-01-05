import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	plugins: [svelte()],
	test: {
		alias: {
			$lib: '/src/lib'
		},
		projects: [
			{
				// Browser-based component tests (Svelte 5 runes work here)
				// Default: Chromium. Override via CLI: --browser.instances.0.browser=firefox
				extends: true,
				test: {
					name: 'browser',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup-browser.ts']
				}
			},
			{
				// Node.js unit tests (virtualizer, utilities)
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup.ts']
				}
			}
		]
	}
});
