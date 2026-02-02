import type { Article, ArticleInput, ArticlePreviewWidgetProps } from '../types';

/**
 * Normalize a single article to ensure required fields exist
 */
export function normalizeArticle(input: ArticleInput): Article {
	const article = input as Partial<Article>;
	return {
		id: article.id ?? 'unknown',
		slug: article.slug ?? 'unknown',
		title: article.title ?? 'Untitled',
		lead: article.lead ?? '',
		author: article.author ?? 'Unknown Author',
		publicationDate: article.publicationDate ?? new Date().toISOString(),
		url: article.url ?? '#',
		heroUrl: article.heroUrl,
		heroAlt: article.heroAlt,
	};
}

/**
 * Parse and validate the host payload
 */
export function parseHostPayload(payload: unknown): ArticlePreviewWidgetProps | null {
	if (!payload || typeof payload !== 'object') return null;
	const obj = payload as Record<string, unknown>;

	return {
		article: obj.article && typeof obj.article === 'object' ? (obj.article as ArticleInput) : null,
		heading: typeof obj.heading === 'string' ? obj.heading : undefined,
	};
}

export const fallback = {
	heading: 'Article Preview',
	article: {
		id: 'fallback-article',
		slug: 'frontend-first-api-mocking',
		title: 'Frontend First API Mocking',
		lead: 'Mocking a whole API is realistically very valuable, especially in agile projects, where you work closely with the client, or in headless projects, where a REST or GraphQL API is the main communication interface between the frontend and the backend. Great API mocking can make testing easier and reveal UI and UX problems early in a project. Because we weren’t happy with current services and libraries, we’ve built a new service to fulfil our needs. You can check it out over here—it’s called FakeQL.\n\nIn this post, I will explain what good API mocking should be able to do, why API mocking is important and how client projects can take advantage of this new tooling. The goal is to create better products, make clients happier and reduce project costs.',
		author: 'Fredi Bach',
		publicationDate: '2019-09-12T00:00:00.000Z',
		url: 'https://www.unic.com/en/magazine/frontend-first-api-mocking',
		heroUrl:
			'http://res.cloudinary.com/unic-cloudinary/image/upload/v1645086157/03-kompetenz/kompetenzen-marketing-automation.jpg',
		heroAlt: 'Marketing automation competencies illustration',
	},
	generatedAt: '2026-01-26T15:38:48.465Z',
};
