import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type MagazineArticle = {
  slug: string | null;
  title: string | null;
  publicationDate: string;
  lead: string | null;
  author: {
    name: string;
  };
  keyvisual?: Record<string, any>;
  body?: Record<string, any> | null;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const BLOG_DATA_PATH = path.join(ROOT_DIR, "blogposts.en.json");

let magazineArticles: MagazineArticle[] = [];

function loadmagazineArticles(): void {
  try {
    const data = fs.readFileSync(BLOG_DATA_PATH, "utf8");
    const articles = JSON.parse(data);
    // Filter out articles with null slug or title for better usability
    magazineArticles = articles.filter(
      (article: MagazineArticle) => article.slug && article.title
    );
    console.log(`Loaded ${magazineArticles.length} blog articles`);
  } catch (error) {
    console.error("Failed to load blog articles:", error);
    magazineArticles = [];
  }
}

// Load articles on startup
loadmagazineArticles();

// Search articles by keyword (in title, lead, or author name)
function searchArticles(query: string, limit: number = 10): MagazineArticle[] {
  const lowerQuery = query.toLowerCase();
  return magazineArticles
    .filter((article) => {
      const titleMatch = article.title?.toLowerCase().includes(lowerQuery);
      const leadMatch = article.lead?.toLowerCase().includes(lowerQuery);
      const authorMatch = article.author?.name
        ?.toLowerCase()
        .includes(lowerQuery);
      return titleMatch || leadMatch || authorMatch;
    })
    .slice(0, limit);
}

// Filter articles by date range
function filterArticlesByDateRange(
  startDate?: string,
  endDate?: string,
  limit: number = 10
): MagazineArticle[] {
  let filtered = [...magazineArticles];

  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter(
      (article) => new Date(article.publicationDate) >= start
    );
  }

  if (endDate) {
    const end = new Date(endDate);
    filtered = filtered.filter(
      (article) => new Date(article.publicationDate) <= end
    );
  }

  // Sort by date descending (newest first)
  filtered.sort(
    (a, b) =>
      new Date(b.publicationDate).getTime() -
      new Date(a.publicationDate).getTime()
  );

  return filtered.slice(0, limit);
}

// Filter articles by author
function filterArticlesByAuthor(
  authorName: string,
  limit: number = 10
): MagazineArticle[] {
  const lowerAuthor = authorName.toLowerCase();
  return magazineArticles
    .filter((article) =>
      article.author?.name?.toLowerCase().includes(lowerAuthor)
    )
    .sort(
      (a, b) =>
        new Date(b.publicationDate).getTime() -
        new Date(a.publicationDate).getTime()
    )
    .slice(0, limit);
}

// Get article by slug
function getArticleBySlug(slug: string): MagazineArticle | undefined {
  return magazineArticles.find((article) => article.slug === slug);
}

// Format article for display
function formatArticlePreview(article: MagazineArticle): string {
  const date = new Date(article.publicationDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `**${article.title}**

📅 Published: ${date}
✍️ Author: ${article.author.name}
🔗 Slug: ${article.slug}

${article.lead || "No summary available."}`;
}

// Format article list
function formatArticleList(articles: MagazineArticle[]): string {
  if (articles.length === 0) {
    return "No articles found.";
  }

  return articles
    .map((article, index) => {
      const date = new Date(article.publicationDate).toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short", day: "numeric" }
      );
      return `${index + 1}. **${article.title}**
    📅 ${date} | ✍️ ${article.author.name}
    🔗 ${article.slug}`;
    })
    .join("\n\n");
}

const tools: Tool[] = [
  {
    name: "search_articles",
    description:
      "Search blog articles by keyword. Searches in title, lead/summary, and author name.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword or phrase",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "filter_articles_by_date",
    description:
      "Filter blog articles by publication date range. Returns articles sorted by date (newest first).",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date in ISO format (YYYY-MM-DD) - optional",
        },
        endDate: {
          type: "string",
          description: "End date in ISO format (YYYY-MM-DD) - optional",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
    },
  },
  {
    name: "filter_articles_by_author",
    description: "Filter blog articles by author name.",
    inputSchema: {
      type: "object",
      properties: {
        authorName: {
          type: "string",
          description: "Author name or partial name to search for",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["authorName"],
    },
  },
  {
    name: "list_recent_articles",
    description:
      "List the most recent blog articles, sorted by publication date.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of articles to return (default: 10)",
          default: 10,
        },
      },
    },
  },
  {
    name: "get_article_preview",
    description:
      "Get a detailed preview of a specific blog article by its slug.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "The article slug identifier",
        },
      },
      required: ["slug"],
    },
  },
];

// Create resources for each article
function getResources(): Resource[] {
  return magazineArticles.map((article) => ({
    uri: `blog://article/${article.slug}`,
    name: article.title || "Untitled",
    description: article.lead || "No description available",
    mimeType: "application/json",
  }));
}

function createBlogServer(): Server {
  const server = new Server(
    {
      name: "unic-blog-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources: getResources(),
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const uri = request.params.uri;
      const match = uri.match(/^blog:\/\/article\/(.+)$/);

      if (!match) {
        throw new Error(`Invalid resource URI: ${uri}`);
      }

      const slug = match[1];
      const article = getArticleBySlug(slug);

      if (!article) {
        throw new Error(`Article not found: ${slug}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(article, null, 2),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_articles": {
            const { query, limit = 10 } = z
              .object({
                query: z.string(),
                limit: z.number().optional().default(10),
              })
              .parse(args);

            const results = searchArticles(query, limit);
            const formattedResults = formatArticleList(results);

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${results.length} article(s) matching "${query}":\n\n${formattedResults}`,
                },
              ],
            };
          }

          case "filter_articles_by_date": {
            const {
              startDate,
              endDate,
              limit = 10,
            } = z
              .object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                limit: z.number().optional().default(10),
              })
              .parse(args);

            const results = filterArticlesByDateRange(
              startDate,
              endDate,
              limit
            );
            const formattedResults = formatArticleList(results);

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${results.length} article(s):\n\n${formattedResults}`,
                },
              ],
            };
          }

          case "filter_articles_by_author": {
            const { authorName, limit = 10 } = z
              .object({
                authorName: z.string(),
                limit: z.number().optional().default(10),
              })
              .parse(args);

            const results = filterArticlesByAuthor(authorName, limit);
            const formattedResults = formatArticleList(results);

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${results.length} article(s) by "${authorName}":\n\n${formattedResults}`,
                },
              ],
            };
          }

          case "list_recent_articles": {
            const { limit = 10 } = z
              .object({
                limit: z.number().optional().default(10),
              })
              .parse(args ?? {});

            const results = filterArticlesByDateRange(
              undefined,
              undefined,
              limit
            );
            const formattedResults = formatArticleList(results);

            return {
              content: [
                {
                  type: "text",
                  text: `Recent articles:\n\n${formattedResults}`,
                },
              ],
            };
          }

          case "get_article_preview": {
            const { slug } = z
              .object({
                slug: z.string(),
              })
              .parse(args);

            const article = getArticleBySlug(slug);
            if (!article) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Article with slug "${slug}" not found.`,
                  },
                ],
              };
            }

            const preview = formatArticlePreview(article);

            return {
              content: [
                {
                  type: "text",
                  text: preview,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        throw error;
      }
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createBlogServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8001);
const port = Number.isFinite(portEnv) ? portEnv : 8001;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Unic.com MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
