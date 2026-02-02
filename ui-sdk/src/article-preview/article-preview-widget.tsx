import { useMemo } from 'react';
import { useWidgetProps } from '../use-widget-props';
import ArticlePreviewCard from './components/article-preview-card';
import { ArticlePreviewWidgetProps } from '../types';
import { normalizeArticle, parseHostPayload } from './article-helpers';
import { fallback } from './article-helpers';

import '../index.css';

const DEFAULT_WIDGET_PAYLOAD: ArticlePreviewWidgetProps = {
	article: null,
};

export default function ArticlePreviewWidget() {
	const rawHostPayload = useWidgetProps<ArticlePreviewWidgetProps>(() => DEFAULT_WIDGET_PAYLOAD);
	const hostPayload = useMemo(
		() => parseHostPayload(rawHostPayload) ?? DEFAULT_WIDGET_PAYLOAD,
		[rawHostPayload]
	);

	const isLocalhost =
		typeof window !== 'undefined' &&
		(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

	const article = useMemo(() => {
		if (!hostPayload.article) {
			return isLocalhost ? fallback.article : null;
		}
		return normalizeArticle(hostPayload.article);
	}, [hostPayload.article, isLocalhost]);

	const heading = hostPayload.heading ?? null;


	return (
		<section className="article-widget px-3 mx-auto" aria-live="polite">
			{heading ? (
				<div className="mb-4">
					<h3>{heading}</h3>
				</div>
			) : null}

			{!article ? (
				<div className="text-center py-6 text-info-surface">Loading article preview...</div>
			) : (
				<ArticlePreviewCard article={article} />
			)}
		</section>
	);
}
