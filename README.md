# Unic Apps SDK widgets and MCP server

This package bundles the Unic.com Apps SDK widgets and the companion MCP server that lets ChatGPT search and preview Unic Magazine content. The build produces hashed, self-contained assets that can be served locally or deployed, and the MCP server exposes Unic articles as tools and resources over Server-Sent Events.

## What’s inside

- UI widgets built with Vite and React in [packages/app-sdk/src/*](packages/app-sdk/src/*).
- Build orchestration in [packages/app-sdk/build-all.mts](packages/app-sdk/build-all.mts) that emits hashed `.js`, `.css`, and `.html` bundles into [packages/app-sdk/assets](packages/app-sdk/assets).
- MCP server for Unic Magazine search in [packages/app-sdk/mcp-server/src/server.ts](packages/app-sdk/mcp-server/src/server.ts) backed by [packages/app-sdk/blogposts.en.json](packages/app-sdk/blogposts.en.json).

## Prerequisites

- Node.js 18+
- pnpm 10.x (workspace uses pnpm; npm/yarn will need adjustments)

## Install dependencies

From the repository root:

```bash
pnpm install
```

## Build and serve widget assets

```bash
pnpm --filter unic-app-sdk build        # bundle widgets with Vite
pnpm --filter unic-app-sdk serve        # serve assets on http://localhost:4444 with CORS enabled
```

Notes:

- The build script uses the package version to hash filenames. It emits both hashed and non-hashed HTML so MCP servers can fetch stable URLs.
- Set `BASE_URL` to the public origin that will host the assets (defaults to `http://localhost:4444`).

## Local development

- Widget dev server: `pnpm --filter unic-app-sdk dev`
- Host-mode dev (for embedding in another host shell): `pnpm --filter unic-app-sdk dev:host`
- Type checks: `pnpm --filter unic-app-sdk tsc` or the per-target commands in [packages/app-sdk/package.json](packages/app-sdk/package.json).

## Run the Unic MCP server

```bash
pnpm --filter unic-mcp-server start
```

The server listens on `PORT` (default `8001`) and exposes:

- SSE stream at `GET /mcp`
- Message POST endpoint at `POST /mcp/messages?sessionId=...`

Tools available via the server:

- `search_articles` – keyword search across title, lead, and author
- `filter_articles_by_date` – date range filtering
- `filter_articles_by_author` – author search
- `list_recent_articles` – latest articles (newest first)
- `get_article_preview` – formatted preview by slug

## Using with ChatGPT (Apps SDK)

1. Build and serve assets so they are reachable at your `BASE_URL`.
2. Start the MCP server and note the SSE endpoint.
3. In ChatGPT Developer Mode, add a connector that points to the MCP server’s SSE endpoint. The widgets will load from the asset host you configured.

## Customization tips


- Replace or enrich article data in [packages/app-sdk/blogposts.en.json](packages/app-sdk/blogposts.en.json). Entries with missing slugs or titles are filtered out at load time for cleaner tool responses.
- Adjust build outputs or CSS bundling behavior inside [packages/app-sdk/build-all.mts](packages/app-sdk/build-all.mts).


