<script lang="ts">
	import { browser } from '$app/environment';

	let theme = $state<'light' | 'dark'>('light');

	$effect(() => {
		if (browser) {
			const stored = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			theme = (stored as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');
			document.documentElement.setAttribute('data-theme', theme);
		}
	});

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		if (browser) {
			localStorage.setItem('theme', theme);
			document.documentElement.setAttribute('data-theme', theme);
		}
	}

	const features = [
		{
			icon: '⚡',
			title: 'Blazing Fast',
			description: 'Virtualized rendering handles 100K+ rows at 60fps. Only visible rows are rendered.'
		},
		{
			icon: '🎯',
			title: 'Svelte 5 Native',
			description: 'Built with modern runes ($state, $derived) for optimal reactivity and performance.'
		},
		{
			icon: '🔌',
			title: 'Backend Agnostic',
			description: 'Works with local data, REST APIs, PostgreSQL, or any custom data source.'
		},
		{
			icon: '📱',
			title: 'Full Featured',
			description: 'Selection, sorting, filtering, editing, resizing, reordering - all included.'
		},
		{
			icon: '🎨',
			title: 'Fully Themable',
			description: 'CSS custom properties for complete control over every aspect of styling.'
		},
		{
			icon: '♿',
			title: 'Accessible',
			description: 'ARIA grid pattern implementation with full keyboard navigation support.'
		}
	];
</script>

