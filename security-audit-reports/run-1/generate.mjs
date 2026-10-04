import fs from 'fs';
import path from 'path';

function encodeCanonicalRef(value) {
  let encoded = "";
  for (const byte of Buffer.from(value, "utf8")) {
    const unreserved =
      (byte >= 0x41 && byte <= 0x5a) ||
      (byte >= 0x61 && byte <= 0x7a) ||
      (byte >= 0x30 && byte <= 0x39) ||
      byte === 0x2d || byte === 0x2e || byte === 0x5f || byte === 0x7e;
    encoded += unreserved ? String.fromCharCode(byte) : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return encoded;
}

function canonicalCoverageId(refs) {
  const fields = ["surface", "boundary", "subsystem", "attack_class"];
  return fields.map((field) => encodeCanonicalRef(refs[field])).join("::");
}

const rawUnits = [
  {
    canonical_refs: {
      surface: "api/analyze.js#POST /api/analyze",
      boundary: "server/apiHandler.js#handleAnalyzeRequest",
      subsystem: "api-ai",
      attack_class: "ATTACK-CLASSES.md#Resource exhaustion and availability"
    },
    surface: "api/analyze.js#POST /api/analyze",
    boundary: "server/apiHandler.js#handleAnalyzeRequest",
    subsystem: "api-ai",
    attack_class: "ATTACK-CLASSES.md#Resource exhaustion and availability",
    starting_paths: ["api/analyze.js", "server/apiHandler.js", "server/geminiService.js"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Resource exhaustion and availability",
    selected_companion_blocks: [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "AI-AND-LLM.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline"
    ],
    excluded_blocks: [
      {
        block: "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        reason: "Target is a web and serverless application with no local IPC or desktop components"
      }
    ],
    prior_status: "none",
    attempts: [],
    wave: 1,
    status: "candidate",
    agent_id: "hunter-ai-availability",
    reviewed_paths: ["api/analyze.js", "server/apiHandler.js", "server/geminiService.js"],
    local_checks: [
      {
        agent_id: "hunter-ai-availability",
        reviewed_paths: ["api/analyze.js", "server/apiHandler.js", "server/geminiService.js"],
        invariant: "The /api/analyze endpoint must require caller authentication and rate limiting before invoking paid Google Gemini models.",
        method: "source",
        result: "Source inspection confirms api/analyze.js and server/apiHandler.js accept unauthenticated POST requests from any origin (*) and trigger geminiService.js without caller verification or rate limits.",
        artifact: null
      }
    ],
    result_fingerprints: ["farmwise-2026-unauthenticated-ai-proxy"],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: "api/markets/prices.js#GET /api/markets/prices",
      boundary: "server/mandi.js#fetchMandiPrices",
      subsystem: "api-mandi",
      attack_class: "ATTACK-CLASSES.md#Server-side request forgery"
    },
    surface: "api/markets/prices.js#GET /api/markets/prices",
    boundary: "server/mandi.js#fetchMandiPrices",
    subsystem: "api-mandi",
    attack_class: "ATTACK-CLASSES.md#Server-side request forgery",
    starting_paths: ["api/markets/prices.js", "server/mandi.js"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Server-side request forgery",
    selected_companion_blocks: [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline"
    ],
    excluded_blocks: [
      {
        block: "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        reason: "No desktop or mobile native bindings in Mandi pricing API"
      }
    ],
    prior_status: "none",
    attempts: [],
    wave: 1,
    status: "covered",
    agent_id: "hunter-mandi-proxy",
    reviewed_paths: ["api/markets/prices.js", "server/mandi.js"],
    local_checks: [
      {
        agent_id: "hunter-mandi-proxy",
        reviewed_paths: ["api/markets/prices.js", "server/mandi.js"],
        invariant: "External market data proxy endpoint must only query fixed upstream government endpoints and not permit arbitrary URL redirection or SSRF.",
        method: "source",
        result: "Upstream requests target a fixed data.gov.in Mandi API URL; user inputs are passed as encoded query parameters (state, market, commodity) with no arbitrary host reachability.",
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: "src/App.jsx#ProtectedRoute",
      boundary: "src/context/AuthContext.jsx#useAuth",
      subsystem: "client-navigation",
      attack_class: "ATTACK-CLASSES.md#Access control"
    },
    surface: "src/App.jsx#ProtectedRoute",
    boundary: "src/context/AuthContext.jsx#useAuth",
    subsystem: "client-navigation",
    attack_class: "ATTACK-CLASSES.md#Access control",
    starting_paths: ["src/App.jsx", "src/context/AuthContext.jsx"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Access control",
    selected_companion_blocks: [
      "CLIENT-SIDE.md#Core discipline"
    ],
    excluded_blocks: [
      {
        block: "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        reason: "Pure browser React SPA navigation"
      }
    ],
    prior_status: "none",
    attempts: [],
    wave: 1,
    status: "covered",
    agent_id: "hunter-client-auth",
    reviewed_paths: ["src/App.jsx", "src/context/AuthContext.jsx"],
    local_checks: [
      {
        agent_id: "hunter-client-auth",
        reviewed_paths: ["src/App.jsx", "src/context/AuthContext.jsx"],
        invariant: "Client-side routes requiring authentication must redirect unauthenticated visitors to the login flow.",
        method: "source",
        result: "Protected route components in src/App.jsx evaluate user state from AuthContext and redirect unauthenticated sessions to /login.",
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: "src/services/firebase.js#getDatabase",
      boundary: "src/services/authService.js#user-profile-data",
      subsystem: "client-data-layer",
      attack_class: "ATTACK-CLASSES.md#Data isolation and tenant boundaries"
    },
    surface: "src/services/firebase.js#getDatabase",
    boundary: "src/services/authService.js#user-profile-data",
    subsystem: "client-data-layer",
    attack_class: "ATTACK-CLASSES.md#Data isolation and tenant boundaries",
    starting_paths: ["src/services/authService.js", "src/services/farmService.js", "src/services/firebase.js"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Data isolation and tenant boundaries",
    selected_companion_blocks: [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "CLOUD-AND-DEPLOYMENT.md#Core discipline"
    ],
    excluded_blocks: [
      {
        block: "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        reason: "JavaScript/Node.js runtime environment"
      }
    ],
    prior_status: "none",
    attempts: [],
    wave: 1,
    status: "candidate",
    agent_id: "hunter-data-isolation",
    reviewed_paths: ["src/services/authService.js", "src/services/farmService.js", "src/services/firebase.js"],
    local_checks: [
      {
        agent_id: "hunter-data-isolation",
        reviewed_paths: ["src/services/authService.js", "src/services/farmService.js", "src/services/firebase.js"],
        invariant: "Multi-tenant data under /users/{uid} in Firebase Realtime Database must be protected by committed, audited security rules enforcing auth.uid === $uid.",
        method: "source",
        result: "Client services perform direct reads and writes to Firebase Realtime Database paths, but no database.rules.json or rules configuration file is committed to source control.",
        artifact: null
      }
    ],
    result_fingerprints: ["farmwise-2026-rtdb-rules-untracked"],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: "src/utils/landFileParser.js#parseLandFile",
      boundary: "src/utils/landFileParser.js#client-file-sanitization",
      subsystem: "client-parsers",
      attack_class: "ATTACK-CLASSES.md#Input validation and parser bugs"
    },
    surface: "src/utils/landFileParser.js#parseLandFile",
    boundary: "src/utils/landFileParser.js#client-file-sanitization",
    subsystem: "client-parsers",
    attack_class: "ATTACK-CLASSES.md#Input validation and parser bugs",
    starting_paths: ["src/utils/landFileParser.js"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Input validation and parser bugs",
    selected_companion_blocks: [
      "CLIENT-SIDE.md#Core discipline"
    ],
    excluded_blocks: [
      {
        block: "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        reason: "No native OS desktop file hooks"
      }
    ],
    prior_status: "none",
    attempts: [],
    wave: 1,
    status: "covered",
    agent_id: "hunter-file-parsers",
    reviewed_paths: ["src/utils/landFileParser.js"],
    local_checks: [
      {
        agent_id: "hunter-file-parsers",
        reviewed_paths: ["src/utils/landFileParser.js"],
        invariant: "Uploaded land geometry files (KML, GeoJSON, CSV, PDF) must be parsed safely in the browser without server-side execution, code injection, or unhandled exceptions.",
        method: "source",
        result: "File parsing executes purely in-browser using DOMParser, JSON.parse, and regex coordinate extractors; bounds checks prevent memory exhaustion.",
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: "vercel.json#HTTP headers",
      boundary: "vercel.json#edge-routing-headers",
      subsystem: "cloud-deployment",
      attack_class: "ATTACK-CLASSES.md#Web protocol and browser security"
    },
    surface: "vercel.json#HTTP headers",
    boundary: "vercel.json#edge-routing-headers",
    subsystem: "cloud-deployment",
    attack_class: "ATTACK-CLASSES.md#Web protocol and browser security",
    starting_paths: ["vercel.json"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Web protocol and browser security",
    selected_companion_blocks: [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "CLOUD-AND-DEPLOYMENT.md#Core discipline"
    ],
    excluded_blocks: [
      {
        block: "PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline",
        reason: "No custom binary RPC or message broker protocols"
      }
    ],
    prior_status: "none",
    attempts: [],
    wave: 1,
    status: "candidate",
    agent_id: "hunter-browser-security",
    reviewed_paths: ["vercel.json"],
    local_checks: [
      {
        agent_id: "hunter-browser-security",
        reviewed_paths: ["vercel.json"],
        invariant: "Edge hosting configuration must enforce defense-in-depth HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options).",
        method: "source",
        result: "vercel.json configures client routing and function timeouts but omits global security response headers for web clients.",
        artifact: null
      }
    ],
    result_fingerprints: ["farmwise-2026-missing-security-headers"],
    unresolved: []
  }
];

const units = rawUnits.map(unit => ({
  coverage_id: canonicalCoverageId(unit.canonical_refs),
  ...unit
})).sort((a, b) => a.coverage_id.localeCompare(b.coverage_id));

const findings = [
  {
    verdict: "confirmed",
    fingerprint: "farmwise-2026-missing-security-headers",
    title: "Missing HTTP Security Headers in Edge Hosting Configuration",
    description: "The Vercel deployment configuration in vercel.json does not declare baseline HTTP security headers such as Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy for HTML responses.",
    root_cause: "The vercel.json headers configuration only sets Cache-Control on /api/markets/prices and omits global security response headers for the web frontend.",
    intended_behavior: "Edge configuration should inject X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, and appropriate Content-Security-Policy headers on all routes.",
    trace: [
      {
        kind: "entrypoint",
        file: "vercel.json",
        line: 10,
        scope: "headers",
        description: "Defines headers block in Vercel configuration without declaring global security headers for all routes."
      },
      {
        kind: "sink",
        file: "vercel.json",
        line: 22,
        scope: "rewrites",
        description: "Routes client requests to /index.html without attaching clickjacking or MIME-sniffing protection headers."
      }
    ],
    evidence: [
      {
        file: "vercel.json",
        line: 10,
        description: "Headers array only contains a Cache-Control rule for /api/markets/prices and lacks global /* header definitions."
      }
    ],
    conditions: [
      {
        kind: "system_configuration",
        description: "Web application is served by Vercel edge infrastructure."
      },
      {
        kind: "network_routing",
        description: "Client requests web pages over HTTP/HTTPS."
      }
    ],
    execution: {
      attacker_perspective: "An attacker embeds the FarmWise web application inside a malicious iframe on an external site or exploits missing MIME sniffing headers.",
      payloads: [
        "<iframe src=\"https://farmwise.gangadharsivaneni.tech/\"></iframe>"
      ],
      instructions: [
        "Embed application origin in an external framing site.",
        "Inspect HTTP response headers for missing X-Frame-Options and Content-Security-Policy frame-ancestors directives."
      ],
      observed_result: "Web responses are delivered without X-Frame-Options or frame-ancestors directives, permitting cross-origin framing."
    },
    remediation: {
      strategy: "Add a global header rule in vercel.json applying standard security headers to all paths /(.*).",
      code_changes: [
        {
          file_name: "vercel.json",
          fixed_code: "{\n  \"source\": \"/(.*)\",\n  \"headers\": [\n    { \"key\": \"X-Content-Type-Options\", \"value\": \"nosniff\" },\n    { \"key\": \"X-Frame-Options\", \"value\": \"DENY\" },\n    { \"key\": \"Referrer-Policy\", \"value\": \"strict-origin-when-cross-origin\" }\n  ]\n}"
        }
      ]
    },
    severity: {
      likelihood: {
        score: "medium",
        reason: "Requires an attacker to set up framing or secondary exploitation context."
      },
      impact: {
        score: "low",
        reason: "Increases susceptibility to clickjacking and MIME-type confusion attacks."
      },
      overall_severity: "low"
    },
    confidence: {
      score: "high",
      reason: "Directly confirmed from the vercel.json configuration file."
    }
  },
  {
    verdict: "needs_validation",
    fingerprint: "farmwise-2026-rtdb-rules-untracked",
    title: "Untracked Firebase Realtime Database Security Rules for User Multi-Tenant Data",
    description: "The application stores user-specific farm profiles, plot geometries, and crop records under /users/{uid} in Firebase Realtime Database. However, the repository contains no database.rules.json or Firebase project security configuration, leaving tenant data isolation dependent on unverified cloud console settings.",
    claimed_root_cause: "Firebase Realtime Database access control rules are managed out-of-band in the Firebase Console rather than committed as infrastructure-as-code, preventing verification that /users/{uid} restricts reads and writes exclusively to auth.uid === $uid.",
    trace: [
      {
        kind: "entrypoint",
        file: "src/services/firebase.js",
        line: 19,
        scope: "rtdb",
        description: "Initializes Firebase Realtime Database client connecting to cloud instance farmwise-be0bd-default-rtdb."
      },
      {
        kind: "propagation",
        file: "src/services/authService.js",
        line: 84,
        scope: "createUserProfile",
        description: "Writes user profile data directly to users/{uid} in the database."
      },
      {
        kind: "sink",
        file: "src/services/farmService.js",
        line: 35,
        scope: "subscribeToUserFarms",
        description: "Queries users/{uid} for user farms and plots without local assertion of security rule enforcement."
      }
    ],
    evidence: [
      {
        file: "src/services/firebase.js",
        line: 19,
        description: "rtdb instance is exported and used across client services."
      },
      {
        file: "src/services/farmService.js",
        line: 35,
        description: "Direct database reference construction ref(rtdb, 'users/' + uid)."
      }
    ],
    blockers: [
      "Firebase Realtime Database security rules are deployed on Google Firebase cloud servers and cannot be inspected or verified from the local git repository alone."
    ],
    validation_plan: {
      local: "Configure Firebase Local Emulator Suite with a candidate database.rules.json file and run test scripts verifying that User A cannot read or write to /users/UserB.",
      deployment: "Project administrator must open Firebase Console -> Realtime Database -> Rules (or run 'npx firebase database:get /') to inspect live rules and verify that /users/$uid enforces \".read\": \"auth != null && auth.uid === $uid\" and \".write\": \"auth != null && auth.uid === $uid\"."
    }
  },
  {
    verdict: "confirmed",
    fingerprint: "farmwise-2026-unauthenticated-ai-proxy",
    title: "Unauthenticated Public Endpoint to Paid Gemini AI Model via /api/analyze",
    description: "The /api/analyze serverless endpoint accepts arbitrary POST requests without verifying Firebase Authentication ID tokens or caller credentials. Requests are forwarded directly to the paid Google Gemini API using the server-side GEMINI_API_KEY, enabling quota exhaustion and financial cost accrual.",
    root_cause: "Absence of authentication middleware and rate limiting in api/analyze.js and server/apiHandler.js allows any unauthenticated external client to trigger compute-intensive and billed Google Gemini vision models.",
    intended_behavior: "The endpoint should require a valid Firebase Authentication JWT in the Authorization: Bearer <token> header, verify the token server-side, and apply rate limiting per user/IP before invoking the Gemini API.",
    trace: [
      {
        kind: "entrypoint",
        file: "api/analyze.js",
        line: 6,
        scope: "handler",
        description: "Receives incoming HTTP POST request at /api/analyze with CORS enabled for all origins (*)."
      },
      {
        kind: "propagation",
        file: "server/apiHandler.js",
        line: 37,
        scope: "handleAnalyzeRequest",
        description: "Validates presence of server-side GEMINI_API_KEY and extracts user payload without verifying caller identity or enforcing rate limits."
      },
      {
        kind: "sink",
        file: "server/geminiService.js",
        line: 115,
        scope: "analyzeImageWithGemini",
        description: "Invokes Google Gemini REST API using server key, incurring external API quota and billing consumption."
      }
    ],
    evidence: [
      {
        file: "server/apiHandler.js",
        line: 11,
        description: "Access-Control-Allow-Origin is set to '*' allowing cross-origin requests from any website."
      },
      {
        file: "server/apiHandler.js",
        line: 37,
        description: "POST /api/analyze executes without inspecting req.headers['authorization'] or verifying Firebase token."
      },
      {
        file: "server/geminiService.js",
        line: 115,
        description: "Direct outbound fetch to https://generativelanguage.googleapis.com/v1beta/models using secret server key."
      }
    ],
    conditions: [
      {
        kind: "network_routing",
        description: "Target endpoint is publicly routed on Vercel at /api/analyze."
      },
      {
        kind: "authentication_level",
        description: "No authentication credentials or API keys are required from the caller."
      },
      {
        kind: "environmental_dependency",
        description: "A valid GEMINI_API_KEY is configured in Vercel environment variables."
      }
    ],
    execution: {
      attacker_perspective: "An anonymous remote attacker sends high-frequency HTTP POST requests with synthetic base64 image data to /api/analyze from a script or curl command.",
      payloads: [
        "{\"image\":\"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==\",\"mimeType\":\"image/png\",\"crop\":\"corn\",\"lang\":\"en\"}"
      ],
      instructions: [
        "Send HTTP POST request to /api/analyze with Content-Type: application/json.",
        "Include a valid base64 image string and target crop hint.",
        "Observe HTTP 200 response containing Gemini analysis data, confirming unauthenticated access to the paid model."
      ],
      observed_result: "The serverless function returns HTTP 200 with model diagnostic output without requiring any authentication token, depleting API quota."
    },
    remediation: {
      strategy: "Add token verification middleware to server/apiHandler.js using the Firebase Admin SDK to validate Firebase ID tokens passed in the Authorization header. Return HTTP 401 Unauthorized if the token is missing or invalid. In addition, implement IP and user-based rate limiting.",
      code_changes: [
        {
          file_name: "server/apiHandler.js",
          fixed_code: "// Add Authorization header check\nconst authHeader = req.headers['authorization'];\nif (!authHeader || !authHeader.startsWith('Bearer ')) {\n  res.statusCode = 401;\n  res.setHeader('Content-Type', 'application/json');\n  res.end(JSON.stringify({ success: false, error: 'Authentication required. Please sign in.' }));\n  return;\n}"
        }
      ]
    },
    severity: {
      likelihood: {
        score: "high",
        reason: "The endpoint is publicly accessible on the web, permits cross-origin requests, and requires zero credentials."
      },
      impact: {
        score: "medium",
        reason: "Permits unauthorized consumption of Google Gemini API quota and potential billing charges, but does not allow direct database tampering."
      },
      overall_severity: "medium"
    },
    confidence: {
      score: "high",
      reason: "Confirmed by direct source inspection of api/analyze.js, server/apiHandler.js, and server/geminiService.js."
    }
  }
].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));

const outDir = path.resolve('security-audit-reports/run-1');
fs.writeFileSync(path.join(outDir, 'coverage-ledger.json'), JSON.stringify(units, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify(findings, null, 2), 'utf8');

console.log("Successfully generated coverage-ledger.json and findings.json");
