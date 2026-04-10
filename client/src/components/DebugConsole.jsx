import { useState, useRef, useEffect } from 'react';

const LEVEL_STYLES = {
  info:  { color: 'var(--accent-indigo)', icon: 'ℹ' },
  debug: { color: 'var(--text-muted)',    icon: '⚙' },
  warn:  { color: 'var(--accent-amber)',  icon: '⚠' },
  error: { color: 'var(--accent-rose)',   icon: '✕' },
};

export default function DebugConsole({ logs }) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If user scrolled up, disable auto-scroll; re-enable if at bottom
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 30);
  };

  if (logs.length === 0) return null;

  return (
    <div className={`debug-console ${isOpen ? 'open' : 'collapsed'}`}>
      <button
        className="debug-console-toggle"
        onClick={() => setIsOpen(!isOpen)}
        id="debug-console-toggle"
      >
        <span className="debug-console-toggle-icon">
          {isOpen ? '▼' : '▶'}
        </span>
        <span className="debug-console-toggle-label">
          🔬 Debug Console
        </span>
        <span className="debug-console-count">{logs.length}</span>
      </button>

      {isOpen && (
        <div
          className="debug-console-body"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {logs.map((log, i) => {
            const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
            return (
              <div key={i} className={`debug-log-entry debug-level-${log.level}`}>
                <span className="debug-log-time" title={log.timestamp}>
                  +{log.elapsed}s
                </span>
                <span className="debug-log-icon" style={{ color: style.color }}>
                  {style.icon}
                </span>
                <span className="debug-log-message">
                  {log.message}
                </span>
                {log.details && (
                  <span className="debug-log-details" title={JSON.stringify(log.details, null, 2)}>
                    {formatDetails(log.details)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDetails(details) {
  if (typeof details === 'string') return details;
  // Show key=value pairs compactly
  return Object.entries(details)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}=[${v.length}]`;
      if (typeof v === 'object') return `${k}={...}`;
      return `${k}=${v}`;
    })
    .join('  ');
}
