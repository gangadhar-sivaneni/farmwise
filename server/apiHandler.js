import { isKeyConfigured, analyzeImageWithGemini } from './geminiService.js';
import { verifyFirebaseToken } from './firebaseToken.js';

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'farmwise-be0bd';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Max 15 requests per minute
const rateLimitMap = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(key, entry);
    return false;
  }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}


/**
 * Node/Connect compatible middleware for handling FarmWise plant health API endpoints
 */
export function createApiMiddleware(getApiKey) {
  return async (req, res, next) => {
    const url = req.url?.split('?')[0];

    // No CORS headers: the app calls these endpoints from its own origin, so other websites can't use them

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Endpoint: Check API configuration status (does not expose key)
    if (url === '/api/config-status' && req.method === 'GET') {
      const apiKey = getApiKey();
      const configured = isKeyConfigured(apiKey);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({
        configured,
        message: configured
          ? 'Gemini API key is active for real-time analysis.'
          : 'GEMINI_API_KEY is not configured in .env.'
      }));
      return;
    }

    // Endpoint: Real-time analyze crop image
    if (url === '/api/analyze' && req.method === 'POST') {
      const apiKey = getApiKey();
      const configured = isKeyConfigured(apiKey);

      if (!configured) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY is not configured. Please set your key in .env for real-time AI scanning.'
        }));
        return;
      }

      // Security: Require Firebase Authentication token
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: 'Authentication required. Please sign in to scan crops.'
        }));
        return;
      }

      const token = authHeader.slice(7).trim();
      // signature, issuer, audience and expiry are all verified — a decoded-but-unverified token is not trusted
      const payload = await verifyFirebaseToken(token, FIREBASE_PROJECT_ID);
      if (!payload || !payload.sub) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid authentication session. Please sign in again.'
        }));
        return;
      }

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: 'Authentication session expired. Please refresh or sign in again.'
        }));
        return;
      }

      // Rate Limiting per authenticated user / client IP
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'client';
      const rateLimitKey = `${payload.sub}_${clientIp}`;
      if (isRateLimited(rateLimitKey)) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please wait a moment before running another scan.'
        }));
        return;
      }

      let bodyText = '';
      let tooLarge = false;
      const onEnd = async () => {
        if (tooLarge) {
          res.statusCode = 413;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: 'Image file too large. Please upload an image under 10MB.'
          }));
          return;
        }
        try {
          const payload = bodyText ? JSON.parse(bodyText) : {};
          const { image, mimeType, crop = '', lang = 'en' } = payload;

          if (typeof image !== 'string' || !image) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'No photo provided. Please capture or upload a clear plant photo.'
            }));
            return;
          }

          const type = String(mimeType || 'image/jpeg').toLowerCase();
          if (!IMAGE_TYPES.includes(type)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Please upload a JPEG, PNG, WebP or HEIC photo.' }));
            return;
          }

          // Run live, real-time Google Gemini vision analysis.
          // crop/lang go into the AI prompt: keep them short and plain so they can't smuggle instructions in.
          const analysisResult = await analyzeImageWithGemini({
            apiKey,
            base64Data: image,
            mimeType: type,
            cropHint: String(crop).replace(/[^\p{L}\p{N} ()/-]/gu, '').slice(0, 40),
            lang: lang === 'te' ? 'te' : 'en'
          });

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            isLive: true,
            data: analysisResult
          }));
        } catch (err) {
          console.error('[API Error /api/analyze]:', err);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({
            success: false,
            // details stay in the server log; the farmer gets a plain message (no upstream API internals)
            error: 'AI analysis is unavailable right now. Please try again in a minute.'
          }));
        }
      };

      if (req.body !== undefined) {
        // Vercel (and similar hosts) have already read and parsed the body
        bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
        await onEnd();
        return;
      }
      req.on('data', (chunk) => {
        if (tooLarge) return; // keep reading (discarding) so the browser receives the 413 instead of a reset connection
        bodyText += chunk;
        if (bodyText.length > 15 * 1024 * 1024) {
          tooLarge = true;
          bodyText = '';
        }
      });
      req.on('end', onEnd);
      return;
    }

    next();
  };
}
