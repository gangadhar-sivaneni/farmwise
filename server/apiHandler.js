import { isKeyConfigured, analyzeImageWithGemini } from './geminiService.js';

/**
 * Node/Connect compatible middleware for handling FarmWise plant health API endpoints
 */
export function createApiMiddleware(getApiKey) {
  return async (req, res, next) => {
    const url = req.url?.split('?')[0];

    // CORS & JSON Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

      let bodyText = '';
      req.on('data', (chunk) => {
        bodyText += chunk;
        if (bodyText.length > 15 * 1024 * 1024) {
          res.statusCode = 413;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: 'Image file too large. Please upload an image under 10MB.'
          }));
          req.destroy();
        }
      });

      req.on('end', async () => {
        try {
          const payload = bodyText ? JSON.parse(bodyText) : {};
          const { image, mimeType, crop = '', lang = 'en' } = payload;

          if (!image) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'No photo provided. Please capture or upload a clear plant photo.'
            }));
            return;
          }

          // Run live, real-time Google Gemini vision analysis
          const analysisResult = await analyzeImageWithGemini({
            apiKey,
            base64Data: image,
            mimeType: mimeType || 'image/jpeg',
            cropHint: crop,
            lang: lang || 'en'
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
            error: err.message || 'Error occurred while contacting Google Gemini API for real-time analysis.'
          }));
        }
      });
      return;
    }

    next();
  };
}
