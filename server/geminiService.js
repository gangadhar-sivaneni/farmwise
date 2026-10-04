/**
 * Server-side Google Gemini Plant Health & Disease Analysis Service
 * 
 * Securely handles real-time multimodal image analysis via Google Gemini API
 * without exposing API keys to the browser client or frontend bundle.
 */

// Active production vision models for Google Gemini
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.7-flash'];

/**
 * Check if the Gemini API key is configured and valid
 */
export function isKeyConfigured(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  const trimmed = apiKey.trim();
  return trimmed.length > 10 && trimmed !== 'your_gemini_api_key_here';
}

/**
 * Construct system instructions and multimodal prompt for Google Gemini
 */
function buildGeminiPrompt(cropHint, lang) {
  const languageDirective = lang === 'te' 
    ? 'CRITICAL: The farmer speaks Telugu. All textual explanations, symptom descriptions, practical steps, causes, and warnings MUST be written in clear, respectful, natural Telugu (with English technical or disease names in parentheses where helpful).' 
    : 'Provide all responses in simple, clear, plain-language English suitable for a farmer.';

  return `You are an expert, compassionate agricultural botanist, plant pathologist, and agronomy advisor assisting a farmer.
Analyze the provided photograph of a plant or leaf in real time.

${languageDirective}

STRICT AGRONOMIC & SAFETY RULES:
1. FIRST CHECK IMAGE QUALITY & VALIDITY:
   - Does the image clearly show a plant, leaf, crop, flower, fruit, or farm vegetation?
   - If NOT a plant (e.g. human, animal, machinery, indoor object, soil only): set "is_plant": false, "is_clear": false, "possible_issue": "Unable to determine", and explain politely.
   - If the image is excessively blurry, out of focus, too dark, or too distant to inspect leaf surface/spots: set "is_clear": false, "possible_issue": "Unable to determine", explain why, and guide the farmer on how to retake a clear photo.
2. IDENTIFY CROP:
   - Identify the crop species if identifiable. The farmer noted the crop might be: "${cropHint || 'Unknown / Not specified'}".
3. DIAGNOSIS INTEGRITY & UNCERTAINTY:
   - Identify the most probable disease, pest damage, nutrient deficiency, environmental stress, or indicate "Healthy plant" or "Unable to determine".
   - NEVER claim that the diagnosis is confirmed or definitive. State it as a preliminary visual observation.
   - Distinguish visible evidence (what is physically seen in the image) from possible causes (pathogen, weather, soil moisture).
4. PRACTICAL NEXT STEPS (SAFETY FIRST):
   - Focus FIRST on low-risk, cultural, and mechanical actions:
     * Monitoring nearby plants and spread tracking
     * Removing heavily diseased fallen or lower leaves away from the plot
     * Adjusting watering (e.g., watering root zone in the morning, avoiding wet foliage overnight)
     * Improving canopy ventilation and airflow
5. ABSOLUTE CHEMICAL SAFETY RESTRICTION:
   - DO NOT recommend specific commercial pesticide brand names, chemical mixtures, or spray dosages.
   - If protective measures may be needed, instruct the farmer to consult their local agricultural extension officer (e.g., Mandal Agricultural Officer / MAO / KVK) and follow approved label guidelines and local regulations.
   - Avoid treatment advice when the diagnosis is uncertain.
6. THRESHOLDS & EXTENSION ADVICE:
   - Give a clear, practical threshold for when to contact an agricultural extension officer or plant clinic (e.g., if symptoms spread to more than 10% of plants in 3 days).
   - Advise on what additional photo or information would help improve the assessment (e.g., underside of leaf, stem base, overall row view).

Return STRICT JSON matching this schema:
{
  "is_plant": true or false,
  "is_clear": true or false,
  "clarity_issue": string or null,
  "identified_crop": "string",
  "possible_issue": "string",
  "issue_type": "disease" | "pest" | "nutrient" | "environmental" | "healthy" | "uncertain",
  "confidence_level": "high" | "medium" | "low" | "uncertain",
  "confidence_pct": number (0 to 100),
  "confidence_explanation": "string",
  "visible_symptoms": ["string"],
  "possible_causes": ["string"],
  "practical_next_steps": ["string"],
  "when_to_contact_expert": "string",
  "additional_photo_needed": "string",
  "safety_notice": "string"
}`;
}

/**
 * Call Google Gemini REST API in real time with the image payload
 */
export async function analyzeImageWithGemini({ apiKey, base64Data, mimeType, cropHint, lang }) {
  if (!isKeyConfigured(apiKey)) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please add your key to .env.');
  }

  // Clean base64 data if it has data URL prefix
  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const cleanMime = mimeType || 'image/jpeg';
  const promptText = buildGeminiPrompt(cropHint, lang);

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: cleanMime,
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.15,
      response_mime_type: "application/json"
    }
  };

  let lastError = null;

  for (const model of DEFAULT_MODELS) {
    try {
      // key goes in a header, not the URL, so it never lands in request/proxy logs
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim()
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Gemini API] Model ${model} returned HTTP ${response.status}:`, errorText);
        lastError = new Error(`Gemini API error (${response.status}): ${errorText}`);
        continue;
      }

      const jsonResponse = await response.json();
      const candidateText = jsonResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!candidateText) {
        throw new Error('Gemini API returned an empty response candidate.');
      }

      // Parse JSON from candidateText (stripping markdown fences if present)
      const cleanJson = candidateText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsedData = JSON.parse(cleanJson);

      // Add real-time analysis metadata
      parsedData.is_live = true;
      parsedData.analyzed_at = new Date().toISOString();
      parsedData.model_used = model;

      return parsedData;
    } catch (err) {
      console.warn(`[Gemini API] Failed with model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to analyze image with Google Gemini API.');
}
