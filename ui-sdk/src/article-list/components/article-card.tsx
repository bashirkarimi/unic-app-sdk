import { ArrowRight } from '@openai/apps-sdk-ui/components/Icon';
import { Article } from '../../types';

interface ArticleCardProps {
	article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
	return (
		<a href={article.url} className="group block" aria-label={`Read article: ${article.title}`}>
			<article className="flex gap-4 py-4 ">
				<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-muted">
					<img
						src={article.heroUrl || '/placeholder.svg'}
						alt={article.title}
						className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				</div>

				<div className="flex flex-col justify-center min-w-0">
					<h3 className="text-md font-semibold leading-snug group-hover:theme-entity-accent transition-colors line-clamp-2">
						{article.title}
					</h3>
					{article.lead && <p className="mt-1 text-md line-clamp-1">{article.lead}</p>}
					<div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
						<span>{article.author}</span>
						<span>·</span>
						<span>
							{new Date(article.publicationDate)
								.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
								.replace(/\//g, '-')}
						</span>
						<span className="text-gray-400 ml-auto mr-4 group-hover:translate-x-1 group-hover:text-black transition-all">
							<ArrowRight width="20px" height="20px" />
						</span>
					</div>
				</div>
			</article>
		</a>
	);
};
export default ArticleCard;
