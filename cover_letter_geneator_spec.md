# Cover Letter Generator — Project Specification

## Overview

A web application that generates personalized, tailored cover letters by combining intelligent job research with the user's personal professional context. Given a job URL and pre-uploaded personal files (resume, bio, writing samples), the app produces a polished, job-specific cover letter through a multi-stage AI pipeline optimized for minimal token usage.

---

## Core User Flow

1. User uploads their personal files once (resume, optional bio, tone/writing sample)
2. User pastes a job posting URL
3. App runs a 3-stage research and synthesis pipeline
4. App presents the final cover letter
5. User exports the letter (plain text, markdown, or .docx) and edits externally as needed

---

## Tech Stack

- **Frontend:** React (single-page app, no framework beyond Vite)
- **Backend:** Node.js + Express
- **AI:** Anthropic Claude API
  - `claude-sonnet-4-6` — company research (Stage 1) and letter generation (Stage 3)
  - `claude-haiku-4-5-latest` — resume extraction and JD parsing (lightweight stages)
- **File storage:** Local filesystem (MVP); S3-compatible storage (production)
- **Web fetching:** Anthropic web search tool (built into API) for company research
- **Document parsing:** `pdf-parse` for PDF resumes, `mammoth` for .docx
- **Export:** `docx` npm package for Word export

---

## Project Structure

```
cover-letter-gen/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── FileUpload.jsx       # Resume/bio upload with drag-and-drop
│   │   │   ├── JobInput.jsx         # URL input + submit
│   │   │   ├── PipelineStatus.jsx   # Live stage progress indicator
│   │   │   ├── LetterDisplay.jsx    # Read-only letter display
│   │   │   └── ExportMenu.jsx       # Export as txt / md / docx
│   │   └── main.jsx
│   └── vite.config.js
├── server/
│   ├── index.js                     # Express entry point
│   ├── routes/
│   │   ├── upload.js                # POST /api/upload
│   │   └── generate.js              # POST /api/generate (SSE streaming)
│   ├── pipeline/
│   │   ├── fetchJob.js              # Scrape + clean job page HTML
│   │   ├── extractResume.js         # Pre-stage: extract relevant resume sections (Haiku)
│   │   ├── macroResearch.js         # Stage 1: company-level research (Sonnet)
│   │   ├── microParsing.js          # Stage 2: JD parsing (Haiku)
│   │   └── letterGeneration.js      # Stage 3: synthesis + letter draft (Sonnet, extended thinking)
│   ├── utils/
│   │   ├── parseResume.js           # Extract text from PDF/docx
│   │   └── exportDocx.js            # Generate .docx from letter text
│   └── storage/
│       └── userFiles.js             # Read/write uploaded files
├── .env                             # ANTHROPIC_API_KEY
└── package.json
```

---

## Pipeline Architecture

The pipeline is optimized for minimal token usage. Stages 1 and 2 run in parallel since they have no data dependency. A lightweight resume extraction pre-step trims the resume before it enters the main pipeline.

```
                    ┌─────────────────────────┐
                    │   Pre-step: Resume       │
                    │   Extraction (Haiku)     │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                                   ▼
  ┌───────────────────────┐         ┌───────────────────────┐
  │  Stage 1: Macro        │         │  Stage 2: Micro        │
  │  Research (Sonnet)     │         │  Parsing (Haiku)       │
  │  [web search enabled]  │         │  [structured extraction]│
  └───────────┬───────────┘         └───────────┬───────────┘
              │                                   │
              └─────────────┬─────────────────────┘
                            ▼
              ┌───────────────────────┐
              │  Stage 3: Synthesis + │
              │  Letter Generation    │
              │  (Sonnet, extended    │
              │   thinking enabled)   │
              └───────────────────────┘
```

---

## Pipeline Stages (Backend)

### Pre-step — Resume Extraction (runs before pipeline stages)

**Model:** `claude-haiku-4-5-latest`  
**Input:** Raw parsed resume text + job URL (for basic role context)  
**Method:** Single Haiku API call to extract and condense the resume.

**Prompt goal:** Extract only the professionally relevant content from the resume:
- Key skills and technologies (as a short list)
- Top 3–5 experience entries (company, role, 1-sentence achievement summary each)
- Top 2–3 notable projects (name, 1-sentence description, technologies/skills used)
- Any quantified accomplishments
- Strip all formatting, addresses, references, objective statements, and irrelevant sections

