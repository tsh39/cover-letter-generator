import { useState, useRef } from 'react';

export default function FileUpload({ onUploadComplete, sessionId }) {
  const [files, setFiles] = useState({ resume: null, bio: null, sample: null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragover, setDragover] = useState(false);
  const resumeRef = useRef(null);
  const bioRef = useRef(null);
  const sampleRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const resumeFile = droppedFiles.find(f => 
      f.name.endsWith('.pdf') || f.name.endsWith('.docx')
    );
    if (resumeFile) {
      setFiles(prev => ({ ...prev, resume: resumeFile }));
    }
  };

  const handleFileChange = (field, e) => {
    if (e.target.files[0]) {
      setFiles(prev => ({ ...prev, [field]: e.target.files[0] }));
    }
  };

  const handleUpload = async () => {
    if (!files.resume) {
      setError('Please select your resume first.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('resume', files.resume);
    if (files.bio) formData.append('bio', files.bio);
    if (files.sample) formData.append('sample', files.sample);
    if (sessionId) formData.append('sessionId', sessionId);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed.');
        } else {
          // If the backend is down, Vite proxy returns a 504 Gateway Timeout HTML page
          throw new Error(`Server connection failed (HTTP ${res.status}). Ensure the backend server is running.`);
        }
      }

      const data = await res.json();
      onUploadComplete(data.sessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card view-enter">
      <h2 className="card-title">📄 Upload Your Files</h2>

      <div
        className={`upload-zone ${dragover ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        onClick={() => resumeRef.current?.click()}
      >
        <div className="upload-zone-icon">⬆️</div>
        <p className="upload-zone-text">
          <strong>Drop your resume here</strong> or click to browse
          <br />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            PDF or DOCX — required
          </span>
        </p>
        <input
          ref={resumeRef}
          type="file"
          accept=".pdf,.docx"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange('resume', e)}
        />
      </div>

      {/* File list */}
      <div className="file-list">
        {files.resume && (
          <div className="file-item">
            <span className="file-item-icon">✓</span>
            <span className="file-item-name">{files.resume.name}</span>
            <span className="file-item-label">Resume</span>
          </div>
        )}
        {files.bio && (
          <div className="file-item">
            <span className="file-item-icon">✓</span>
            <span className="file-item-name">{files.bio.name}</span>
            <span className="file-item-label">Bio</span>
          </div>
        )}
        {files.sample && (
          <div className="file-item">
            <span className="file-item-icon">✓</span>
            <span className="file-item-name">{files.sample.name}</span>
            <span className="file-item-label">Sample</span>
          </div>
        )}
      </div>

      {/* Optional file buttons */}
      <div className="optional-files">
        <button className="optional-btn" onClick={() => bioRef.current?.click()}>
          + Bio {files.bio ? '✓' : '(optional)'}
        </button>
        <button className="optional-btn" onClick={() => sampleRef.current?.click()}>
          + Writing Sample {files.sample ? '✓' : '(optional)'}
        </button>
        <input
          ref={bioRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange('bio', e)}
        />
        <input
          ref={sampleRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange('sample', e)}
        />
      </div>

      {error && <div className="error-banner" style={{ marginTop: 'var(--space-md)' }}>⚠️ {error}</div>}

      <button
        className="btn btn-primary"
        style={{ marginTop: 'var(--space-lg)', width: '100%' }}
        onClick={handleUpload}
        disabled={!files.resume || uploading}
      >
        {uploading ? (
          <>
            <span className="spinner" /> Uploading...
          </>
        ) : (
          'Upload & Continue'
        )}
      </button>
    </div>
  );
}
