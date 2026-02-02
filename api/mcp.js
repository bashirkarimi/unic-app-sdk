// Thin adapter for Vercel serverless deployment
// Imports the shared MCP handler from the main server file
import { handleMcpRequest, getCorsHeaders } from '../mcp-server/src/server.js';

// Serverless function handler for Vercel
export default async function handler(req, res) {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		const requestedHeaders = req.headers?.['access-control-request-headers'];
		const corsHeaders = getCorsHeaders(req.headers?.origin, {
			'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': requestedHeaders || 'content-type, mcp-session-id',
			'Access-Control-Expose-Headers': 'Mcp-Session-Id',
		});
		Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
		return res.status(204).end();
	}

	const MCP_METHODS = new Set(['POST', 'GET', 'DELETE']);
	if (!req.method || !MCP_METHODS.has(req.method)) {
		return res.status(405).end('Method Not Allowed');
	}

	// Delegate to the shared handler
	try {
		await handleMcpRequest(req, res);
	} catch (error) {
		console.error('[API] Error:', error);
		if (!res.headersSent) {
			res.status(500).json({
				error: 'Internal server error',
				message: error.message,
			});
		}
	}
}
