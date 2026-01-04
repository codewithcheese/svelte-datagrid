<script>
	let { children } = $props();
</script>

<article class="doc-content">
	{@render children()}
</article>

<style>
	.doc-content {
		max-width: 100%;
		line-height: 1.7;
	}

	.doc-content :global(h1) {
		font-size: 2.25rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
		color: var(--color-heading);
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.75rem;
	}

	.doc-content :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 2.5rem;
		margin-bottom: 1rem;
		color: var(--color-heading);
	}

	.doc-content :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
		color: var(--color-heading);
	}

	.doc-content :global(h4) {
		font-size: 1.1rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
		color: var(--color-heading);
	}

	.doc-content :global(p) {
		margin-bottom: 1rem;
		color: var(--color-text);
	}

	.doc-content :global(ul),
	.doc-content :global(ol) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}

	.doc-content :global(li) {
		margin-bottom: 0.5rem;
		color: var(--color-text);
	}

	.doc-content :global(a) {
		color: var(--color-primary);
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition: border-color 0.15s ease;
	}

	.doc-content :global(a:hover) {
		border-bottom-color: var(--color-primary);
	}

	.doc-content :global(code) {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.9em;
		background: var(--color-code-bg);
		color: var(--color-code);
		padding: 0.2em 0.4em;
		border-radius: 4px;
	}

	.doc-content :global(pre) {
		margin: 1.5rem 0;
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.doc-content :global(pre code) {
		background: none;
		padding: 0;
		color: inherit;
	}

	/* Shiki theme switching */
	.doc-content :global(.shiki) {
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
	}

	:global([data-theme='light']) .doc-content :global(.shiki),
	:global(:root:not([data-theme='dark'])) .doc-content :global(.shiki) {
		background-color: #f6f8fa !important;
	}

	:global([data-theme='light']) .doc-content :global(.shiki span),
	:global(:root:not([data-theme='dark'])) .doc-content :global(.shiki span) {
		color: var(--shiki-light) !important;
	}

	:global([data-theme='dark']) .doc-content :global(.shiki) {
		background-color: #0d1117 !important;
	}

	:global([data-theme='dark']) .doc-content :global(.shiki span) {
		color: var(--shiki-dark) !important;
	}

	.doc-content :global(blockquote) {
		margin: 1.5rem 0;
		padding: 1rem 1.5rem;
		border-left: 4px solid var(--color-primary);
		background: var(--color-bg-muted);
		border-radius: 0 8px 8px 0;
	}

	.doc-content :global(blockquote p:last-child) {
		margin-bottom: 0;
	}

	.doc-content :global(table) {
		width: 100%;
		margin: 1.5rem 0;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.doc-content :global(th),
	.doc-content :global(td) {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	.doc-content :global(th) {
		font-weight: 600;
		color: var(--color-heading);
		background: var(--color-bg-muted);
	}

	.doc-content :global(tr:hover td) {
		background: var(--color-bg-hover);
	}

	.doc-content :global(hr) {
		margin: 2rem 0;
		border: none;
		border-top: 1px solid var(--color-border);
	}

	.doc-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
	}

	/* Info/warning boxes via blockquote with specific text */
	.doc-content :global(blockquote:has(> p:first-child > strong:first-child)) {
		padding-left: 1rem;
	}
</style>
