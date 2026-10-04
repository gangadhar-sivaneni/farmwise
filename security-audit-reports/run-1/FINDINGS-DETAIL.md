# Detailed Findings Reproduction & Remediation

## Finding: [farmwise-2026-unauthenticated-ai-proxy]
**Title**: Unauthenticated Public Endpoint to Paid Gemini AI Model via `/api/analyze`  
**Overall Severity**: Medium (Likelihood: High, Demonstrated Impact: Medium)  
**Confidence**: High  

### 1. Ordered Repository-Relative Trace & Evidence
- **Entrypoint**: [api/analyze.js:6](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/api/analyze.js#L6)
  - Vercel serverless function receives incoming HTTP POST request at `/api/analyze`.
  - CORS header `Access-Control-Allow-Origin: *` configured at [server/apiHandler.js:11](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/apiHandler.js#L11).
- **Propagation**: [server/apiHandler.js:37-78](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/apiHandler.js#L37-L78)
  - Function extracts `{ image, mimeType, crop, lang }` from request body.
  - Verifies presence of `GEMINI_API_KEY`, but performs no validation of caller authorization headers or session tokens.
- **Sink**: [server/geminiService.js:115-125](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/geminiService.js#L115-L125)
  - Dispatches POST request with secret API key to `https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`.
  - Consumes billing quota and returns live diagnostic payload to caller.

### 2. Principals and Resources
- **Attacker Perspective**: Anonymous remote entity (no account required).
- **Affected Resource**: Google Gemini API quota, Google Cloud billing account, serverless execution limits.

### 3. Native Reproduction Procedure
Execute the following curl command against the local or deployed endpoint:

```bash
curl -X POST http://localhost:5173/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "mimeType": "image/png",
    "crop": "tomato",
    "lang": "en"
  }'
```

**Observed Output**:
```json
{
  "success": true,
  "isLive": true,
  "data": {
    "crop": "tomato",
    "diagnosis": "...",
    "confidence": 0.95
  }
}
```

**Security Invariant Broken**:
All calls to paid third-party AI models must be gated behind authenticated, rate-limited user sessions.

### 4. Conditions and Containment
- Requires `GEMINI_API_KEY` to be set in environment.
- Does not grant direct database read/write access, but allows unbounded external consumption of computational and financial resources.

### 5. Source Remediation & Regression Test
In [server/apiHandler.js](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/apiHandler.js), verify user authentication before processing payload:

```javascript
// Add before line 51 in server/apiHandler.js:
const authHeader = req.headers['authorization'];
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    success: false,
    error: 'Unauthorized: Valid authentication token required.'
  }));
  return;
}
```

**Regression Test**:
Send the reproduction curl request without the `Authorization` header. Verify that the response returns HTTP 401 Unauthorized and that no outbound call to Google Gemini occurs.
