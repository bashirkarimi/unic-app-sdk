export type OpenAiGlobals<
	ToolInput = UnknownObject,
	ToolOutput = UnknownObject,
	ToolResponseMetadata = UnknownObject,
	WidgetState = UnknownObject
> = {
	// visuals
	theme: 'light' | 'dark';

	userAgent: {
		device: { type: 'mobile' | 'tablet' | 'desktop' | 'unknown' };
		capabilities: {
			hover: boolean;
			touch: boolean;
		};
	};
	locale: string;

	// layout
	maxHeight: number;
	displayMode: DisplayMode;
	safeArea: {
		insets: {
			top: number;
			bottom: number;
			left: number;
			right: number;
		};
	};

	// state
	toolInput: ToolInput;
	toolOutput: ToolOutput | null;
	toolResponseMetadata: ToolResponseMetadata | null;
	widgetState: WidgetState | null;
	setWidgetState: (state: WidgetState) => Promise<void>;
};

// currently copied from types.ts in chatgpt/web-sandbox.
// Will eventually use a public package.
type API = {
	callTool: (name: string, args: Record<string, unknown>) => Promise<{ result: string }>;
	sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
	openExternal(payload: { href: string }): void;

	// Layout controls
	requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
		/**
		 * The granted display mode. The host may reject the request.
		 * For mobile, PiP is always coerced to fullscreen.
		 */
		mode: DisplayMode;
	}>;
	requestModal: (args: { title?: string; params?: UnknownObject }) => Promise<unknown>;
	requestClose: () => Promise<void>;
};

export type UnknownObject = Record<string, unknown>;

/** Display mode */
export type DisplayMode = 'pip' | 'inline' | 'fullscreen';

/** Extra events */
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

/**
 * Global oai object injected by the web sandbox for communicating with chatgpt host page.
 */
declare global {
  interface Window {
    openai: API & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}


export interface Article {
	id: string;
	slug: string;
	title: string;
	lead: string;
	publicationDate: string;
	author: string;
	url: string;
	heroUrl?: string;
	heroAlt?: string;
	featured?: boolean;
}

export type RawArticle = {
	slug?: string | null;
	title?: string | null;
	publicationDate?: string | null;
	lead?: string | null;
	author?: { name?: string | null } | string | null;
	keyvisual?: {
		cloudinaryAsset?: Array<{
			url?: string | null;
			alt?: string | null;
		}> | null;
	} | null;
	heroUrl?: string | null;
	heroAlt?: string | null;

	/** Article URL from the CMS */
	link?: string | null;
};

export type ArticleInput = RawArticle | Article;

export type ArticleListWidgetProps = {
	heading?: string;
	articles?: ArticleInput[];
	summary?: string;
	total?: number;
	context?: Record<string, unknown>;
};

export type ArticlePreviewWidgetProps = {
	heading?: string;
	article?: ArticleInput | null;
};
