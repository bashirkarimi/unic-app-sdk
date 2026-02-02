import { createServer } from 'node:http';
import path from 'node:path';
import { URL, pathToFileURL } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import { DEFAULT_PORT, initializeApp } from './config.js';
import {
	CONFIG,
	filterArticlesByAuthor,
	filterArticlesByDateRange,
	formatArticleList,
	formatArticlePreview,
	formatArticleUrlList,
	magazineArticles,
	searchArticles,
	searchArticlesByTitle,
} from './article-service.js';
import {
	createArticlePreviewWidgetPayload,
	createSearchWidgetPayload,
	widgetDescriptorMeta,
	widgetInvocationMeta,
} from './widget.js';
import { getCorsHeaders, ensureStreamableAccept } from './cors-utils.js';

// Initialize application: load data and widgets once on module load
let articleListWidget = null;
let articlePreviewWidget = null;
let widgetsInitialized = false;

// Load widgets lazily (heavy, only when needed)
function ensureWidgetsInitialized() {
	if (widgetsInitialized) return;

	console.log('[MCP] Initializing widgets...');
	const { articleListWidget: listWidget, articlePreviewWidget: previewWidget } = initializeApp();
	articleListWidget = listWidget;
	articlePreviewWidget = previewWidget;
	widgetsInitialized = true;
	console.log('[MCP] Widgets initialized');
}

/**
 * Creates and configures the MCP server with all resources and tools
 */
