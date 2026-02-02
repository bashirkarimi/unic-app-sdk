import { useMemo } from 'react';
import { useWidgetProps } from '../use-widget-props';
import ArticleCard from './components/article-card';
import { ArticleListWidgetProps } from '../types';
import { normalizeArticles, getFallbackArticles, parseHostPayload } from './article-helpers';

import '../index.css';

const DEFAULT_WIDGET_PAYLOAD: ArticleListWidgetProps = {
	articles: [],
};

export default function ArticleListWidget() {
	const rawHostPayload = useWidgetProps<ArticleListWidgetProps>(() => DEFAULT_WIDGET_PAYLOAD);
	const hostPayload = useMemo(
		() => parseHostPayload(rawHostPayload) ?? DEFAULT_WIDGET_PAYLOAD,
		[rawHostPayload]
	);

	const articles = useMemo(() => {
		// Use host articles if they exist and have items, otherwise use fallback
		const hasHostArticles = Array.isArray(hostPayload.articles) && hostPayload.articles.length > 0;
		const base = hasHostArticles ? normalizeArticles(hostPayload.articles) : getFallbackArticles();
		return [...base].sort(
			(a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
		);
	}, [hostPayload.articles]);

	const heading = hostPayload.heading ?? null;
	const responseSummary = hostPayload.summary ?? null;

	return (
		<section className="article-widget px-3 mx-auto" aria-live="polite">
			<div>
				{heading ? <h3>{heading}</h3> : null}
				{responseSummary ? <small>{responseSummary}</small> : null}
			</div>

			{articles.length === 0 ? (
				<div className="text-center py-6 text-info-surface">Loading ...</div>
			) : (
				<ol className="mt-4">
					{articles.map((article) => {
						return (
							<li key={article.slug}>
								<ArticleCard article={article} />
							</li>
						);
					})}
				</ol>
			)}
		</section>
	);
}
