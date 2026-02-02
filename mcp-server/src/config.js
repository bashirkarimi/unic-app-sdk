import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, loadMagazineArticles } from './article-service.js';
import { initializeArticleListWidget, initializeArticlePreviewWidget } from './widget.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

// For Vercel serverless, blogposts.en.json is at workspace root via includeFiles
function resolveBlogDataPath() {
	if (process.env.BLOG_DATA_PATH) {
		return process.env.BLOG_DATA_PATH;
	}

	// In Vercel, the file is copied to /var/task/ root via includeFiles
	if (process.env.VERCEL) {
		// Try multiple possible locations
		const possiblePaths = [
			path.join('/var/task', 'blogposts.en.json'),
			path.join(process.cwd(), 'blogposts.en.json'),
			path.join(ROOT_DIR, 'blogposts.en.json'),
		];

		for (const testPath of possiblePaths) {
			if (fs.existsSync(testPath)) {
				return testPath;
			}
		}

		// Default fallback for Vercel
		return path.join('/var/task', 'blogposts.en.json');
	}

	// Local development
	return path.join(ROOT_DIR, 'blogposts.en.json');
}

export const BLOG_DATA_PATH = resolveBlogDataPath();

// For Vercel, UI assets are included via includeFiles in vercel.json
function resolveUIAssetsDir() {
	if (process.env.UI_ASSETS_DIR) {
		return process.env.UI_ASSETS_DIR;
	}

	if (process.env.VERCEL) {
		// In Vercel, check multiple possible locations
		const possiblePaths = [
			path.join('/var/task', 'ui-sdk', 'dist'),
			path.join(process.cwd(), 'ui-sdk', 'dist'),
			path.join(ROOT_DIR, 'ui-sdk', 'dist'),
		];

		for (const testPath of possiblePaths) {
			if (fs.existsSync(testPath)) {
				console.log('Found UI assets at:', testPath);
				return testPath;
			}
		}

		// Default fallback
		return path.join('/var/task', 'ui-sdk', 'dist');
	}

	// Local development
	return path.join(ROOT_DIR, 'ui-sdk', 'dist');
}

export const UI_ASSETS_DIR = resolveUIAssetsDir();
export const DEFAULT_PORT = CONFIG.DEFAULT_PORT;

/**
 * Validates that required data files exist before server startup
 * @throws {Error} If required files are missing
 */
export function validateEnvironment() {
	console.log('Validating environment...');
	console.log('Current working directory:', process.cwd());
	console.log('Looking for blog data at:', BLOG_DATA_PATH);
	console.log('VERCEL env:', process.env.VERCEL);

	if (!fs.existsSync(BLOG_DATA_PATH)) {
		console.error('Blog data file not found at:', BLOG_DATA_PATH);
		console.error('Checking alternative locations...');

		// List files in process.cwd() for debugging
		try {
			const cwdFiles = fs.readdirSync(process.cwd());
			console.error('Files in cwd():', cwdFiles.filter((f) => f.endsWith('.json')).slice(0, 10));
		} catch (e) {
			console.error('Cannot read process.cwd():', e.message);
		}

		// Check /var/task in Vercel
		if (process.env.VERCEL) {
			try {
				const taskFiles = fs.readdirSync('/var/task');
				console.error(
					'Files in /var/task:',
					taskFiles.filter((f) => f.endsWith('.json')).slice(0, 10)
				);
			} catch (e) {
				console.error('Cannot read /var/task:', e.message);
			}
		}

		throw new Error(`Required blog data file not found: ${BLOG_DATA_PATH}`);
	}

	console.log('✓ Blog data file found at:', BLOG_DATA_PATH);
}

/**
 * Initialize application data and widgets
 * @returns Object containing initialized widgets
 */
export function initializeApp() {
	// Validate environment first
	validateEnvironment();

	// Load article data
	loadMagazineArticles(BLOG_DATA_PATH);

	// Initialize widgets
	const articleListWidget = initializeArticleListWidget(UI_ASSETS_DIR);
	const articlePreviewWidget = initializeArticlePreviewWidget(UI_ASSETS_DIR);

	if (articleListWidget) {
		console.log('✓ Article list widget initialized');
	} else {
		console.warn('✗ Article list widget not available');
	}

	if (articlePreviewWidget) {
		console.log('✓ Article preview widget initialized');
	} else {
		console.warn('✗ Article preview widget not available');
	}

	return {
		articleListWidget,
		articlePreviewWidget,
	};
}
