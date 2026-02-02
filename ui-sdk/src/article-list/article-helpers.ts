import { Article, RawArticle, ArticleInput, ArticleListWidgetProps } from '../types';
import rawArticles from '../../../blogposts.en.json';

export function normalizeArticles(list?: ArticleInput[]): Article[] {
	if (!Array.isArray(list)) {
		return [];
	}

	return list
		.map((item) => {
			if (isArticle(item)) {
				return item;
			}

			return transformRawArticle(item as RawArticle);
		})
		.filter((item): item is Article => Boolean(item));
}

let cachedFallbackArticles: Article[] | null = null;
export function getFallbackArticles(): Article[] {
	// Check if running on localhost
	if (typeof window !== 'undefined') {
		const isLocalhost = window.location.hostname === 'localhost';

		if (isLocalhost && !cachedFallbackArticles) {
			cachedFallbackArticles = normalizeArticles(rawArticles as ArticleInput[]).slice(0, 3);
		}

		return cachedFallbackArticles || [];
	}

	return [];
}

function transformRawArticle(raw: RawArticle | undefined): Article | null {
	if (!raw) return null;

	const slug = raw.slug?.trim();
	const title = raw.title?.trim();
	const publicationDate = raw.publicationDate ?? undefined;
	if (!slug || !title || !publicationDate) {
		return null;
	}

	if (Number.isNaN(Date.parse(publicationDate))) {
		return null;
	}

	const lead = raw.lead?.trim() ?? '';
	const authorName =
		typeof raw.author === 'string' ? raw.author : raw.author?.name?.trim() ?? 'Editorial team';
	const heroAsset = raw.keyvisual?.cloudinaryAsset?.[0];
	const heroUrl = raw.heroUrl ?? heroAsset?.url ?? undefined;
	const heroAlt = raw.heroAlt ?? heroAsset?.alt ?? undefined;
	// Use link from CMS, or generate URL from slug as fallback
	const url = raw.link?.trim() || `https://www.unic.com/en/magazine/${slug}`;

	return {
		id: slug,
		slug,
		title,
		lead,
		author: authorName,
		publicationDate,
		url,
		heroUrl,
		heroAlt,
	};
}

function isArticle(value: ArticleInput): value is Article {
	return (
		typeof (value as Article)?.id === 'string' &&
		typeof (value as Article)?.slug === 'string' &&
		typeof (value as Article)?.title === 'string' &&
		typeof (value as Article)?.publicationDate === 'string' &&
		typeof (value as Article)?.url === 'string'
	);
}


export function parseHostPayload(
	input: ArticleListWidgetProps | null | undefined
): ArticleListWidgetProps | null {
	if (!input) {
		return null;
	}

	// Direct widget payload (from structuredContent)
	if (isWidgetPayload(input)) {
		return input;
	}

	return null;
}

function isWidgetPayload(value: unknown): value is ArticleListWidgetProps {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const payload = value as ArticleListWidgetProps;
	return Array.isArray(payload.articles) || typeof payload.summary === 'string';
}
