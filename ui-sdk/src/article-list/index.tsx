import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ArticleListWidget from './article-list-widget';

const ROOT_ID = 'article-list-root';

export function App() {
	return <ArticleListWidget />;
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

export default ArticleListWidget;
