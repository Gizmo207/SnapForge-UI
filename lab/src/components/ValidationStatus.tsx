import { useState } from 'react';

export type PostprocessResult = {
  sanitized: boolean;
  appliedRules: string[];
  parseOk: boolean;
  parseErrors: { message: string; line: number | null; column: number | null }[];
};

type ValidationStatusProps = {
  result: PostprocessResult;
  onCopyErrors?: (text: string) => void;
};

export function ValidationBadge({ result }: { result: PostprocessResult }) {
  if (result.parseOk && !result.sanitized) {
    return <span style={styles.badgeGreen}>✓ Clean</span>;
  }
  if (result.parseOk && result.sanitized) {
    return <span style={styles.badgeYellow}>✓ Sanitized</span>;
  }
  return <span style={styles.badgeRed}>✕ Parse Error</span>;
}

export function ValidationPanel({ result, onCopyErrors }: ValidationStatusProps) {
  const [expanded, setExpanded] = useState(false);

  if (result.parseOk && !result.sanitized) {
    return (
      <div style={styles.panel}>
        <span style={styles.statusGreen}>✓ Syntax valid — no fixes needed</span>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      {result.sanitized && (
        <div style={styles.section}>
          <span style={styles.statusYellow}>Auto-fixed {result.appliedRules.length} issue{result.appliedRules.length !== 1 ? 's' : ''}</span>
          <div style={styles.ruleList}>
            {result.appliedRules.map((rule) => (
              <span key={rule} style={styles.rulePill}>{rule}</span>
            ))}
          </div>
        </div>
      )}

      {!result.parseOk && (
        <div style={styles.section}>
          <div style={styles.errorHeader}>
            <span style={styles.statusRed}>
              {result.parseErrors.length} parse error{result.parseErrors.length !== 1 ? 's' : ''}
            </span>
            <button style={styles.expandBtn} onClick={() => setExpanded(!expanded)}>
              {expanded ? '▾ Hide' : '▸ Show'}
            </button>
          </div>
          {expanded && (
            <div style={styles.errorList}>
              {result.parseErrors.map((err, i) => (
                <div key={i} style={styles.errorItem}>
                  {err.line !== null && (
                    <span style={styles.errorLoc}>L{err.line}{err.column !== null ? `:${err.column}` : ''}</span>
                  )}
                  <span style={styles.errorMsg}>{err.message}</span>
                </div>
              ))}
              {onCopyErrors && (
                <button
                  style={styles.copyErrorsBtn}
                  onClick={() => onCopyErrors(
                    result.parseErrors.map((e) =>
                      `${e.line !== null ? `L${e.line}${e.column !== null ? `:${e.column}` : ''}` : ''} ${e.message}`
                    ).join('\n')
                  )}
                >
                  Copy Errors
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statusGreen: {
    fontSize: 12,
    fontWeight: 500,
    color: '#8fffb0',
  },
  statusYellow: {
    fontSize: 12,
    fontWeight: 500,
    color: '#ffe08a',
  },
  statusRed: {
    fontSize: 12,
    fontWeight: 500,
    color: '#ff9090',
  },
  ruleList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  rulePill: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'rgba(255,224,138,0.1)',
    color: 'rgba(255,224,138,0.7)',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandBtn: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
  },
  errorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    background: 'rgba(255,80,80,0.05)',
    border: '1px solid rgba(255,80,80,0.1)',
    maxHeight: 160,
    overflow: 'auto',
  },
  errorItem: {
    display: 'flex',
    gap: 8,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  errorLoc: {
    color: 'rgba(255,150,150,0.8)',
    flexShrink: 0,
    fontWeight: 600,
  },
  errorMsg: {
    color: 'rgba(255,255,255,0.6)',
    wordBreak: 'break-word',
  },
  copyErrorsBtn: {
    marginTop: 4,
    alignSelf: 'flex-end',
    fontSize: 10,
    padding: '3px 10px',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
  },
  badgeGreen: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    background: 'rgba(100,220,140,0.12)',
    color: '#8fffb0',
    border: '1px solid rgba(100,220,140,0.2)',
  },
  badgeYellow: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    background: 'rgba(255,224,138,0.12)',
    color: '#ffe08a',
    border: '1px solid rgba(255,224,138,0.2)',
  },
  badgeRed: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    background: 'rgba(255,80,80,0.12)',
    color: '#ff9090',
    border: '1px solid rgba(255,80,80,0.2)',
  },
};
