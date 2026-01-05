<script lang="ts">
	import { page } from '$app/stores';

	interface NavItem {
		title: string;
		href: string;
	}

	interface NavSection {
		title: string;
		items: NavItem[];
	}

	const navigation: NavSection[] = [
		{
			title: 'Getting Started',
			items: [
				{ title: 'Introduction', href: '/docs' },
				{ title: 'Quick Start', href: '/docs/tutorials/getting-started' },
				{ title: 'Adding Selection', href: '/docs/tutorials/adding-selection' },
				{ title: 'Server-Side Data', href: '/docs/tutorials/server-side-data' }
			]
		},
		{
			title: 'How-To Guides',
			items: [
				{ title: 'Filtering', href: '/docs/how-to/filtering' },
				{ title: 'Cell Editing', href: '/docs/how-to/editing' },
				{ title: 'Keyboard Navigation', href: '/docs/how-to/keyboard-navigation' },
				{ title: 'Column Resizing', href: '/docs/how-to/column-resizing' },
				{ title: 'Custom Cells', href: '/docs/how-to/custom-cells' },
				{ title: 'Row Styling', href: '/docs/how-to/row-styling' },
				{ title: 'Theming', href: '/docs/how-to/theming' }
			]
		},
		{
			title: 'Reference',
			items: [
				{ title: 'DataGrid Props', href: '/docs/reference/datagrid' },
				{ title: 'Column Definition', href: '/docs/reference/column-definition' },
				{ title: 'Grid State', href: '/docs/reference/grid-state' },
				{ title: 'Data Sources', href: '/docs/reference/data-sources' },
				{ title: 'Types', href: '/docs/reference/types' },
				{ title: 'Filter Operators', href: '/docs/reference/filter-operators' },
				{ title: 'CSS Variables', href: '/docs/reference/css-variables' }
			]
		},
		{
			title: 'Concepts',
			items: [
				{ title: 'Architecture', href: '/docs/explanation/architecture' },
				{ title: 'State Management', href: '/docs/explanation/state-management' },
				{ title: 'Virtualization', href: '/docs/explanation/virtualization' },
				{ title: 'Data Sources', href: '/docs/explanation/data-source-architecture' },
				{ title: 'Performance', href: '/docs/explanation/performance' }
			]
		}
	];

	function isActive(href: string, currentPath: string): boolean {
		if (href === '/docs') {
			return currentPath === '/docs' || currentPath === '/docs/';
		}
		return currentPath.startsWith(href);
	}
</script>

<nav class="sidebar">
	<div class="sidebar-header">
		<a href="/" class="logo">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" />
				<rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.7" />
				<rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.5" />
				<rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" />
			</svg>
			<span>Svelte DataGrid</span>
		</a>
	</div>

	<div class="sidebar-content">
		{#each navigation as section}
			<div class="nav-section">
				<h3 class="nav-section-title">{section.title}</h3>
				<ul class="nav-list">
					{#each section.items as item}
						<li>
							<a
								href={item.href}
								class="nav-link"
								class:active={isActive(item.href, $page.url.pathname)}
							>
								{item.title}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</nav>

<style>
	.sidebar {
		width: 260px;
		height: 100vh;
		position: fixed;
		top: 0;
		left: 0;
		background: var(--color-sidebar-bg);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--color-heading);
		text-decoration: none;
		font-weight: 600;
		font-size: 1.1rem;
	}

	.logo svg {
		color: var(--color-primary);
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 0;
	}

	.nav-section {
		padding: 0 1rem;
		margin-bottom: 1.5rem;
	}

	.nav-section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		padding: 0 0.5rem;
		margin-bottom: 0.5rem;
	}

	.nav-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.nav-link {
		display: block;
		padding: 0.5rem 0.75rem;
		color: var(--color-text);
		text-decoration: none;
		font-size: 0.9rem;
		border-radius: 6px;
		transition: all 0.15s ease;
	}

	.nav-link:hover {
		background: var(--color-bg-hover);
		color: var(--color-heading);
	}

	.nav-link.active {
		background: var(--color-primary-bg);
		color: var(--color-primary);
		font-weight: 500;
	}

	/* Scrollbar styling */
	.sidebar-content::-webkit-scrollbar {
		width: 6px;
	}

	.sidebar-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.sidebar-content::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 3px;
	}

	.sidebar-content::-webkit-scrollbar-thumb:hover {
		background: var(--color-text-muted);
	}
</style>
