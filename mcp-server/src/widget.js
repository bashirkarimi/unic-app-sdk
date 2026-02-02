import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractHeroMedia, getAuthorName } from './article-service.js';

// ESM equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds self-contained HTML for a widget by inlining CSS and JS assets.
 * First checks for prebuilt HTML in dist/, then falls back to dynamic inlining.
 * @param entryName - The widget entry name (e.g., 'article-list')
 * @param rootId - The DOM element ID where the widget mounts
 * @param uiAssetsDir - Directory containing built widget assets
 * @returns Complete HTML string with inlined styles and scripts
 */
export function buildWidgetHtml(entryName, rootId, uiAssetsDir) {
	try {
		// Prefer prebuilt self-contained HTML from dist/ (faster, for production)
		const distDir = path.resolve(__dirname, '../../../ui-sdk/dist');
		const htmlPath = path.join(distDir, `${entryName}.html`);
		if (fs.existsSync(htmlPath)) {
			return fs.readFileSync(htmlPath, 'utf8');
		}

		// Fallback: dynamically inline assets (for local dev without prebuild)
		if (!fs.existsSync(uiAssetsDir)) {
			throw new Error(
				`Widget assets not found at ${uiAssetsDir}. Run "pnpm --filter unic-ui-sdk build" first.`
			);
		}

		const jsAsset = resolveWidgetAsset(entryName, '.js', uiAssetsDir);
		const cssAsset = resolveWidgetAsset(entryName, '.css', uiAssetsDir);
		const jsPath = path.join(uiAssetsDir, jsAsset);
		const cssPath = path.join(uiAssetsDir, cssAsset);

		if (!fs.existsSync(jsPath)) {
			throw new Error(`Widget JS asset not found: ${jsPath}`);
		}
		if (!fs.existsSync(cssPath)) {
			throw new Error(`Widget CSS asset not found: ${cssPath}`);
		}

		const jsContents = fs.readFileSync(jsPath, 'utf8');
		const cssContents = fs.readFileSync(cssPath, 'utf8');
		const safeJs = escapeForInlineScript(jsContents);
		const safeCss = escapeForInlineStyle(cssContents);

		return `<!doctype html>
			<html>
			<head>
				<style>${safeCss}</style>
			</head>
			<body>
				<div id="${rootId}"></div>
				<script type="module">${safeJs}</script>
			</body>
			</html>`;
	} catch (err) {
		console.warn(`[Widget] ${entryName}: ${err?.message || err}`);

		// Try fallback HTML if available
		const fallbackPath = path.join(uiAssetsDir, 'fallback-widget.html');
		if (fs.existsSync(fallbackPath)) {
			return fs.readFileSync(fallbackPath, 'utf8');
		}

		return `<div>Widget unavailable</div>`;
	}
}

function resolveWidgetAsset(entryName, extension, uiAssetsDir) {
	const files = fs.readdirSync(uiAssetsDir);
	const hashedCandidates = files
		.filter((file) => file.startsWith(`${entryName}-`) && file.endsWith(extension))
		.sort();
	const hashed = hashedCandidates.at(-1);
	if (hashed) {
		return hashed;
	}

	const fallback = `${entryName}${extension}`;
	if (files.includes(fallback)) {
		return fallback;
	}

	throw new Error(
		`Missing ${extension} asset for widget "${entryName}" inside ${uiAssetsDir}. Build the UI bundle first.`
	);
}

function escapeForInlineScript(source) {
	return source.replace(/<\/script/gi, '<\\/script');
}

function escapeForInlineStyle(source) {
	return source.replace(/<\/style/gi, '<\\/style');
}

export function widgetDescriptorMeta(widget) {
	return {
		'openai/outputTemplate': widget.templateUri,
		'openai/toolInvocation/invoking': widget.invoking,
		'openai/toolInvocation/invoked': widget.invoked,
		'openai/widgetAccessible': true,
	};
}

export function widgetInvocationMeta(widget) {
	return {
		'openai/toolInvocation/invoking': widget.invoking,
		'openai/toolInvocation/invoked': widget.invoked,
	};
}

export function mapMagazineArticleToWidgetArticle(article) {
	const slug = article.slug.trim();
	const title = article.title.trim();
	const publicationDate = article.publicationDate.trim();
	if (Number.isNaN(Date.parse(publicationDate))) {
		return null;
	}

	const lead = article.lead?.trim() ?? '';
	const author = getAuthorName(article);
	const { heroUrl, heroAlt } = extractHeroMedia(article);
	// Use link from CMS, or generate URL from slug as fallback
	const url = article.link?.trim() || `https://www.unic.com/en/magazine/${slug}`;

	return {
		slug,
		title,
		lead,
		author,
		publicationDate: new Date(publicationDate).toISOString(),
		url,
		heroUrl,
		heroAlt,
	};
}

export function initializeArticleListWidget(uiAssetsDir) {
	try {
		const entryName = 'article-list';
		const templateUri = `ui://widget/${entryName}.html`;
		const html = buildWidgetHtml(entryName, `${entryName}-root`, uiAssetsDir);

		return {
			id: 'unic-article-list',
			title: 'Unic magazine article list',
			templateUri,
			invoking: 'Curating magazine stories',
			invoked: 'Article list ready',
			html,
		};
	} catch (error) {
		console.warn('Article list widget unavailable:', error);
		return null;
	}
}

export function createSearchWidgetPayload(query, limit, results) {
	const widgetArticles = results
		.map((article) => mapMagazineArticleToWidgetArticle(article))
		.filter((article) => Boolean(article));

	return {
		heading: `Results for "${query}"`,
		articles: widgetArticles,
		summary: `Found ${results.length} article(s) (limit ${limit}).`,
		total: widgetArticles.length,
		generatedAt: new Date().toISOString(),
		context: {
			query,
			limit,
			totalMatches: results.length,
			widgetArticles: widgetArticles.length,
		},
	};
}

export function initializeArticlePreviewWidget(uiAssetsDir) {
	try {
		const entryName = 'article-preview';
		const templateUri = `ui://widget/${entryName}.html`;
		const html = buildWidgetHtml(entryName, `${entryName}-root`, uiAssetsDir);

		return {
			id: 'unic-article-preview',
			title: 'Unic magazine article preview',
			templateUri,
			invoking: 'Loading article preview',
			invoked: 'Article preview ready',
			html,
		};
	} catch (error) {
		console.warn('Article preview widget unavailable:', error);
		return null;
	}
}

export function createArticlePreviewWidgetPayload(article) {
	const widgetArticle = mapMagazineArticleToWidgetArticle(article);

	return {
		heading: 'Article Preview',
		article: widgetArticle,
		generatedAt: new Date().toISOString(),
	};
}
