# Cover Letter Generator — Project Progress

> **Last updated:** 2026-04-09  
> **Status:** ✅ Implementation Complete — Ready for End-to-End Testing  
> **Spec:** [cover_letter_geneator_spec.md](./cover_letter_geneator_spec.md)

---

## Key Decisions

| Decision | Value |
|---|---|
| Sonnet model | `claude-sonnet-4-6` |
| Haiku model | `claude-haiku-4-5-latest` |
| Web search tool | `web_search_20260209` |
| Web search limit | 100 max per request |
| Iteration support | None — single generation, user edits externally |
| Resume extraction | Cached per session, reused unless new resume uploaded |
| Design | Dark mode, glassmorphic, Inter + Lora fonts |
| Vite version | 6.x (Node 22.6 compatibility) |

---

## Phase 1 — Project Scaffold ✅
- [x] Create root `package.json` with all dependencies
- [x] Create `.env` template
- [x] Scaffold Vite + React client
- [x] Configure `client/vite.config.js` with API proxy to `:3001`
- [x] Create `server/index.js` (Express entry point, route mounting, CORS, dotenv)

## Phase 2 — File Upload & Resume Parsing ✅
- [x] Implement `server/utils/parseResume.js` (PDF via `pdf-parse`, DOCX via `mammoth`)
- [x] Implement `server/storage/userFiles.js` (save/get/cleanup + resume extraction caching)
- [x] Implement `server/routes/upload.js` (`POST /api/upload`, multer, re-upload support)
- [x] Implement `client/src/components/FileUpload.jsx` (drag-and-drop, upload status)

## Phase 3 — Job Fetching ✅
- [x] Implement `server/pipeline/fetchJob.js` (fetch URL, strip HTML, truncate at 8K chars)

## Phase 4 — AI Pipeline Stages ✅
- [x] Implement `server/pipeline/extractResume.js` (Haiku, resume condensation)
- [x] Implement `server/pipeline/macroResearch.js` (Sonnet, web search capped at 100)
- [x] Implement `server/pipeline/microParsing.js` (Haiku, JD structured extraction)
- [x] Implement `server/pipeline/letterGeneration.js` (Sonnet, extended thinking)

## Phase 5 — SSE Streaming & Pipeline Orchestration ✅
- [x] Implement `server/routes/generate.js` (SSE endpoint, pipeline orchestration)
- [x] Wire resume extraction caching (load/save `extractedResume.json`)
- [x] Implement parallel execution of Stages 1 & 2 via `Promise.all()`

## Phase 6 — Frontend Components ✅
- [x] Implement `client/src/App.jsx` (main shell, 3-view state management, SSE parsing)
- [x] Implement `client/src/components/JobInput.jsx` (URL input, validation)
- [x] Implement `client/src/components/PipelineStatus.jsx` (SSE progress, parallel display)
- [x] Implement `client/src/components/LetterDisplay.jsx` (read-only, serif letter display)
- [x] Implement `client/src/components/ExportMenu.jsx` (copy, .md, .docx export)

## Phase 7 — Export ✅
- [x] Implement `server/utils/exportDocx.js` (Times New Roman, 12pt, 1" margins)
- [x] Implement `server/routes/export.js` (`GET /api/export/:sessionId`)

## Phase 8 — Styling & Polish ✅
- [x] Create design system in `client/src/index.css` (dark mode, glassmorphism, gradients)
- [x] Add pipeline stage animations (pulse-glow while running, spinner, checkmark)
- [x] Add view transition animations (fadeSlideIn between app states)
- [x] Add drag-and-drop hover effects for file upload
- [x] Add button micro-interactions (translateY, glow)
- [x] Implement error states (banners, inline validation)
- [x] Implement session cleanup on server startup (TTL-based)
- [x] Responsive design pass (mobile breakpoint at 640px)

## Verification
- [x] Client build passes (Vite 6)
- [x] Server starts + health check passes
- [ ] End-to-end flow test with real resume + real job URL
- [ ] Pipeline parallelism verification (Stages 1 & 2 concurrent)
- [ ] Error handling tests (invalid URL, missing resume, oversized files)
- [ ] Export verification (.docx opens correctly)
- [ ] Responsive design check

---

## How to Run

```bash
# 1. Set up your environment variables
#    Copy .env.example to .env and add your Anthropic API key
cp .env.example .env
#    (Edit .env to set ANTHROPIC_API_KEY=sk-ant-...)

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Run both client and server
npm run dev
```

The client runs on `http://localhost:5173` and proxies API calls to the Express server on `:3001`.

---

## Architecture Summary

```
Pipeline Flow:
  Upload Resume ──► Extract Resume (Haiku, cached)
                         │
              ┌──────────┼──────────┐
              ▼                     ▼
      Macro Research         Micro Parsing
      (Sonnet + web)          (Haiku)
              │                     │
              └──────────┬──────────┘
                         ▼
              Letter Generation
              (Sonnet + thinking)
                         │
                         ▼
                  Cover Letter
```

**Models used:**
- `claude-sonnet-4-6` → Stage 1 (Macro Research), Stage 3 (Letter Generation)
- `claude-haiku-4-5-latest` → Pre-step (Resume Extraction), Stage 2 (Micro Parsing)

**Token optimization strategies:**
- Resume extraction cached per session (skip Haiku call on repeated generations)
- Stages 1 & 2 run in parallel (no wasted sequential time)
- Old synthesis stage merged into Stage 3 via extended thinking
- Tight JSON field length constraints on all extraction stages
- Haiku used for structured extraction tasks (cheaper than Sonnet)
- Web search capped at 100 uses
- Job text truncated to ~8,000 chars to bound input tokens

---

## File Map

```
cover-letter-gen/
├── client/
│   ├── src/
│   │   ├── App.jsx                    # Main app shell, 3-view flow
│   │   ├── App.css                    # Minimal overrides
│   │   ├── index.css                  # Full design system
│   │   ├── main.jsx                   # React entry point
│   │   └── components/
│   │       ├── FileUpload.jsx         # Drag-and-drop resume upload
│   │       ├── JobInput.jsx           # URL input + validation
│   │       ├── PipelineStatus.jsx     # Live SSE progress tracker
│   │       ├── LetterDisplay.jsx      # Read-only letter display
│   │       └── ExportMenu.jsx         # Copy/MD/DOCX export
│   ├── index.html                     # HTML template with SEO meta
│   └── vite.config.js                 # Vite config with API proxy
├── server/
│   ├── index.js                       # Express entry, route mounting
│   ├── routes/
│   │   ├── upload.js                  # POST /api/upload
│   │   ├── generate.js                # POST /api/generate (SSE)
│   │   └── export.js                  # GET /api/export/:sessionId
│   ├── pipeline/
│   │   ├── fetchJob.js                # HTML fetch + text extraction
│   │   ├── extractResume.js           # Haiku resume condenser
│   │   ├── macroResearch.js           # Sonnet company research
│   │   ├── microParsing.js            # Haiku JD parsing
│   │   └── letterGeneration.js        # Sonnet letter writer
│   ├── utils/
│   │   ├── parseResume.js             # PDF/DOCX text extraction
│   │   └── exportDocx.js             # DOCX file generation
│   └── storage/
│       └── userFiles.js               # File I/O + resume cache
├── .env                               # API key + config
├── .gitignore
├── package.json                       # Root with server deps
├── project_progress.md                # This file
└── cover_letter_geneator_spec.md      # Project specification
```