function createBlogServer() {
	const server = new McpServer({
		name: 'unic-article-server',
		version: '1.0.0',
	});

	// Register article list widget resource
	if (articleListWidget) {
		server.registerResource('article-list-widget', articleListWidget.templateUri, {}, async () => {
			return {
				contents: [
					{
						uri: articleListWidget.templateUri,
						mimeType: 'text/html+skybridge',
						text: articleListWidget.html,
						_meta: widgetDescriptorMeta(articleListWidget),
					},
				],
			};
		});
	}

	// Register article preview widget resource
	if (articlePreviewWidget) {
		server.registerResource(
			'article-preview-widget',
			articlePreviewWidget.templateUri,
			{},
			async () => {
				return {
					contents: [
						{
							uri: articlePreviewWidget.templateUri,
							mimeType: 'text/html+skybridge',
							text: articlePreviewWidget.html,
							_meta: widgetDescriptorMeta(articlePreviewWidget),
						},
					],
				};
			}
		);
	}

	// Register search_articles tool
	server.registerTool(
		'search_articles',
		{
			title: 'Search articles',
			description:
				'Search for Unic magazine articles by keyword. Returns matching articles with titles, summaries, and links.',
			inputSchema: {
				query: z.string().describe('The search query to find articles'),
				limit: z
					.number()
					.optional()
					.default(CONFIG.DEFAULT_LIMIT)
					.describe('Maximum number of results to return'),
			},
			annotations: {
				readOnlyHint: true,
			},
			_meta: articleListWidget
				? {
						'openai/outputTemplate': articleListWidget.templateUri,
						'openai/toolInvocation/invoking': articleListWidget.invoking,
						'openai/toolInvocation/invoked': articleListWidget.invoked,
				  }
				: {},
		},
		async ({ query, limit = CONFIG.DEFAULT_LIMIT }) => {
			const results = searchArticles(query, limit);

			if (articleListWidget) {
				const widgetPayload = createSearchWidgetPayload(query, limit, results);

				const textOutput = `Found ${results.length} article(s) matching "${query}"${
					limit < CONFIG.MAX_LIMIT ? ` (showing up to ${limit})` : ''
				}.
					[DO NOT show published date and author name.]
					**Quick Reference:** display summary of search results as a whole.
				💡 **Try:** display summary of an article.`;

				return {
					content: [
						{
							type: 'text',
							text: textOutput,
						},
					],
					structuredContent: widgetPayload,
					_meta: widgetInvocationMeta(articleListWidget),
				};
			}

			// Fallback for non-widget clients
			const formattedResults = formatArticleList(results);
			return {
				content: [
					{
						type: 'text',
						text: `Found ${results.length} article(s) matching "${query}":\n\n${formattedResults}`,
					},
				],
			};
		}
	);

	// Register filter_articles_by_date tool
	server.registerTool(
		'filter_articles_by_date',
		{
			title: 'Filter articles by date',
			description: 'Filter articles by publication date range.',
			inputSchema: {
				startDate: z.string().optional().describe('Start date in ISO format (YYYY-MM-DD)'),
				endDate: z.string().optional().describe('End date in ISO format (YYYY-MM-DD)'),
				limit: z
					.number()
					.optional()
					.default(CONFIG.DEFAULT_LIMIT)
					.describe('Maximum number of results'),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ startDate, endDate, limit = CONFIG.DEFAULT_LIMIT }) => {
			const results = filterArticlesByDateRange(startDate, endDate, limit);

			const dateContext =
				startDate && endDate
					? `between ${startDate} and ${endDate}`
					: startDate
					? `from ${startDate} onwards`
					: endDate
					? `until ${endDate}`
					: 'from all time';

			const urlList = formatArticleUrlList(results);
			const textOutput = `Found ${results.length} article(s) ${dateContext}${
				limit < CONFIG.MAX_LIMIT ? ` (showing up to ${limit})` : ''
			}.

				**Quick Reference:**
				${urlList}

				💡 **Try:** Search by keyword or filter by specific author.`;

			return {
				content: [
					{
						type: 'text',
						text: textOutput,
					},
				],
			};
		}
	);

	// Register filter_articles_by_author tool
	server.registerTool(
		'filter_articles_by_author',
		{
			title: 'Filter articles by author',
			description: 'Find articles written by a specific author.',
			inputSchema: {
				authorName: z.string().describe('The author name to search for'),
				limit: z
					.number()
					.optional()
					.default(CONFIG.DEFAULT_LIMIT)
					.describe('Maximum number of results'),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ authorName, limit = CONFIG.DEFAULT_LIMIT }) => {
			const results = filterArticlesByAuthor(authorName, limit);
			const urlList = formatArticleUrlList(results);
			const textOutput = `Found ${results.length} article(s) by "${authorName}"${
				limit < CONFIG.MAX_LIMIT ? ` (showing up to ${limit})` : ''
			}.

				**Quick Reference:**
				${urlList}

				💡 **Try:** Filter by date range or search for specific topics.`;

			return {
				content: [
					{
						type: 'text',
						text: textOutput,
					},
				],
			};
		}
	);

	// Register list_recent_articles tool
	server.registerTool(
		'list_recent_articles',
		{
			title: 'List recent articles',
			description: 'Get the most recently published articles.',
			inputSchema: {
				limit: z
					.number()
					.optional()
					.default(CONFIG.DEFAULT_LIMIT)
					.describe('Maximum number of articles to return'),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ limit = CONFIG.DEFAULT_LIMIT }) => {
			const results = filterArticlesByDateRange(undefined, undefined, limit);
			const urlList = formatArticleUrlList(results);
			const textOutput = `Showing ${results.length} most recent article(s)${
				limit < CONFIG.MAX_LIMIT ? ` (limit: ${limit})` : ''
			}.

				**Quick Reference:**
				${urlList}

				💡 **Try:** Search by keyword, filter by author, or specify a date range.`;

			return {
				content: [
					{
						type: 'text',
						text: textOutput,
					},
				],
			};
		}
	);

	// Register get_article_preview tool
	server.registerTool(
		'get_article_preview',
		{
			title: 'Get article preview',
			description: 'Get a detailed preview of a specific article by its title.',
			inputSchema: {
				title: z.string().describe('The title of the article to preview'),
			},
			annotations: {
				readOnlyHint: true,
			},
			_meta: articlePreviewWidget
				? {
						'openai/outputTemplate': articlePreviewWidget.templateUri,
						'openai/toolInvocation/invoking': articlePreviewWidget.invoking,
						'openai/toolInvocation/invoked': articlePreviewWidget.invoked,
				  }
				: {},
		},
		async ({ title }) => {
			const results = searchArticlesByTitle(title, 1);
			const article = results.length > 0 ? results[0] : null;

			if (!article) {
				return {
					content: [
						{
							type: 'text',
							text: `Article with title "${title}" not found. Try using the search_articles tool first to find the correct article.`,
						},
					],
				};
			}

			if (articlePreviewWidget) {
				const widgetPayload = createArticlePreviewWidgetPayload(article);

				const textOutput = `[Widget displayed above contains complete article preview - DO NOT generate additional summary or repeat any article content below]
				`;
				return {
					content: [
						{
							type: 'text',
							text: textOutput,
						},
					],
					structuredContent: widgetPayload,
					_meta: widgetInvocationMeta(articlePreviewWidget),
				};
			}

			// Fallback for non-widget clients
			const preview = formatArticlePreview(article);

			return {
				content: [
					{
						type: 'text',
						text: preview,
					},
				],
			};
		}
	);

	return server;
}

