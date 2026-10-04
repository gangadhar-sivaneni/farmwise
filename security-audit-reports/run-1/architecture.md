# FarmWise Security Architecture Summary

## 1. Product, Principals, Authority, and Protected Resources
FarmWise is an agricultural decision-support and farm management web application designed for farmers, agronomists, and landholders. The platform provides real-time crop disease diagnosis using multimodal generative AI (Google Gemini), local weather analysis, market commodity pricing (Mandi / Agmarknet proxy), and geographic land boundary / plot mapping.

### Principals and Authority:
- **Anonymous Visitor / Public Internet Client**: Can access public landing pages, pricing data proxies, and the AI diagnosis API endpoint without pre-authentication.
- **Authenticated Farmer / Tenant User**: Authenticated via Firebase Authentication (email/password or Google OAuth). Authorized to view and modify their own farm profiles, plots, crop schedules, expense ledgers, and saved scan histories.
- **Cloud Backend Services (Vercel Serverless & Firebase Cloud)**: Executes privileged backend tasks, holds the Gemini API key (`GEMINI_API_KEY`), and hosts client assets and serverless functions.

### Protected Resources:
- Farm records, plot geometries, crop logs, and farmer PII stored under `/users/{uid}` in Firebase Realtime Database.
- Upstream Google Gemini Vision API quota and billing balance associated with `GEMINI_API_KEY`.
- Browser runtime integrity (preventing cross-site scripting, framing/clickjacking, and insecure data handling).

## 2. Comparable Software Baseline
Comparable systems include digital agronomy and farm telemetry platforms (e.g., Plantix, FarmLogs, Agrivi). In standard agricultural advisory software:
- Vision-based diagnostic endpoints require strict user-quota metering or active tenant session tokens to prevent API depletion.
- Land tenure and plot boundaries are treated as sensitive commercial information requiring tenant isolation.
- Geospatial polygon imports (KML, GeoJSON) are validated client-side and sanitized against malformed coordinates before storage.

## 3. Tech Stack and Deployment Models
- **Frontend**: React 19 SPA bundled with Vite, Tailwind CSS, Lucide icons, Leaflet / OpenStreetMap for plotting.
- **Backend / Serverless**: Node.js serverless functions deployed to Vercel (`api/analyze.js`, `api/config-status.js`, `api/markets/prices.js`) with shared middleware (`server/apiHandler.js`).
- **Database & Identity**: Firebase Authentication (v11 client SDK) and Firebase Realtime Database (`rtdb`).
- **External AI Integration**: Google Generative AI (`@google/genai` v0.1.1 / Gemini 2.5 Flash / Gemini 1.5 Pro).
- **Offline Build / Test Environment**: `npm run build` executes `vite build`. No database emulators are committed to the repository; local testing utilizes mock objects or sandboxed node scripts.

## 4. Entry Surfaces and Data Paths
1. **HTTP POST `/api/analyze`**: Accepts JSON payloads containing base64-encoded crop images, crop hints, language preferences, and prompt text. Routes to `handleAnalyzeRequest` -> `analyzeImageWithGemini` -> Google Gemini endpoint (`generativelanguage.googleapis.com`).
2. **HTTP GET `/api/markets/prices`**: Accepts query parameters (`state`, `market`, `commodity`), proxies requests to upstream `data.gov.in` Mandi prices, and caches responses for 5 hours.
3. **HTTP GET `/api/config-status`**: Returns boolean indicating whether Gemini API key is configured.
4. **Client Land File Importer (`parseLandFile`)**: Accepts user-uploaded KML, GeoJSON, CSV, and PDF documents. Handled entirely client-side via DOMParser, regex parsers, and JSON parsing.
5. **Firebase Realtime Database Synchronization**: Client connects directly to `farmwise-be0bd-default-rtdb.asia-southeast1.firebasedatabase.app` using Firebase Client SDK for state persistence.

## 5. Trust Boundaries and Controls
- **Boundary 1: External Client to AI Serverless Function (`/api/analyze`)**:
  - *Current Control*: Validates payload size (<10MB) and checks if `GEMINI_API_KEY` is present.
  - *Gap*: Lacks client authentication token verification and rate limiting.
- **Boundary 2: Client Web App to Firebase Realtime Database**:
  - *Current Control*: Client application scopes queries by `currentUser.uid`.
  - *Gap*: Cloud-side Realtime Database security rules (`database.rules.json`) are unmanaged in source code.
- **Boundary 3: Browser Client to Edge Network (`vercel.json`)**:
  - *Current Control*: Rewrite rules for SPA navigation.
  - *Gap*: Absence of HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).

## 6. Repository-Relative Starting Paths
- `api/analyze.js` — Vercel Serverless Function entrypoint for crop image diagnostics.
- `server/apiHandler.js` — Shared request processing, CORS headers, and payload validation.
- `server/geminiService.js` — Upstream Google Gemini API integration and model fallback sequence.
- `src/services/firebase.js` — Firebase SDK initialization and database reference.
- `src/services/authService.js` — User authentication, registration, password reset, and profile management.
- `src/services/farmService.js` — Tenant farm, crop, and plot CRUD synchronization.
- `src/utils/landFileParser.js` — Client-side parsing of uploaded boundary and land files.
- `vercel.json` — Edge routing, rewrite rules, and response headers.

## 7. Prior Coverage and Scope
This is the baseline full security audit run (`farmwise-full-audit-run-1`). No prior coverage ledger exists for this repository. All identified surfaces and attack classes are evaluated as current work.

## 8. Companion Selection Summary
Derived from `ATTACK-CLASSES.md`, the following companion modules are active:
- **WEB-PROTOCOL-AND-AUTH.md**: Active due to public HTTP endpoints, CORS headers, OAuth redirection, and session tokens.
- **DATA-ISOLATION-AND-LIFECYCLE.md**: Active due to multi-tenant farm data storage in Firebase Realtime Database.
- **AI-AND-LLM.md**: Active due to generative multimodal AI prompts and model output processing.
- **CLOUD-AND-DEPLOYMENT.md**: Active due to Vercel edge configuration, serverless execution limits, and environment variable handling.
- **RESOURCE-EXHAUSTION-AND-AVAILABILITY.md**: Active due to unmetered AI vision calls and heavy file uploads.
