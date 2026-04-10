# Cover Letter Generator

An AI-powered web application that generates highly tailored, professional cover letters in seconds. Simply upload your resume (PDF/DOCX) and paste a job posting URL. The application uses a multi-stage Anthropic Claude pipeline to research the company, parse the specific job requirements, and synthesize a polished, personalized cover letter.

## Features

- **Document Parsing:** Upload resumes and personal bios in `.pdf` or `.docx` format.
- **Smart Job Fetching:** Automatically fetches and safely extracts text from job posting URLs.
- **Multi-Stage AI Pipeline:** 
  - Extracts and condenses your resume (`claude-haiku`).
  - Researches the company's background and recent developments (`claude-sonnet` + web search).
  - Parses the job description for hard/soft requirements (`claude-haiku`).
  - Synthesizes all context into a strategic, 3-4 paragraph cover letter using extended model thinking (`claude-sonnet`).
- **Real-Time Streaming:** Uses Server-Sent Events (SSE) to display a live pipeline progress tracker.
- **Modern UI:** Built with React and Vite featuring a glassmorphic design system and dark mode aesthetics.
- **Multiple Exports:** One-click copy or download your finished letter as a `.docx` or Markdown file.

## Tech Stack

- **Frontend:** React, Vite, Vanilla CSS 
- **Backend:** Node.js, Express, Multer
- **AI Integration:** `@anthropic-ai/sdk`
- **File Parsing:** `pdf-parse`, `mammoth`
- **Document Generation:** `docx`

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v16+)
- An [Anthropic API Key](https://console.anthropic.com/)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone git@github.com:tsh39/cover-letter-generator.git
   cd cover-letter-generator
   ```

2. **Set up Environment Variables:**
   Copy the example `.env` file and add your Anthropic API key.
   ```bash
   cp .env.example .env
   ```
   *Open `.env` in a text editor and add your key:* `ANTHROPIC_API_KEY=sk-ant-...`

3. **Install Dependencies:**
   Install both server and client dependencies.
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

4. **Run the Application:**
   Starts both the Express backend and Vite frontend development servers.
   ```bash
   npm run dev
   ```

5. **Open in Browser:**
   Navigate to `http://localhost:5173` in your browser.

---

## Architecture Overview

To process large amounts of text affordably and quickly, the application utilizes a structured token-optimized AI pipeline.

```text
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

- **Caching:** The resume extraction step only runs once per session and caches the result locally.
- **Parallelism:** Company research (Macro) and JD analysis (Micro) are executed concurrently via `Promise.all`.
- **Token Economy:** Raw text inputs are strictly bounded, and intermediate stages output concise JSON payloads rather than unbounded text, keeping the final generation context highly relevant.
