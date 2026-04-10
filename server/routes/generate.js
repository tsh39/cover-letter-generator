import { Router } from 'express';
import { getFilePaths, loadCachedResume, saveCachedResume } from '../storage/userFiles.js';
import { parseResume } from '../utils/parseResume.js';
import { fetchJob } from '../pipeline/fetchJob.js';
import { extractResume } from '../pipeline/extractResume.js';
import { macroResearch } from '../pipeline/macroResearch.js';
import { microParsing } from '../pipeline/microParsing.js';
import { letterGeneration } from '../pipeline/letterGeneration.js';

export const generateRouter = Router();

generateRouter.post('/', async (req, res) => {
  const { jobUrl, sessionId } = req.body;

  // Validate inputs
  if (!jobUrl || !sessionId) {
    return res.status(400).json({ error: 'jobUrl and sessionId are required.' });
  }

  try {
    new URL(jobUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid job URL format.' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const pipelineStart = Date.now();

  function sendEvent(data) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  /** Send a debug log event to the frontend */
  function sendLog(level, message, details = null) {
    const elapsed = ((Date.now() - pipelineStart) / 1000).toFixed(2);
    const logData = {
      stage: 'log',
      level,       // 'info' | 'warn' | 'error' | 'debug'
      message,
      elapsed,     // seconds since pipeline start
      timestamp: new Date().toISOString(),
    };
    if (details) logData.details = details;
    sendEvent(logData);
    // Also log to server console for debugging
    const prefix = `[+${elapsed}s] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`, details ? JSON.stringify(details).slice(0, 200) : '');
  }

  try {
    // Get uploaded files
    const filePaths = getFilePaths(sessionId);
    if (!filePaths.resume) {
      sendLog('error', 'No resume found in session');
      sendEvent({ stage: 'error', message: 'No resume found. Please upload your resume first.' });
      res.end();
      return;
    }
    sendLog('info', 'Session validated', { sessionId, hasResume: true, hasBio: !!filePaths.bio });

    // Parse resume text from file
    sendLog('info', 'Parsing resume file from disk...');
    let resumeText;
    try {
      resumeText = await parseResume(filePaths.resume);
      sendLog('info', `Resume parsed successfully`, { textLength: resumeText.length });
    } catch (err) {
      sendLog('error', `Resume parsing failed: ${err.message}`);
      sendEvent({ stage: 'error', message: `Resume parsing failed: ${err.message}` });
      res.end();
      return;
    }

    // Parse bio if uploaded
    let bioText = null;
    if (filePaths.bio) {
      sendLog('info', 'Parsing bio file...');
      try {
        bioText = await parseResume(filePaths.bio);
        sendLog('info', 'Bio parsed successfully', { textLength: bioText.length });
      } catch (err) {
        sendLog('warn', `Bio parsing failed, continuing without it: ${err.message}`);
      }
    }

    // Fetch job posting
    sendEvent({ stage: 'fetch', status: 'running' });
    sendLog('info', `Fetching job posting from: ${jobUrl}`);
    let jobText, companyDomain;
    const fetchStart = Date.now();
    try {
      const jobData = await fetchJob(jobUrl);
      jobText = jobData.rawText;
      companyDomain = jobData.companyDomain;
      sendLog('info', `Job posting fetched`, {
        elapsed: `${((Date.now() - fetchStart) / 1000).toFixed(2)}s`,
        textLength: jobText.length,
        companyDomain,
      });
    } catch (err) {
      sendLog('error', `Job fetch failed: ${err.message}`);
      sendEvent({ stage: 'error', message: err.message });
      res.end();
      return;
    }
    sendEvent({ stage: 'fetch', status: 'done' });

    // Pre-step: Extract resume (with caching)
    sendEvent({ stage: 'extract', status: 'running' });
    let condensedResume = loadCachedResume(sessionId);
    if (condensedResume) {
      sendLog('info', 'Using cached condensed resume');
      sendEvent({ stage: 'extract', status: 'done', cached: true });
    } else {
      sendLog('info', 'No cached resume found, extracting via Claude Haiku...');
      const extractStart = Date.now();
      try {
        condensedResume = await extractResume(resumeText);
        const extractElapsed = ((Date.now() - extractStart) / 1000).toFixed(2);
        sendLog('info', `Resume extracted successfully`, {
          elapsed: `${extractElapsed}s`,
          model: 'claude-haiku-4-5',
          fields: Object.keys(condensedResume),
        });
        saveCachedResume(sessionId, condensedResume);
        sendLog('debug', 'Condensed resume cached for future use');
      } catch (err) {
        sendLog('warn', `Resume extraction failed, using raw text fallback: ${err.message}`);
        condensedResume = null;
      }
      sendEvent({ stage: 'extract', status: 'done' });
    }

    // Stages 1 & 2 in parallel
    sendEvent({ stage: 'macro', status: 'running' });
    sendEvent({ stage: 'micro', status: 'running' });
    sendLog('info', 'Starting parallel pipeline: macro research + micro parsing');

    const macroStart = Date.now();
    const microStart = Date.now();

    const [companyBrief, jdParse] = await Promise.all([
      (async () => {
        sendLog('info', `[Macro] Calling Claude Sonnet for company research`, {
          model: 'claude-sonnet-4-6',
          companyDomain,
          jobExcerptLength: Math.min(jobText.length, 500),
        });
        try {
          const result = await macroResearch(companyDomain, jobText);
          const macroElapsed = ((Date.now() - macroStart) / 1000).toFixed(2);
          sendLog('info', `[Macro] Company research complete`, {
            elapsed: `${macroElapsed}s`,
            companyName: result.companyName || 'unknown',
            fields: Object.keys(result),
          });
          sendEvent({ stage: 'macro', status: 'done' });
          return result;
        } catch (err) {
          sendLog('error', `[Macro] Company research failed: ${err.message}`);
          sendEvent({ stage: 'macro', status: 'error', message: err.message });
          throw err;
        }
      })(),
      (async () => {
        sendLog('info', `[Micro] Calling Claude Haiku for JD parsing`, {
          model: 'claude-haiku-4-5',
          jobTextLength: jobText.length,
        });
        try {
          const result = await microParsing(jobText);
          const microElapsed = ((Date.now() - microStart) / 1000).toFixed(2);
          sendLog('info', `[Micro] JD parsing complete`, {
            elapsed: `${microElapsed}s`,
            roleTitle: result.roleTitle || 'unknown',
            fields: Object.keys(result),
          });
          sendEvent({ stage: 'micro', status: 'done' });
          return result;
        } catch (err) {
          sendLog('error', `[Micro] JD parsing failed: ${err.message}`);
          sendEvent({ stage: 'micro', status: 'error', message: err.message });
          throw err;
        }
      })(),
    ]);

    // Stage 3: Generate letter
    sendEvent({ stage: 'generation', status: 'running' });
    sendLog('info', 'Starting cover letter generation with extended thinking', {
      model: 'claude-sonnet-4-6',
      thinkingBudget: 8000,
      hasBio: !!bioText,
      usingCondensedResume: !!condensedResume,
    });
    const genStart = Date.now();
    const letter = await letterGeneration(
      companyBrief,
      jdParse,
      condensedResume || resumeText,
      bioText
    );
    const genElapsed = ((Date.now() - genStart) / 1000).toFixed(2);
    sendLog('info', `Cover letter generated`, {
      elapsed: `${genElapsed}s`,
      letterLength: letter.length,
      wordCount: letter.split(/\s+/).length,
    });
    sendEvent({ stage: 'generation', status: 'done', data: letter });

    // Signal completion
    const totalElapsed = ((Date.now() - pipelineStart) / 1000).toFixed(2);
    sendLog('info', `Pipeline complete!`, { totalElapsed: `${totalElapsed}s` });
    sendEvent({ stage: 'complete', status: 'done' });

  } catch (err) {
    console.error('Pipeline error:', err);
    sendLog('error', `Pipeline error: ${err.message}`, { stack: err.stack?.split('\n').slice(0, 3) });
    sendEvent({ stage: 'error', message: err.message || 'An unexpected error occurred.' });
  }

  res.end();
});
