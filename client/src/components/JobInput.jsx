import { useState } from 'react';

export default function JobInput({ onSubmit, disabled }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a job posting URL.');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (e.g., https://company.com/jobs/...)');
      return;
    }

    onSubmit(url.trim());
  };

  return (
    <div className="card view-enter">
      <h2 className="card-title">🔗 Job Posting URL</h2>
      <form onSubmit={handleSubmit}>
        <div className="job-input-wrapper">
          <input
            id="job-url-input"
            type="url"
            className="job-input"
            placeholder="https://company.com/careers/role..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            disabled={disabled}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={disabled || !url.trim()}
          >
            {disabled ? (
              <>
                <span className="spinner" /> Running...
              </>
            ) : (
              'Generate ✨'
            )}
          </button>
        </div>
        {error && <div className="error-banner" style={{ marginTop: 'var(--space-md)' }}>⚠️ {error}</div>}
      </form>
    </div>
  );
}
