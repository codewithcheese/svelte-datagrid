#!/usr/bin/env node
/**
 * Validates that navigation links in Sidebar.svelte point to existing routes.
 * Run with: node scripts/check-nav-links.js
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read the Sidebar.svelte file
const sidebarPath = join(rootDir, 'src/lib/docs/components/Sidebar.svelte');
const sidebarContent = readFileSync(sidebarPath, 'utf-8');

// Extract all href values from the navigation array
const hrefRegex = /href:\s*['"]([^'"]+)['"]/g;
const links = [];
let match;

while ((match = hrefRegex.exec(sidebarContent)) !== null) {
	links.push(match[1]);
}

// Check each link has a corresponding route
const errors = [];

for (const link of links) {
	// Convert URL path to file system path
	// /docs -> src/routes/docs/+page.md
	// /docs/tutorials/getting-started -> src/routes/docs/tutorials/getting-started/+page.md
	const routePath = join(rootDir, 'src/routes', link, '+page.md');

	if (!existsSync(routePath)) {
		errors.push({
			link,
			expectedPath: routePath.replace(rootDir + '/', '')
		});
	}
}

if (errors.length > 0) {
	console.error('❌ Broken navigation links found:\n');
	for (const error of errors) {
		console.error(`  Link: ${error.link}`);
		console.error(`  Expected: ${error.expectedPath}\n`);
	}
	process.exit(1);
} else {
	console.log(`✅ All ${links.length} navigation links are valid`);
	process.exit(0);
}
