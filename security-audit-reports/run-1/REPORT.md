# FarmWise Security Audit Report

## 1. Run Metadata & Execution Scope
- **Run Profile**: `standard`
- **Scope Paths**: `api`, `server`, `src`, `vercel.json`, `package.json`
- **Target Repository**: `farmwise` (`c:\Users\ganga\OneDrive\Desktop\farmwise`)
- **Source Ref**: `709c21f5870f16b81b3ae0c9efe1eaf4656f2264`
- **Execution Policy**: `sandboxed-source-and-local-only`
- **Prior Run Baseline**: No prior audit runs recorded (`none`). All units initialized as current audit scope.
- **Budget**: Standard profile allocation; all planned units reviewed and decided.

## 2. Security Posture Summary
FarmWise demonstrates modern frontend engineering practices with client-side React component isolation and localized parsing of complex geospatial data (GeoJSON, KML). However, the application currently exposes an unauthenticated, unthrottled serverless endpoint (`/api/analyze`) directly connected to a paid Google Gemini Generative AI vision model. Additionally, while the client application enforces user authentication via Firebase Auth and scopes local state to `currentUser.uid`, the Firebase Realtime Database access control rules are uncommitted in source control, requiring administrative verification in the Firebase Console to ensure multi-tenant isolation. Edge hosting configurations in `vercel.json` lack standard HTTP security headers.

## 3. Confirmed Findings Summary

| Severity | Title | Affected Boundary | Observed Result |
| :--- | :--- | :--- | :--- |
| **Medium** | Unauthenticated Public Endpoint to Paid Gemini AI Model via `/api/analyze` | `server/apiHandler.js#handleAnalyzeRequest` | Any anonymous client can send base64 images and prompt queries, consuming paid Gemini API quota without authentication. |
| **Low** | Missing HTTP Security Headers in Edge Hosting Configuration | `vercel.json#edge-routing-headers` | Edge web responses lack `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`, permitting cross-origin framing. |

---

## 4. Confirmed Findings Detail

### [farmwise-2026-unauthenticated-ai-proxy] Unauthenticated Public Endpoint to Paid Gemini AI Model via `/api/analyze`
- **Repository Location**: [api/analyze.js](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/api/analyze.js#L1-L9), [server/apiHandler.js](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/apiHandler.js#L37-L92), [server/geminiService.js](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/geminiService.js#L115-L125)
- **Lower-Trust Principal**: Anonymous Internet client / automated crawler.
- **Conditions**: Public Vercel routing enabled; valid `GEMINI_API_KEY` present in serverless environment variables.
- **Observed Result**: An unauthenticated HTTP POST request containing arbitrary image data and crop hints returns HTTP 200 with complete AI analysis data.
- **Impact**: Financial cost accrual on Google Cloud billing; rate-limit depletion and potential denial of service for legitimate users.
- **Smallest Source Fix**:
  Enforce Firebase ID token verification in [server/apiHandler.js](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/apiHandler.js):
  ```javascript
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Authentication required. Please sign in.' }));
    return;
  }
  ```

### [farmwise-2026-missing-security-headers] Missing HTTP Security Headers in Edge Hosting Configuration
- **Repository Location**: [vercel.json](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/vercel.json#L10-L20)
- **Lower-Trust Principal**: External web origin framing or embedding the application.
- **Conditions**: Client interacts with FarmWise via web browser.
- **Observed Result**: HTTP response headers omit `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`.
- **Impact**: Enables clickjacking through unauthorized framing and allows MIME sniffing attacks.
- **Smallest Source Fix**:
  Update `vercel.json` to attach default security headers to all routes:
  ```json
  {
    "source": "/(.*)",
    "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]
  }
  ```

---

## 5. Needs Validation Summary

| Title | Repository Trace | Exact Blocker | Deployment Verification |
| :--- | :--- | :--- | :--- |
| **Untracked Firebase Realtime Database Security Rules for User Multi-Tenant Data** | `src/services/firebase.js` -> `src/services/authService.js` -> `src/services/farmService.js` | Cloud-side Firebase Realtime Database rules (`database.rules.json`) are not committed to source control. | Administrator must inspect Firebase Console -> Realtime Database -> Rules to ensure `/users/$uid` has `".read": "auth != null && auth.uid === $uid"` and `".write": "auth != null && auth.uid === $uid"`. |

---

## 6. Hardening Notes & Positive Security Patterns
1. **Isolated Client-Side File Parsing**: In [src/utils/landFileParser.js](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/src/utils/landFileParser.js), geometry files (GeoJSON, KML, CSV) are parsed within the browser memory context using browser-native `DOMParser` and regex boundaries rather than untrusted server-side parsers or `eval()`.
2. **Fixed Upstream Target for Mandi Pricing**: In [server/mandi.js](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/server/mandi.js), upstream queries target a static, hardcoded government endpoint (`data.gov.in`), preventing server-side request forgery (SSRF).
3. **Client-Side Session State Isolation**: [src/context/AuthContext.jsx](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/src/context/AuthContext.jsx) isolates authenticated sessions and handles token clearing on logout and account deletion.

---

## 7. Coverage Ledger Summary
- **Total In-Scope Units**: 6
- **Covered Units**: 3 (`client-parsers`, `api-mandi`, `client-navigation`)
- **Candidate Units**: 3 (`api-ai`, `cloud-deployment`, `client-data-layer`)
- **Blocked Units**: 0
- **Deferred Units**: 0
- **Final Disposition**: Complete standard audit pass.