<svelte:head>
	<title>Svelte DataGrid - High-Performance Data Grid for Svelte 5</title>
	<meta
		name="description"
		content="A high-performance, virtualized data grid component for Svelte 5 with sorting, filtering, selection, and editing."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="homepage">
	<header class="header">
		<div class="header-content">
			<a href="/" class="logo">
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" />
					<rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.7" />
					<rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.5" />
					<rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" />
				</svg>
				<span>Svelte DataGrid</span>
			</a>
			<nav class="nav">
				<a href="/docs">Documentation</a>
				<a href="/demo">Live Demo</a>
				<a
					href="https://github.com/codewithcheese/svelte-datagrid"
					target="_blank"
					rel="noopener noreferrer"
				>
					GitHub
				</a>
				<button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
					{#if theme === 'light'}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
						</svg>
					{:else}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="5" />
							<line x1="12" y1="1" x2="12" y2="3" />
							<line x1="12" y1="21" x2="12" y2="23" />
							<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
							<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
							<line x1="1" y1="12" x2="3" y2="12" />
							<line x1="21" y1="12" x2="23" y2="12" />
							<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
							<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
						</svg>
					{/if}
				</button>
			</nav>
		</div>
	</header>

	<main>
		<section class="hero">
			<div class="hero-content">
				<h1>
					High-Performance
					<span class="gradient">Data Grid</span>
					for Svelte 5
				</h1>
				<p class="hero-description">
					A virtualized, feature-rich data grid built with Svelte 5 runes. Handle thousands of rows
					with ease while maintaining smooth 60fps performance.
				</p>
				<div class="hero-actions">
					<a href="/docs/tutorials/getting-started" class="btn btn-primary">Get Started</a>
					<a href="/demo" class="btn btn-secondary">Live Demo</a>
				</div>
				<div class="hero-install">
					<code>npm install svelte-datagrid</code>
				</div>
			</div>
		</section>

		<section class="code-preview">
			<div class="code-block">
				<div class="code-header">
					<span class="code-file">App.svelte</span>
				</div>
				<pre><code class="language-svelte"><span class="token tag">&lt;script&gt;</span>
  <span class="token keyword">import</span> {'{'} DataGrid {'}'} <span class="token keyword">from</span> <span class="token string">'svelte-datagrid'</span>;

  <span class="token keyword">const</span> columns = [
    {'{'} key: <span class="token string">'id'</span>, header: <span class="token string">'ID'</span>, width: <span class="token number">80</span> {'}'},
    {'{'} key: <span class="token string">'name'</span>, header: <span class="token string">'Name'</span>, width: <span class="token number">200</span> {'}'},
    {'{'} key: <span class="token string">'email'</span>, header: <span class="token string">'Email'</span>, width: <span class="token number">250</span> {'}'}
  ];

  <span class="token keyword">const</span> data = [
    {'{'} id: <span class="token number">1</span>, name: <span class="token string">'Alice'</span>, email: <span class="token string">'alice@example.com'</span> {'}'},
    {'{'} id: <span class="token number">2</span>, name: <span class="token string">'Bob'</span>, email: <span class="token string">'bob@example.com'</span> {'}'}
  ];
<span class="token tag">&lt;/script&gt;</span>

<span class="token tag">&lt;DataGrid</span> {'{'}data{'}'} {'{'}columns{'}'} selectable filterable <span class="token tag">/&gt;</span></code></pre>
			</div>
		</section>

		<section class="features">
			<h2>Everything You Need</h2>
			<div class="features-grid">
				{#each features as feature}
					<div class="feature-card">
						<div class="feature-icon">{feature.icon}</div>
						<h3>{feature.title}</h3>
						<p>{feature.description}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="cta">
			<h2>Ready to Get Started?</h2>
			<p>Install the package and build your first grid in minutes.</p>
			<div class="cta-actions">
				<a href="/docs/tutorials/getting-started" class="btn btn-primary">Read the Tutorial</a>
				<a href="/docs/reference/datagrid" class="btn btn-secondary">API Reference</a>
			</div>
		</section>
	</main>

	<footer class="footer">
		<p>Built with Svelte 5. Open source under MIT license.</p>
	</footer>
</div>

<style>
	:global(:root) {
		--color-bg: #ffffff;
		--color-bg-muted: #f6f8fa;
		--color-text: #374151;
		--color-heading: #111827;
		--color-primary: #6366f1;
		--color-primary-dark: #4f46e5;
		--color-border: #e5e7eb;
		--color-code-bg: #1e293b;
		--color-code-text: #e2e8f0;

		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global([data-theme='dark']) {
		--color-bg: #0f172a;
		--color-bg-muted: #1e293b;
		--color-text: #cbd5e1;
		--color-heading: #f1f5f9;
		--color-primary: #818cf8;
		--color-primary-dark: #6366f1;
		--color-border: #334155;
		--color-code-bg: #0f172a;
		--color-code-text: #e2e8f0;
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

	.homepage {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		position: sticky;
		top: 0;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		z-index: 100;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--color-heading);
		text-decoration: none;
		font-weight: 700;
		font-size: 1.25rem;
	}

	.logo svg {
		color: var(--color-primary);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav a {
		color: var(--color-text);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9375rem;
		transition: color 0.15s ease;
	}

	.nav a:hover {
		color: var(--color-primary);
	}

	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: var(--color-bg-muted);
		color: var(--color-text);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.theme-toggle:hover {
		background: var(--color-border);
	}

	main {
		flex: 1;
	}

	.hero {
		padding: 6rem 2rem 4rem;
		text-align: center;
	}

	.hero-content {
		max-width: 800px;
		margin: 0 auto;
	}

	.hero h1 {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1.1;
		margin: 0 0 1.5rem;
		color: var(--color-heading);
	}

	.gradient {
		background: linear-gradient(135deg, var(--color-primary) 0%, #a855f7 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-description {
		font-size: 1.25rem;
		line-height: 1.7;
		color: var(--color-text);
		margin: 0 0 2rem;
	}

	.hero-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2.5rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		padding: 0.875rem 1.75rem;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		border-radius: 8px;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-dark);
	}

	.btn-secondary {
		background: var(--color-bg-muted);
		color: var(--color-heading);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-border);
	}

	.hero-install {
		display: inline-block;
	}

	.hero-install code {
		display: block;
		padding: 1rem 2rem;
		background: var(--color-code-bg);
		color: var(--color-code-text);
		border-radius: 8px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.9375rem;
	}

	.code-preview {
		padding: 0 2rem 4rem;
		display: flex;
		justify-content: center;
	}

	.code-block {
		max-width: 700px;
		width: 100%;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}

	.code-header {
		background: #0f172a;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #334155;
	}

	.code-file {
		color: #94a3b8;
		font-size: 0.8125rem;
		font-family: 'JetBrains Mono', monospace;
	}

	.code-block pre {
		margin: 0;
		padding: 1.5rem;
		background: var(--color-code-bg);
		overflow-x: auto;
	}

	.code-block code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-code-text);
	}

	.token.tag {
		color: #f472b6;
	}

	.token.keyword {
		color: #c084fc;
	}

	.token.string {
		color: #86efac;
	}

	.token.number {
		color: #fcd34d;
	}

	.features {
		padding: 4rem 2rem;
		background: var(--color-bg-muted);
	}

	.features h2 {
		text-align: center;
		font-size: 2.25rem;
		font-weight: 700;
		margin: 0 0 3rem;
		color: var(--color-heading);
	}

	.features-grid {
		max-width: 1100px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}

	.feature-card {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 2rem;
	}

	.feature-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.feature-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		color: var(--color-heading);
	}

	.feature-card p {
		margin: 0;
		color: var(--color-text);
		line-height: 1.6;
	}

	.cta {
		padding: 6rem 2rem;
		text-align: center;
	}

	.cta h2 {
		font-size: 2.25rem;
		font-weight: 700;
		margin: 0 0 1rem;
		color: var(--color-heading);
	}

	.cta p {
		font-size: 1.125rem;
		color: var(--color-text);
		margin: 0 0 2rem;
	}

	.cta-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.footer {
		padding: 2rem;
		text-align: center;
		border-top: 1px solid var(--color-border);
	}

	.footer p {
		margin: 0;
		color: var(--color-text);
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.hero h1 {
			font-size: 2.5rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.hero-actions,
		.cta-actions {
			flex-direction: column;
		}
	}
</style>