// Exported handler for both serverless and traditional server usage
export { getCorsHeaders } from './cors-utils.js';

export async function handleMcpRequest(req, res) {
	// Log request details for debugging
	console.log('[MCP] Request received:', {
		method: req.method,
		userAgent: req.headers['user-agent'],
		accept: req.headers.accept,
		hasMcpSessionId: !!req.headers['mcp-session-id'],
	});

	// For GET requests without mcp-session-id, return 200 OK (browser health check)
	if (req.method === 'GET' && !req.headers['mcp-session-id']) {
		res.writeHead(200, {
			'content-type': 'text/plain',
			...getCorsHeaders(req.headers?.origin),
		});
		res.end(
			'Unic.com MCP server is running. Connect via an MCP client (e.g., ChatGPT) to use the search tool.'
		);
		return;
	}

	// Ensure SSE accept header is present for streaming transport
	ensureStreamableAccept(req);

	// Set CORS headers on the response
	const corsHeaders = getCorsHeaders(req.headers?.origin, {
		'Access-Control-Expose-Headers': 'Mcp-Session-Id',
	});
	Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

	// Lazy-initialize widgets before creating the server
	ensureWidgetsInitialized();

	const server = createBlogServer();
	const transport = new StreamableHTTPServerTransport({
		enableJsonResponse: true,
	});

	// Cleanup on response close
	res.on('close', () => {
		transport.close();
		server.close();
	});

	try {
		await server.connect(transport);
		// Pass req.body as parsedBody - Vercel pre-parses the request body
		// If req.body exists (Vercel serverless), pass it; otherwise the transport reads from stream
		await transport.handleRequest(req, res, req.body);
	} catch (error) {
		console.error('[MCP] Error handling request:', error);
		if (!res.headersSent) {
			res.writeHead(500).end('Internal server error');
		}
	}
}

const MCP_METHODS = new Set(['POST', 'GET', 'DELETE']);

async function startServer() {
	// Initialize widgets for local server
	ensureWidgetsInitialized();

	const portEnv = Number(process.env.PORT ?? DEFAULT_PORT);
	const port = Number.isFinite(portEnv) ? portEnv : DEFAULT_PORT;
	const MCP_PATH = process.env.MCP_PATH ?? '/mcp';

	const httpServer = createServer(async (req, res) => {
		if (!req.url) {
			res.writeHead(400).end('Missing URL');
			return;
		}

		const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

		if (req.method === 'OPTIONS' && url.pathname.startsWith(MCP_PATH)) {
			const requestedHeaders = req.headers?.['access-control-request-headers'];
			res.writeHead(204, {
				...getCorsHeaders(req.headers?.origin, {
					'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': requestedHeaders || 'content-type, mcp-session-id',
					'Access-Control-Expose-Headers': 'Mcp-Session-Id',
				}),
			});
			res.end();
			return;
		}

		if (req.method === 'GET' && url.pathname === '/') {
			res.writeHead(200, { 'content-type': 'text/plain' }).end('Unic.com MCP server');
			return;
		}

		if (url.pathname.startsWith(MCP_PATH) && req.method && MCP_METHODS.has(req.method)) {
			await handleMcpRequest(req, res);
			return;
		}

		res.writeHead(404).end('Not Found');
	});

	httpServer.on('clientError', (err, socket) => {
		console.error('HTTP client error', err);
		socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
	});

	httpServer.listen(port, () => {
		console.log(`Unic.com MCP server listening on http://localhost:${port}${MCP_PATH}`);
		console.log(`  Server loaded ${magazineArticles.length} articles`);
		console.log(`  Press Ctrl+C to shut down`);
	});
}

// Only start server if this file is run directly
const mainArg = process.argv[1];
const isMain =
	typeof mainArg === 'string' &&
	mainArg.length > 0 &&
	pathToFileURL(path.resolve(mainArg)).href === import.meta.url;

if (isMain) {
	startServer();
}
