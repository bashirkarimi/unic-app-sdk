import fs from 'node:fs';

export const CONFIG = {
	DEFAULT_PORT: 8001,
	DEFAULT_LIMIT: 10,
	MAX_LIMIT: 100,
	BLOG_DATA_PATH: '',
	UI_ASSETS_DIR: '',
};

export let magazineArticles = [];
export const articlesBySlug = new Map();

/**
 * Validates that a date string is in valid ISO format
 * @param dateString - The date string to validate
 * @returns true if the date is valid
 */
export function isValidDate(dateString) {
	const date = new Date(dateString);
	return !isNaN(date.getTime());
}

/**
 * Validates that a slug contains only allowed characters
 * @param slug - The slug to validate
 * @returns true if the slug is valid
 */
export function isValidSlug(slug) {
	return /^[a-z0-9-]+$/i.test(slug);
}

/**
 * Clamps a limit value between valid bounds
 * @param limit - The requested limit
 * @returns Clamped limit value
 */
export function clampLimit(limit) {
	if (limit === undefined) return CONFIG.DEFAULT_LIMIT;
	return Math.min(Math.max(1, limit), CONFIG.MAX_LIMIT);
}

export function isLoadedArticle(article) {
	const slug = article.slug?.trim();
	const title = article.title?.trim();
	const publicationDate = article.publicationDate?.trim();
	return Boolean(slug && title && publicationDate && !Number.isNaN(Date.parse(publicationDate)));
}

