# Unic Blog MCP Server

A **Model Context Protocol (MCP)** server that enables ChatGPT to discover, search, and display rich previews of blog articles from `blogposts.en.json`.

## 🎯 Features

### 1. Content Discovery & Navigation

The server provides multiple tools for discovering and navigating blog content:

- **Search Articles** - Search by keyword in titles, summaries, and author names
- **Filter by Date** - Find articles within a specific date range
- **Filter by Author** - Find all articles by a specific author
- **List Recent** - Get the most recently published articles
- **Get Preview** - Get detailed information about a specific article

### 2. Rich Article Previews

Each article preview includes:

- **Title** - Full article title with formatting
- **Publication Date** - Formatted publication date
- **Author** - Author name
- **Slug** - Article identifier
- **Lead/Summary** - Article summary or introduction

## 📦 Installation

```bash
cd unic-server
pnpm install
```

## 🚀 Running the Server

### Start the server (default port 8001)

```bash
pnpm start
```

### Development mode with auto-reload

```bash
pnpm dev
```

### Custom port

```bash
PORT=9000 pnpm start
```

### Server Endpoints

Once running, the server provides:

- **SSE Stream**: `GET http://localhost:8001/mcp`
- **Message Endpoint**: `POST http://localhost:8001/mcp/messages?sessionId=...`

## 🛠️ Available Tools

### `search_articles`

Search blog articles by keyword.

**Parameters:**

- `query` (required) - Search keyword or phrase
- `limit` (optional) - Maximum results to return (default: 10)

**Example:**

```json
{
  "query": "artificial intelligence",
  "limit": 5
}
```

### `filter_articles_by_date`

Filter articles by publication date range.

**Parameters:**

- `startDate` (optional) - Start date in ISO format (YYYY-MM-DD)
- `endDate` (optional) - End date in ISO format (YYYY-MM-DD)
- `limit` (optional) - Maximum results to return (default: 10)

**Example:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "limit": 10
}
```

### `filter_articles_by_author`

Filter articles by author name.

**Parameters:**

- `authorName` (required) - Author name or partial name
- `limit` (optional) - Maximum results to return (default: 10)

**Example:**

```json
{
  "authorName": "Philippe Surber",
  "limit": 5
}
```

### `list_recent_articles`

List the most recent articles.

**Parameters:**

- `limit` (optional) - Maximum results to return (default: 10)

**Example:**

```json
{
  "limit": 10
}
```

### `get_article_preview`

Get detailed preview of a specific article.

**Parameters:**

- `slug` (required) - Article slug identifier

**Example:**

```json
{
  "slug": "ai-agents-are-coming-how-to-get-your-website-ready"
}
```

## 📚 Resources

The server exposes each blog article as a resource with the URI pattern:

```
blog://article/{slug}
```

**Example URIs:**

- `blog://article/ai-agents-are-coming-how-to-get-your-website-ready`
- `blog://article/hellobetty`
- `blog://article/9-years-of-holacracy-martin-kriegler-takes-stock`

Resources provide:

- **URI** - Unique identifier for the article
- **Name** - Article title
- **Description** - Article summary
- **Content** - Full article data in JSON format

## 💬 Integration with ChatGPT

### Example Natural Language Queries

Once connected to ChatGPT, you can use natural language:

**Search Examples:**

- "Find articles about artificial intelligence"
- "Search for posts mentioning Holacracy"
- "What articles talk about digital transformation?"

**Filter by Date:**

- "Show me articles from December 2025"
- "Find blog posts published in 2025"
- "What articles were published between January and March 2025?"

**Filter by Author:**

- "Show me articles written by Philippe Surber"
- "Find all posts by Jörg Nölke"
- "What has Manfred Bacher written?"

**Recent Articles:**

- "What are the 10 most recent blog posts?"
- "Show me the latest articles"
- "List recent blog posts"

**Article Preview:**

- "Show me details about the article 'ai-agents-are-coming-how-to-get-your-website-ready'"
- "Get the preview for 'hellobetty'"
- "Display the article about holacracy"

## 📊 Article Data Structure

Each article includes:

```typescript
{
  slug: string;           // Unique identifier
  title: string;          // Article title
  publicationDate: string; // ISO date string
  lead: string;           // Summary/intro
  author: {
    name: string;         // Author name
  };
  keyvisual?: object;     // Optional image data
  body?: object;          // Optional full content
}
```

## 🎨 Example Article Preview

```markdown
**AI agents are coming: How to get your website ready**

📅 Published: February 3, 2025
✍️ Author: Marco Ghinolfi
🔗 Slug: ai-agents-are-coming-how-to-get-your-website-ready

Imagine this: A potential customer commissions a digital assistant to analyse
your products and compare them with those of the competition. This is not
science fiction - it will soon be part of everyday life, thanks to AI agents
like OpenAI's Operator.

With the introduction of such AI agents, it is becoming increasingly important
to optimise your website not only for humans, but also for digital assistants.
```

## 🏗️ Architecture

The server is built using:

- **Node.js** - Runtime environment
- **MCP SDK** - Model Context Protocol implementation
- **SSE Transport** - Server-Sent Events for real-time communication
- **Zod** - Schema validation for tool inputs
- **TypeScript** - Type-safe development

## 📁 Data Source

The server reads blog articles from:

```
../blogposts.en.json
```

Articles with null slugs or titles are automatically filtered out for better usability.

## 🔧 Troubleshooting

### Server not starting?

```bash
cd unic-server
pnpm install
pnpm start
```

### Port already in use?

Change the port:

```bash
PORT=9000 pnpm start
```

### Blog data not loading?

Verify the blogposts.en.json file exists in the parent directory:

```bash
ls -la ../blogposts.en.json
```

## 📝 Development

### Project Structure

```
unic-server/
├── src/
│   └── server.ts       # Main MCP server implementation
├── package.json        # Package configuration
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
```

### Technologies Used

- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **zod** - Runtime type validation
- **tsx** - TypeScript execution
- **TypeScript** - Type-safe JavaScript

## 📄 License

Private package for Unic internal use.
