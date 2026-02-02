const isDevelopment = process.env.NODE_ENV !== 'production';

const DEFAULT_ALLOWED_ORIGINS = ['https://chatgpt.com', 'https://chat.openai.com'];

/**
 * Resolves the appropriate CORS origin based on environment and configuration
 * @param requestOrigin - The origin from the request headers
 * @returns The allowed origin to use in CORS headers
 */
export function resolveAllowedOrigin(requestOrigin) {
	if (isDevelopment) {
		return requestOrigin || '*';
	}

	const allowedOriginEnv = process.env.ALLOWED_ORIGIN?.trim();

	if (allowedOriginEnv) {
		const allowedOrigins = allowedOriginEnv
			.split(',')
			.map((origin) => origin.trim())
			.filter((origin) => origin.length > 0);

		if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
			return requestOrigin;
		}

		return allowedOrigins[0] || DEFAULT_ALLOWED_ORIGINS[0];
	}

	if (requestOrigin && DEFAULT_ALLOWED_ORIGINS.includes(requestOrigin)) {
		return requestOrigin;
	}

	return DEFAULT_ALLOWED_ORIGINS[0];
}

/**
 * Generates CORS headers for HTTP responses
 * @param requestOrigin - The origin from the request headers
 * @param additionalHeaders - Additional headers to merge with CORS headers
 * @returns Complete CORS headers object
 */
export function getCorsHeaders(requestOrigin, additionalHeaders = {}) {
	const allowedOrigin = resolveAllowedOrigin(requestOrigin);
	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		...(allowedOrigin === '*' ? {} : { 'Access-Control-Allow-Credentials': 'true' }),
		Vary: 'Origin',
		...additionalHeaders,
	};
}

/**
 * Ensures the request accepts Server-Sent Events (SSE) for MCP transport
 * Some hosting proxies drop the Accept header, so we force text/event-stream
 * @param req - HTTP request object
 */
export function ensureStreamableAccept(req) {
	const rawAccept = req?.headers?.accept;
	const accept = Array.isArray(rawAccept) ? rawAccept.join(',') : rawAccept;

	if (!accept) {
		req.headers.accept = 'text/event-stream';
		return;
	}

	const normalized = accept.toLowerCase();
	if (normalized.includes('text/event-stream')) {
		return;
	}

	if (normalized.trim() === '*/*') {
		req.headers.accept = 'text/event-stream';
		return;
	}

	req.headers.accept = `${accept}, text/event-stream`;
}