**Prompt constraint:** "Respond in JSON only. Each string field must be 1–2 concise sentences maximum. Lists should contain no more than 5 items."

**Output:** A structured JSON object:
```json
{
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "achievement": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"]
    }
  ],
  "quantifiedAccomplishments": ["string"]
}
```

**Token budget:** `maxTokens: 1000`

---

### Stage 1 — Macro Research (company-level)

**Model:** `claude-sonnet-4-6`  
**Input:** Job URL  
**Method:** Fetch the job page HTML, extract the company name and domain. Use the Claude API with the `web_search` tool enabled to research the company.

**Runs in parallel with Stage 2.**

**Prompt goal:** Produce a concise "company brief" covering:
- What the company does (product, customers, market)
- Mission, values, stated culture
- Recent notable developments (funding, launches, leadership, news)
- Current growth stage and strategic moment

**Prompt constraint:** "Respond in JSON only. Each string field must be 1–2 concise sentences maximum."

**Output:** A structured JSON object:
```json
{
  "companyName": "string",
  "whatTheyDo": "string",
  "mission": "string",
  "culture": "string",
  "recentDevelopments": "string",
  "strategicMoment": "string"
}
```

**Token budget:** `maxTokens: 1000`

---

### Stage 2 — Micro Parsing (job description)

**Model:** `claude-haiku-4-5-latest`  
**Input:** Raw job page text (scraped from URL)  
**Method:** Single Haiku API call, no web search needed. This is a structured extraction task well-suited to a fast, cheap model.

**Runs in parallel with Stage 1.**

**Prompt goal:** Parse and structure the job description into:
- Role title and team
- Hard requirements (skills, tools, years of experience)
- Soft preferences (working style, values alignment signals)
- Role-specific keywords to reflect in the letter
- Implicit signals about what success looks like in this role

**Prompt constraint:** "Respond in JSON only. Keep all string fields to 1–2 concise sentences. Lists should contain no more than 8 items."

**Output:** A structured JSON object:
```json
{
  "roleTitle": "string",
  "team": "string",
  "hardRequirements": ["string"],
  "softPreferences": ["string"],
  "keywords": ["string"],
  "successSignals": "string"
}
```

**Token budget:** `maxTokens: 1000`

---

### Stage 3 — Synthesis + Letter Generation (merged)

**Model:** `claude-sonnet-4-6` with **extended thinking enabled**  
**Input:** Company brief (Stage 1 output) + JD parse (Stage 2 output) + condensed resume (Pre-step output) + optional bio text  
**Method:** Single Sonnet API call with extended thinking. The model performs synthesis reasoning internally (in its thinking block) before generating the letter — this replaces the old separate synthesis stage while maintaining quality.

**Prompt goal:**
1. *(Internal reasoning — handled by extended thinking)* Analyze the connection between company context and role needs. Determine why this company needs this role right now, identify 2–3 themes the letter should emphasize, and calibrate tone.
2. Identify the 2–3 most relevant experiences/achievements from the condensed resume relative to the role
3. Draft a complete, personalized cover letter (3–4 paragraphs) that:
   - Opens with a strategic narrative angle (not a generic opener)
   - Weaves in relevant personal experience with specificity
   - Reflects the company's stated values and culture
   - Uses the role's keywords naturally
   - Closes with a confident, non-generic call to action
4. Match the tone to the company (startup = energetic, enterprise = polished, etc.)

**Prompt constraint:** "Output the cover letter as plain text only. No markdown, no headers, no metadata."

**Output:** Plain text cover letter string.

**Token budget:** `maxTokens: 1000` (for the letter output), thinking budget: `budgetTokens: 5000`

---

## API Endpoints

### `POST /api/upload`
Upload personal files. Accepts multipart form data.
- Fields: `resume` (PDF or .docx, required), `bio` (text or .docx, optional), `sample` (writing sample for tone matching, optional)
- Returns: `{ sessionId: "uuid" }` — used to reference files in subsequent requests
- Stores files locally keyed by sessionId

