const STAGE_CONFIG = {
  fetch: { label: 'Fetching job posting', icon: '🌐' },
  extract: { label: 'Analyzing your resume', icon: '📋' },
  macro: { label: 'Researching company', icon: '🔍' },
  micro: { label: 'Parsing job requirements', icon: '📝' },
  generation: { label: 'Writing your cover letter', icon: '✍️' },
};

export default function PipelineStatus({ stages }) {
  const getStatus = (stageId) => stages[stageId] || 'idle';

  const renderStage = (stageId) => {
    const config = STAGE_CONFIG[stageId];
    const status = getStatus(stageId);
    const isCached = status === 'cached';
    const displayStatus = isCached ? 'done' : status;

    return (
      <div
        key={stageId}
        className={`pipeline-stage ${displayStatus}`}
      >
        <div className={`stage-indicator ${displayStatus}`}>
          {displayStatus === 'idle' && <span style={{ opacity: 0.4 }}>○</span>}
          {displayStatus === 'running' && <span className="spinner" />}
          {displayStatus === 'done' && '✓'}
          {displayStatus === 'error' && '✕'}
        </div>
        <span className="stage-label">
          {config.icon} {config.label}
          {displayStatus === 'running' && '...'}
        </span>
        {displayStatus === 'done' && !isCached && (
          <span className="stage-badge">Done</span>
        )}
        {isCached && (
          <span className="stage-badge cached">Cached</span>
        )}
      </div>
    );
  };

  return (
    <div className="card view-enter">
      <h2 className="card-title">⚡ Pipeline Progress</h2>
      <div className="pipeline">
        {renderStage('fetch')}
        {renderStage('extract')}
        <div className="parallel-group">
          {renderStage('macro')}
          {renderStage('micro')}
        </div>
        {renderStage('generation')}
      </div>
    </div>
  );
}