export function getAuthorRaw(article) {
	if (!article.author) {
		return null;
	}
	if (typeof article.author === 'string') {
		const trimmed = article.author.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	const name = article.author.name?.trim();
	return name && name.length > 0 ? name : null;
}

export function getAuthorName(article) {
	return getAuthorRaw(article) ?? 'Editorial team';
}

export function authorMatches(article, lowerQuery) {
	const name = getAuthorRaw(article);
	return name ? name.toLowerCase().includes(lowerQuery) : false;
}

export function extractHeroMedia(article) {
	const asset = article.keyvisual?.cloudinaryAsset?.[0];
	const heroUrl = article.heroUrl?.trim() || asset?.url?.trim() || undefined;
	const heroAlt = article.heroAlt?.trim() || asset?.alt?.trim() || undefined;

	return { heroUrl, heroAlt };
}

/**
 * Loads magazine articles from JSON file and builds lookup indices
 * @throws {Error} If file read or JSON parsing fails
 */
export function loadMagazineArticles(blogDataPath) {
	try {
		if (!fs.existsSync(blogDataPath)) {
			throw new Error(`Blog data file not found: ${blogDataPath}`);
		}
		const data = fs.readFileSync(blogDataPath, 'utf8');
		const articles = JSON.parse(data);
		magazineArticles = articles.filter(isLoadedArticle).map((article) => {
			const slug = article.slug.trim();
			const title = article.title.trim();
			const publicationDate = article.publicationDate.trim();

			return {
				...article,
				slug,
				title,
				publicationDate,
			};
		});

		// Build slug lookup index
		articlesBySlug.clear();
		magazineArticles.forEach((article) => {
			articlesBySlug.set(article.slug, article);
		});

		console.log(`Loaded ${magazineArticles.length} blog articles`);
	} catch (error) {
		console.error('Failed to load blog articles:', error);
		if (error instanceof Error) {
			console.error('Error details:', error.message);
		}
		magazineArticles = [];
		articlesBySlug.clear();
		throw error; // Re-throw to prevent server start with no data
	}
}

/**
 * Search articles by keyword in title, lead, or author name
 * @param query - Search keyword or phrase
 * @param limit - Maximum number of results (default: 10, max: 100)
 * @returns Array of matching articles
 */
export function searchArticles(query, limit = CONFIG.DEFAULT_LIMIT) {
	const clampedLimit = clampLimit(limit);
	const lowerQuery = query.toLowerCase();
	return magazineArticles
		.filter((article) => {
			const titleMatch = article.title?.toLowerCase().includes(lowerQuery);
			const leadMatch = article.lead?.toLowerCase().includes(lowerQuery);
			const authorMatch = authorMatches(article, lowerQuery);
			return titleMatch || leadMatch || authorMatch;
		})
		.slice(0, clampedLimit);
}

/**
 * Search articles by keyword in title only
 * @param query - Search keyword or phrase
 * @param limit - Maximum number of results (default: 10, max: 100)
 * @returns Array of matching articles
 */
export function searchArticlesByTitle(query, limit = CONFIG.DEFAULT_LIMIT) {
	const clampedLimit = clampLimit(limit);
	const lowerQuery = query.toLowerCase();
	return magazineArticles
		.filter((article) => article.title?.toLowerCase().includes(lowerQuery))
		.slice(0, clampedLimit);
}

/**
 * Filter articles by publication date range
 * @param startDate - Start date in ISO format (YYYY-MM-DD) - optional
 * @param endDate - End date in ISO format (YYYY-MM-DD) - optional
 * @param limit - Maximum number of results (default: 10, max: 100)
 * @returns Array of articles sorted by date (newest first)
 * @throws {Error} If date format is invalid
 */
export function filterArticlesByDateRange(startDate, endDate, limit = CONFIG.DEFAULT_LIMIT) {
	const clampedLimit = clampLimit(limit);
	let filtered = [...magazineArticles];

	if (startDate) {
		if (!isValidDate(startDate)) {
			throw new Error(`Invalid start date format: ${startDate}. Expected ISO format (YYYY-MM-DD)`);
		}
		const start = new Date(startDate);
		filtered = filtered.filter((article) => new Date(article.publicationDate) >= start);
	}

	if (endDate) {
		if (!isValidDate(endDate)) {
			throw new Error(`Invalid end date format: ${endDate}. Expected ISO format (YYYY-MM-DD)`);
		}
		const end = new Date(endDate);
		filtered = filtered.filter((article) => new Date(article.publicationDate) <= end);
	}

	// Sort by date descending (newest first)
	filtered.sort(
		(a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
	);

	return filtered.slice(0, clampedLimit);
}

/**
 * Filter articles by author name
 * @param authorName - Author name or partial name to search for
 * @param limit - Maximum number of results (default: 10, max: 100)
 * @returns Array of articles by the author, sorted by date (newest first)
 */
export function filterArticlesByAuthor(authorName, limit = CONFIG.DEFAULT_LIMIT) {
	const clampedLimit = clampLimit(limit);
	const lowerAuthor = authorName.toLowerCase();
	return magazineArticles
		.filter((article) => authorMatches(article, lowerAuthor))
		.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime())
		.slice(0, clampedLimit);
}

/**
 * Format article as a rich preview with metadata
 * @param article - The article to format
 * @returns Formatted markdown string with article details
 */
export function formatArticlePreview(article) {
	const date = new Date(article.publicationDate).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return `**${article.title}**

    📅 Published: ${date}
    ✍️ Author: ${getAuthorName(article)}
    🔗 Read full article: ${article.link}

    ${article.lead || 'No summary available.'}`;
}

/**
 * Format a list of articles as markdown
 * @param articles - Array of articles to format
 * @returns Formatted markdown string with numbered list
 */
export function formatArticleList(articles) {
	if (articles.length === 0) {
		return 'No articles found.';
	}

	return articles
		.map((article, index) => {
			const date = new Date(article.publicationDate).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
			return `${index + 1}. **${article.title}**
        📅 ${date} | ✍️ ${getAuthorName(article)}
        🔗 Read more: ${article.link}`;
		})
		.join('\n\n');
}

/**
 * Format articles as a concise list with URLs for quick reference
 * Used as text companion below the visual widget
 * @param articles - Array of articles to format
 * @returns Simplified list with titles and URLs
 */
export function formatArticleUrlList(articles) {
	if (articles.length === 0) {
		return 'No articles found.';
	}

	return articles
		.map((article, index) => {
			const date = new Date(article.publicationDate).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
			});
			return `${index + 1}. ${article.title} (${date}) - ${article.link}`;
		})
		.join('\n');
}
