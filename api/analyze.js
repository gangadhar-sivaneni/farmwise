// Vercel serverless function: POST /api/analyze (Gemini crop scan). Same handler the Vite dev server uses.
import { createApiMiddleware } from '../server/apiHandler.js';

const handle = createApiMiddleware(() => process.env.GEMINI_API_KEY || '');

export default function handler(req, res) {
  return handle(req, res, () => { res.statusCode = 404; res.end(); });
}