### `POST /api/generate`
Trigger the full pipeline. Returns a **Server-Sent Events (SSE)** stream so the frontend can show live stage progress.
- Body: `{ jobUrl: "string", sessionId: "string" }`
- SSE events emitted:
  - `{ stage: "extract", status: "running" | "done", data?: condensedResume }`
  - `{ stage: "macro", status: "running" | "done", data?: companyBrief }`
  - `{ stage: "micro", status: "running" | "done", data?: jdParse }`
  - `{ stage: "generation", status: "running" | "done", data?: letterText }`
  - `{ stage: "error", message: "string" }`
- Note: `macro` and `micro` events may interleave since they run in parallel

### `GET /api/export/:sessionId`
Export the final letter as a .docx file.
- Query param: `?text=<url-encoded letter text>`
- Returns: Binary .docx file download

---

## Frontend Components

### `FileUpload.jsx`
- Drag-and-drop zone for resume (PDF/.docx), bio (optional), writing sample (optional)
- Shows upload status and file names
- On success, stores `sessionId` in component state

### `JobInput.jsx`
- Single text input for job URL
- Submit button triggers `POST /api/generate`
- Validates URL format before submitting

### `PipelineStatus.jsx`
- Connects to the SSE stream from `/api/generate`
- Shows stages as a visual progress tracker (idle → running → done)
- Displays a short human-readable label per stage as it completes
- Shows parallel stages (Macro Research + Micro Parsing) side by side to reflect actual execution

### `LetterDisplay.jsx`
- Renders the generated cover letter in a clean, readable format
- Read-only — no inline editing
- Displays the letter text once Stage 3 completes

### `ExportMenu.jsx`
- Three buttons: Copy to clipboard, Download .md, Download .docx
- .docx calls `/api/export`

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
MAX_FILE_SIZE_MB=10
SESSION_TTL_HOURS=24
```

---

## Implementation Order (Recommended)

1. **Scaffold** — set up Vite + React client, Express server, basic routing
2. **File upload** — `POST /api/upload`, resume text extraction (`parseResume.js`)
3. **Job fetching** — fetch and clean job page HTML (`fetchJob.js`)
4. **Resume extraction** — implement the Haiku-based resume condenser (`extractResume.js`)
5. **Pipeline stages** — implement Stages 1–2 (can test in parallel), then Stage 3
6. **SSE streaming** — wire pipeline into the SSE endpoint, test stage events including parallel execution
7. **Frontend pipeline UI** — `JobInput` + `PipelineStatus` connected to SSE
8. **Letter display** — `LetterDisplay` rendering the final output
9. **Export** — clipboard, markdown, .docx
10. **Polish** — error handling, loading states, file validation, session cleanup

---

## Key Prompting Decisions

- Each pipeline stage should be its own function in `/server/pipeline/` — one file per stage, one exported async function
- **Model routing:**
  - Sonnet (`claude-sonnet-4-6`) for Stage 1 (macro research) and Stage 3 (letter generation)
  - Haiku (`claude-haiku-4-5-latest`) for the resume extraction pre-step and Stage 2 (micro parsing)
- Stages 1–2 and the resume extraction pre-step should instruct the model to respond in JSON only (no markdown fences) so outputs can be safely `JSON.parse()`d
- Stage 3 (letter generation) should respond in plain text only
- Stage 3 must have **extended thinking enabled** — the model synthesizes company + role signals in its thinking block before writing the letter
- System prompts for each stage should be kept in the same file as the stage function, as a `const SYSTEM_PROMPT` at the top — easy to iterate
- Web search tool should be enabled only for Stage 1 (macro research); all other stages use standard completion
- **All JSON output prompts must include field length constraints** (1–2 sentences per string field, capped list lengths) to control token usage
- Token budgets per stage:
  - Resume extraction (Haiku): `maxTokens: 800`
  - Stage 1 — Macro Research (Sonnet): `maxTokens: 1000`
  - Stage 2 — Micro Parsing (Haiku): `maxTokens: 1000`
  - Stage 3 — Letter Generation (Sonnet): `maxTokens: 1000`, `thinking.budgetTokens: 5000`

---

## Error Handling

- If job URL is inaccessible (paywalled, 404): return a clear error before running any pipeline stages
- If web search returns no useful company data: continue with what's available, note in the company brief that information was limited
- If resume parse fails: return a helpful error asking the user to try a different file format
- If any pipeline stage fails: emit an SSE error event with the stage name and a user-friendly message; do not silently fall through
- If the resume extraction pre-step fails: fall back to sending the raw resume text into Stage 3 (graceful degradation)
