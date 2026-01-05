// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	/**
	 * Compile-time constant for benchmark instrumentation.
	 * Set via BENCH=1 environment variable during build.
	 * When false, all benchmark code is tree-shaken from production builds.
	 */
	const __BENCH__: boolean;
}

export {};
