import { ArrowRight, Calendar, User } from '@openai/apps-sdk-ui/components/Icon';
import { Article } from '../../types';

interface ArticlePreviewCardProps {
	article: Article;
}

const ArticlePreviewCard = ({ article }: ArticlePreviewCardProps) => {
	const formattedDate = new Date(article.publicationDate).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return (
		<article className="overflow-hidden rounded-sm border border-primary-outline bg-card">
			{article.heroUrl && (
				<div className="relative aspect-[2/1] w-full overflow-hidden bg-muted">
					<img
						src={article.heroUrl}
						alt={article.heroAlt || article.title}
						className="h-full w-full object-cover"
					/>
				</div>
			)}

			<div className="p-6">
				<h2 className="text-2xl font-bold leading-tight mb-4">{article.title}</h2>

				<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
					<div className="flex items-center gap-2">
						<User width="16px" height="16px" />
						<span>{article.author}</span>
					</div>
					<div className="flex items-center gap-2">
						<Calendar width="16px" height="16px" />
						<span>{formattedDate}</span>
					</div>
				</div>

				{article.lead && (
					<p className="text-base text-foreground leading-relaxed mb-6">{article.lead}</p>
				)}

				<a
					href={article.url}
					className="group inline-flex items-center gap-2 text-md font-medium theme-entity-accent hover:underline transition-all"
					aria-label={`Read full article: ${article.title}`}
				>
					<span>Read full article</span>
					<ArrowRight
						width="20px"
						height="20px"
						className="group-hover:translate-x-1 transition-transform"
					/>
				</a>
			</div>
		</article>
	);
};

export default ArticlePreviewCard;
