#!/usr/bin/env node
/**
 * Validates internal route links in Svelte files.
 * Checks both href="..." attributes and href: '...' in JS objects.
 * Run with: node scripts/check-svelte-links.js
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Recursively find all Svelte files in a directory
 */
function findSvelteFiles(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			findSvelteFiles(fullPath, files);
		} else if (entry.endsWith('.svelte')) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * Extract internal route links from file content
 * Matches: href="/path", href='/path', href: "/path", href: '/path'
 */
function extractInternalLinks(content) {
	const links = [];

	// Match href="..." or href='...' (HTML attributes)
	const htmlHrefRegex = /href=["'](\/?[^"']+)["']/g;

	// Match href: "..." or href: '...' (JS object properties)
	const jsHrefRegex = /href:\s*["'](\/?[^"']+)["']/g;

	let match;

	while ((match = htmlHrefRegex.exec(content)) !== null) {
		const href = match[1];
		// Only check internal routes (starting with /)
		if (href.startsWith('/') && !href.startsWith('//')) {
			links.push(href);
		}
	}

	while ((match = jsHrefRegex.exec(content)) !== null) {
		const href = match[1];
		// Only check internal routes (starting with /)
		if (href.startsWith('/') && !href.startsWith('//')) {
			links.push(href);
		}
	}

	return [...new Set(links)]; // Remove duplicates
}

/**
 * Check if a route exists as a SvelteKit route
 */
function routeExists(routePath) {
	// SvelteKit routes can be:
	// - src/routes/path/+page.svelte
	// - src/routes/path/+page.md (for mdsvex)
	const basePath = join(rootDir, 'src/routes', routePath);

	return (
		existsSync(join(basePath, '+page.svelte')) ||
		existsSync(join(basePath, '+page.md')) ||
		existsSync(join(basePath, '+page.ts')) ||
		existsSync(join(basePath, '+page.js'))
	);
}

// Find all Svelte files in docs components
const docsComponentsDir = join(rootDir, 'src/lib/docs');
const svelteFiles = existsSync(docsComponentsDir) ? findSvelteFiles(docsComponentsDir) : [];

// Also check routes for any internal links
const routesDir = join(rootDir, 'src/routes');
if (existsSync(routesDir)) {
	findSvelteFiles(routesDir, svelteFiles);
}

const errors = [];
let totalLinks = 0;

for (const file of svelteFiles) {
	const content = readFileSync(file, 'utf-8');
	const links = extractInternalLinks(content);

	for (const link of links) {
		totalLinks++;
		if (!routeExists(link)) {
			errors.push({
				file: file.replace(rootDir + '/', ''),
				link,
				expectedRoutes: [
					`src/routes${link}/+page.svelte`,
					`src/routes${link}/+page.md`
				]
			});
		}
	}
}

if (errors.length > 0) {
	console.error('❌ Broken internal links found:\n');
	for (const error of errors) {
		console.error(`  File: ${error.file}`);
		console.error(`  Link: ${error.link}`);
		console.error(`  Expected one of:`);
		for (const route of error.expectedRoutes) {
			console.error(`    - ${route}`);
		}
		console.error('');
	}
	process.exit(1);
} else {
	console.log(`✅ All ${totalLinks} internal route links are valid`);
	process.exit(0);
}
