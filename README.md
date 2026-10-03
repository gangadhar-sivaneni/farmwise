# FarmWise — Smart Farm Dashboard & AI Crop Disease Scanner

FarmWise is a farmer-friendly agricultural management dashboard supporting English and Telugu, crop planning, weather advisories, field mapping, and AI-assisted crop disease scanning.

---

## AI Crop Disease Scanner Setup

The crop disease scanner uses Google Gemini's multimodal vision capabilities to provide preliminary plant health assessments and practical next steps for farmers.

### 1. Get a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **Create API Key**.

### 2. Configure Your Environment
Create a `.env` file in the root directory of this project (`c:\Users\dell\Farm Wise\farmwise\.env`):

```bash
# Copy from .env.example
cp .env.example .env
```

Open `.env` and set your key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> **Security & Privacy Note:**
> - The API key is read strictly on the server (`server/apiHandler.js` / Vite server middleware).
> - It is **never** sent to the client browser, stored in browser storage, or exposed in frontend builds.
> - `.env` and `.env.*` are ignored by `.gitignore` so your key is never committed to source control.
> - Uploaded crop photos are only sent to the configured Google Gemini API service for analysis; they are not saved or shared elsewhere.

### 3. Missing-Key / Sample Mode Behavior
If `GEMINI_API_KEY` is not yet configured:
- The dashboard displays a friendly setup notice card with a link to configure instructions.
- The rest of the dashboard remains **100% usable**.
- Farmers can test the entire scanning flow using the built-in **Sample Leaf Photo**, which provides realistic, agronomic sample results.
- Sample results are always prominently labeled as `Sample Data · Not a live diagnosis`.

---

## Running Locally

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open [http://localhost:5173/#/app/scan](http://localhost:5173/#/app/scan) to access the Crop Disease Scanner.

---

## Date-Specific Farm Tasks

The **Today’s Tasks** calendar prepares a short suggestion list for the selected local date using the active farm’s plot and alert records plus that date’s available forecast. Tasks are saved per date in browser local storage. Suggestions are stored separately from farmer-added tasks, edits, deletions, and completion states, so refreshed weather recommendations do not overwrite farmer changes. Dates without saved history or time-sensitive suggestions can be left empty or filled with a farmer-created task.

Weather-derived suggestions use forecasts and model estimates where available; they are not field sensor measurements. When weather is unavailable for the selected date, the page says so and uses only farm records or general checks.

---

## Safe Advice & Agronomic Guidelines
- All assessments are presented as **preliminary AI visual evaluations**, never certified laboratory diagnoses.
- The scanner **never** recommends specific commercial pesticide brands, chemical mixtures, or dosages.
- Farmers are guided toward safe, low-risk cultural practices (field sanitation, pruning diseased foliage, canopy airflow, watering timing) and directed to their local Mandal Agricultural Officer (MAO) or Krishi Vigyan Kendra (KVK) whenever symptoms exceed safe thresholds.