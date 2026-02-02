import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ArticlePreviewWidget from './article-preview-widget';

const ROOT_ID = 'article-preview-root';

export function App() {
	return <ArticlePreviewWidget />;
}

const container = document.getElementById(ROOT_ID);

if (container && !container.dataset.mounted) {
	const root = createRoot(container);
	root.render(
		<StrictMode>
			<App />
		</StrictMode>
	);
	container.dataset.mounted = 'true';
}

export default ArticlePreviewWidget;
