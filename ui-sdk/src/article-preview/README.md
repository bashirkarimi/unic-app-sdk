# Article Preview Widget

A rich UI widget for displaying a detailed preview of a single Unic magazine article.

## Features

- **Hero Image Display**: Shows the article's featured image with alt text
- **Rich Typography**: Professional layout with proper heading hierarchy
- **Metadata Display**: Publication date and author information with icons
- **Summary/Lead**: Article summary with optimal spacing
- **Call-to-Action**: Clear link to read the full article
- **Responsive Design**: Adapts to different screen sizes and display modes
- **Accessibility**: Proper semantic HTML and ARIA labels

## Components

### `ArticlePreviewCard`

The main card component that renders a single article with:

- Hero image (if available)
- Article title (h2)
- Author and publication date with icons
- Lead/summary text
- "Read full article" link with hover effects

### `ArticlePreviewWidget`

The widget wrapper that:

- Loads props from the MCP host
- Handles loading states
- Normalizes article data
- Renders the preview card

### `article-helpers.ts`

Utility functions for:

- `normalizeArticle`: Ensures all required article fields exist with defaults
- `parseHostPayload`: Validates and parses the widget payload from the host

## Usage in MCP Server

The widget is automatically used by the `get_article_preview` tool when:

1. The widget assets are built (`pnpm build`)
2. The MCP server successfully loads the widget on startup
3. A client requests article preview with widget support

### Example Tool Response

```typescript
{
  content: [{ type: 'text', text: '**Article Title**\n...' }],
  structuredContent: {
    heading: 'Article Preview',
    article: {
      slug: 'example-article',
      title: 'Example Article',
      lead: 'This is the summary...',
      author: 'John Doe',
      publicationDate: '2024-01-15T00:00:00.000Z',
      url: 'https://www.unic.com/en/magazine/example-article',
      heroUrl: 'https://example.com/hero.jpg',
      heroAlt: 'Hero image description'
    },
    generatedAt: '2024-01-15T10:30:00.000Z'
  },
  _meta: {
    'openai/toolInvocation/invoking': 'Loading article preview',
    'openai/toolInvocation/invoked': 'Article preview ready'
  }
}
```

## Styling

Uses the same design system as `article-list` widget:

- Tailwind CSS utilities
- OpenAI Apps SDK UI components (icons)
- Theme-aware colors
- Smooth transitions and hover effects

## Icons

- `User`: Author information
- `Calendar`: Publication date
- `ArrowRight`: Call-to-action link indicator
