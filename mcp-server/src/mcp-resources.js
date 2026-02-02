import { CONFIG, magazineArticles } from './article-service.js';
import { widgetDescriptorMeta } from './widget.js';

/**
 * Creates an MCP Resource from a widget descriptor
 */
export function createWidgetResource(widget) {
	return {
		uri: widget.templateUri,
		name: widget.title,
		description: 'Interactive article list widget markup',
		mimeType: 'text/html+skybridge',
		_meta: widgetDescriptorMeta(widget),
	};
}

/**
 * Creates an MCP ResourceTemplate from a widget descriptor
 */
export function createWidgetResourceTemplate(widget) {
	return {
		uriTemplate: widget.templateUri,
		name: widget.title,
		description: 'Interactive article list widget markup',
		mimeType: 'text/html+skybridge',
		_meta: widgetDescriptorMeta(widget),
	};
}

/**
 * ResourceTemplate for reading a specific article by slug
 */
export function getArticleResourceTemplate() {
	return {
		uriTemplate: 'blog://article/{slug}',
		name: 'Unic magazine article',
		description:
			'Read a specific article by slug. Use tools like search_articles to discover slugs, then read via blog://article/{slug}.',
		mimeType: 'application/json',
	};
}

/**
 * Creates MCP Resources for each article
 */
export function getArticleResources() {
	const limitEnv = Number(process.env.MAX_LISTED_ARTICLE_RESOURCES ?? '50');
	const limit = Number.isFinite(limitEnv) && limitEnv > 0 ? limitEnv : 50;

	const sorted = [...magazineArticles].sort(
		(a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
	);

	return sorted.slice(0, limit).map((article) => ({
		uri: `blog://article/${article.slug}`,
		name: article.title || 'Untitled',
		description: article.lead || 'No description available',
		mimeType: 'application/json',
	}));
}

/**
 * Defines all available MCP tools for article operations
 */
export function createTools(articleListWidget, articlePreviewWidget) {
	return [
		{
			name: 'search_articles',
			title: 'Search Unic magazine articles',
			description:
				'Search blog articles by keyword or phrase. Searches in title, lead/summary, and author name. Returns formatted results with article URLs (https://www.unic.com/en/magazine/...).',
			inputSchema: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'Search keyword or phrase',
					},
					limit: {
						type: 'number',
						description: 'Maximum number of results to return (default: 10)',
						default: 10,
					},
				},
				required: ['query'],
			},
			...(articleListWidget
				? {
						_meta: widgetDescriptorMeta(articleListWidget),
						annotations: {
							destructiveHint: false,
							openWorldHint: false,
							readOnlyHint: true,
						},
				  }
				: {}),
		},
		{
			name: 'filter_articles_by_date',
			description:
				'Filter blog articles by publication date range. Returns articles sorted by date (newest first) with article URLs (https://www.unic.com/en/magazine/...).',
			inputSchema: {
				type: 'object',
				properties: {
					startDate: {
						type: 'string',
						description: 'Start date in ISO format (YYYY-MM-DD) - optional',
					},
					endDate: {
						type: 'string',
						description: 'End date in ISO format (YYYY-MM-DD) - optional',
					},
					limit: {
						type: 'number',
						description: 'Maximum number of results to return (default: 10)',
						default: 10,
					},
				},
			},
		},
		{
			name: 'filter_articles_by_author',
			description:
				'Filter blog articles by author name. Returns formatted results with article URLs (https://www.unic.com/en/magazine/...).',
			inputSchema: {
				type: 'object',
				properties: {
					authorName: {
						type: 'string',
						description: 'Author name or partial name to search for',
					},
					limit: {
						type: 'number',
						description: 'Maximum number of results to return (default: 10)',
						default: 10,
					},
				},
				required: ['authorName'],
			},
		},
		{
			name: 'list_recent_articles',
			description:
				'List the most recent blog articles, sorted by publication date. Returns formatted results with article URLs (https://www.unic.com/en/magazine/...).',
			inputSchema: {
				type: 'object',
				properties: {
					limit: {
						type: 'number',
						description: `Maximum number of articles to return (default: ${CONFIG.DEFAULT_LIMIT}, max: ${CONFIG.MAX_LIMIT})`,
						default: CONFIG.DEFAULT_LIMIT,
					},
				},
			},
		},
		{
			name: 'get_article_preview',
			description:
				'Get a detailed summary, preview, or full content of a specific blog article by its title. Use this tool whenever a user asks for a summary, preview, or details about a specific article. The tool will search for the article by title and display it in a rich interactive widget.',
			inputSchema: {
				type: 'object',
				properties: {
					title: {
						type: 'string',
						description:
							'Article title or phrase to search for (e.g., "AI solutions" or "Value-added AI solutions tailored to your company"). Use the exact or partial title from the user\'s request.',
					},
				},
				required: ['title'],
			},
			...(articlePreviewWidget
				? {
						_meta: widgetDescriptorMeta(articlePreviewWidget),
						annotations: {
							destructiveHint: false,
							openWorldHint: false,
							readOnlyHint: true,
						},
				  }
				: {}),
		},
	];
}
