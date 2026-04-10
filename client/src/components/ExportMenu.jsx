import { useState } from 'react';

export default function ExportMenu({ letterText, sessionId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = letterText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMd = () => {
    const blob = new Blob([letterText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover_letter.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = () => {
    const encodedText = encodeURIComponent(letterText);
    window.open(`/api/export/${sessionId}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="export-menu view-enter">
      <button
        className={`export-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        id="export-copy"
      >
        {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
      </button>
      <button className="export-btn" onClick={handleDownloadMd} id="export-md">
        📝 Download .md
      </button>
      <button className="export-btn" onClick={handleDownloadDocx} id="export-docx">
        📄 Download .docx
      </button>
    </div>
  );
}
