import { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import JobInput from './components/JobInput';
import PipelineStatus from './components/PipelineStatus';
import DebugConsole from './components/DebugConsole';
import LetterDisplay from './components/LetterDisplay';
import ExportMenu from './components/ExportMenu';
import './App.css';

const VIEWS = {
  UPLOAD: 'upload',
  GENERATE: 'generate',
  RESULT: 'result',
};

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [currentView, setCurrentView] = useState(VIEWS.UPLOAD);
  const [stages, setStages] = useState({});
  const [letterText, setLetterText] = useState('');
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [error, setError] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  const handleUploadComplete = useCallback((sid) => {
    setSessionId(sid);
    setCurrentView(VIEWS.GENERATE);
    setLetterText('');
    setStages({});
    setError(null);
    setDebugLogs([]);
  }, []);

  const handleGenerate = useCallback(async (jobUrl) => {
    setPipelineRunning(true);
    setStages({});
    setLetterText('');
    setError(null);
    setDebugLogs([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation pipeline.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              // Capture debug log events
              if (event.stage === 'log') {
                setDebugLogs(prev => [...prev, event]);
                continue;
              }

              if (event.stage === 'error') {
                setError(event.message);
                setPipelineRunning(false);
                return;
              }

              if (event.stage === 'complete') {
                setPipelineRunning(false);
                setCurrentView(VIEWS.RESULT);
                return;
              }

              // Update stage status
              if (event.status === 'cached') {
                setStages(prev => ({ ...prev, [event.stage]: 'cached' }));
              } else if (event.status) {
                setStages(prev => ({ ...prev, [event.stage]: event.status }));
              }

              // Capture letter text
              if (event.stage === 'generation' && event.status === 'done' && event.data) {
                setLetterText(event.data);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    }

    setPipelineRunning(false);
  }, [sessionId]);

  const handleStartOver = () => {
    setCurrentView(VIEWS.UPLOAD);
    setStages({});
    setLetterText('');
    setError(null);
    setDebugLogs([]);
    setSessionId(null);
  };

  const handleNewJob = () => {
    setCurrentView(VIEWS.GENERATE);
    setStages({});
    setLetterText('');
    setError(null);
    setDebugLogs([]);
  };

  const stepIndex = currentView === VIEWS.UPLOAD ? 0 : currentView === VIEWS.GENERATE ? 1 : 2;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Cover Letter Generator</h1>
        <p className="app-subtitle">
          AI-powered, personalized cover letters in seconds
        </p>
      </header>

      {/* Step indicator */}
      <div className="steps">
        <div className="step">
          <div className={`step-dot ${stepIndex >= 0 ? (stepIndex > 0 ? 'completed' : 'active') : ''}`} />
        </div>
        <div className={`step-line ${stepIndex > 0 ? 'completed' : ''}`} />
        <div className="step">
          <div className={`step-dot ${stepIndex >= 1 ? (stepIndex > 1 ? 'completed' : 'active') : ''}`} />
        </div>
        <div className={`step-line ${stepIndex > 1 ? 'completed' : ''}`} />
        <div className="step">
          <div className={`step-dot ${stepIndex >= 2 ? 'active' : ''}`} />
        </div>
      </div>

      <div className="app-content">
        {/* Upload View */}
        {currentView === VIEWS.UPLOAD && (
          <FileUpload
            onUploadComplete={handleUploadComplete}
            sessionId={sessionId}
          />
        )}

        {/* Generate View */}
        {currentView === VIEWS.GENERATE && (
          <>
            <JobInput onSubmit={handleGenerate} disabled={pipelineRunning} />
            {(pipelineRunning || Object.keys(stages).length > 0) && (
              <PipelineStatus stages={stages} />
            )}
            {debugLogs.length > 0 && (
              <DebugConsole logs={debugLogs} />
            )}
            {error && (
              <div className="error-banner view-enter">⚠️ {error}</div>
            )}
          </>
        )}

        {/* Result View */}
        {currentView === VIEWS.RESULT && (
          <>
            <div className="card view-enter" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
              <div className="success-indicator" style={{ justifyContent: 'center', fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>
                ✨ Your cover letter is ready!
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Export it below and make any final edits in your preferred editor.
              </p>
            </div>

            <LetterDisplay letterText={letterText} />
            <ExportMenu letterText={letterText} sessionId={sessionId} />

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleNewJob}>
                Try Another Job
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleStartOver}>
                Start Over
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
