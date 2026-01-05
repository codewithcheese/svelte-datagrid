import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';

// Enable benchmark instrumentation with: BENCH=1 pnpm bench:playwright
const isBenchMode = process.env.BENCH === '1';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	define: {
		// Compile-time constant for benchmark instrumentation
		// When false, all benchmark code is tree-shaken from production builds
		__BENCH__: JSON.stringify(isBenchMode)
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./vitest-setup.ts'],
		globals: true,
		benchmark: {
			include: ['src/**/*.bench.{js,ts}']
		}
	}
} as any);
