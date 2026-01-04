<script>
	import Sidebar from '$lib/docs/components/Sidebar.svelte';
	import Header from '$lib/docs/components/Header.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Svelte DataGrid - Documentation</title>
	<meta name="description" content="High-performance, virtualized data grid component for Svelte 5" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="docs-layout">
	<Sidebar />
	<Header />
	<main class="docs-main">
		<div class="docs-container">
			{@render children()}
		</div>
	</main>
</div>

<style>
	:global(:root) {
		/* Light theme (default) */
		--color-bg: #ffffff;
		--color-bg-muted: #f6f8fa;
		--color-bg-hover: #f3f4f6;
		--color-sidebar-bg: #fafbfc;
		--color-text: #374151;
		--color-text-muted: #6b7280;
		--color-heading: #111827;
		--color-primary: #6366f1;
		--color-primary-bg: #eef2ff;
		--color-border: #e5e7eb;
		--color-code-bg: #f3f4f6;
		--color-code: #1f2937;

		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global([data-theme='dark']) {
		--color-bg: #0d1117;
		--color-bg-muted: #161b22;
		--color-bg-hover: #21262d;
		--color-sidebar-bg: #010409;
		--color-text: #c9d1d9;
		--color-text-muted: #8b949e;
		--color-heading: #f0f6fc;
		--color-primary: #818cf8;
		--color-primary-bg: rgba(99, 102, 241, 0.15);
		--color-border: #30363d;
		--color-code-bg: #161b22;
		--color-code: #c9d1d9;
	}

	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--color-bg);
		color: var(--color-text);
	}

	.docs-layout {
		min-height: 100vh;
	}

	.docs-main {
		margin-left: 260px;
		padding-top: 64px;
		min-height: 100vh;
	}

	.docs-container {
		max-width: 850px;
		margin: 0 auto;
		padding: 2.5rem 2rem 4rem;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.docs-main {
			margin-left: 0;
		}

		.docs-container {
			padding: 1.5rem 1rem 3rem;
		}
	}
</style>
