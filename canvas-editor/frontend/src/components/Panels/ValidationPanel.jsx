import React, { useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, ChevronRight, AlertTriangle, XCircle, Info } from 'lucide-react';
import useEditorStore from '../../store/useEditorStore.js';
import { severityColor, severityIcon, Severity } from '../../utils/validationUtils.js';
import { validateApi } from '../../services/api.js';
import toast from 'react-hot-toast';

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const color = severityColor(severity);
  const Icon  = severity === Severity.ERROR   ? XCircle
              : severity === Severity.WARNING ? AlertTriangle
              : Info;

  return (
    <span style={{
      display:     'inline-flex',
      alignItems:  'center',
      gap:         3,
      fontSize:    10,
      fontWeight:  700,
      padding:     '2px 5px',
      borderRadius: 4,
      background:  `${color}22`,
      color,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      <Icon size={9} />
      {severity}
    </span>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ summary, isValid }) {
  const { errors = 0, warnings = 0, infos = 0 } = summary || {};

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            8,
      padding:        '8px 12px',
      background:     isValid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      borderBottom:   '1px solid var(--border)',
      flexShrink:     0,
    }}>
      {isValid
        ? <ShieldCheck size={16} color="var(--success)" />
        : <ShieldX     size={16} color="var(--danger)"  />
      }
      <span style={{ fontSize: 12, fontWeight: 600, color: isValid ? 'var(--success)' : 'var(--danger)', flex: 1 }}>
        {isValid ? 'Template is valid' : 'Issues found'}
      </span>
      {errors   > 0 && <Chip n={errors}   color="var(--danger)"  label="error"   />}
      {warnings > 0 && <Chip n={warnings} color="var(--warning)" label="warning" />}
      {infos    > 0 && <Chip n={infos}    color="var(--text-muted)" label="info" />}
    </div>
  );
}

function Chip({ n, color, label }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 6px',
      borderRadius: 10, background: `${color}22`, color,
    }}>
      {n} {label}{n !== 1 ? 's' : ''}
    </span>
  );
}

// ── Issue row ─────────────────────────────────────────────────────────────────

function IssueRow({ issue, onSelect }) {
  const { severity, message, fix, elementName, pageName, elementId } = issue;
  const color = severityColor(severity);

  return (
    <div
      onClick={() => elementId && onSelect(elementId)}
      style={{
        padding:      '8px 12px',
        borderBottom: '1px solid var(--border)',
        cursor:        elementId ? 'pointer' : 'default',
        transition:   'background 0.12s',
      }}
      onMouseEnter={(e) => { if (elementId) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Severity stripe */}
        <div style={{ width: 3, minHeight: 36, background: color, borderRadius: 2, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <SeverityBadge severity={severity} />
            {pageName && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {pageName}{elementName ? ` › ${elementName}` : ''}
              </span>
            )}
            {elementId && (
              <ChevronRight size={10} style={{ marginLeft: 'auto', color: 'var(--text-muted)', flexShrink: 0 }} />
            )}
          </div>

          {/* Message */}
          <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: fix ? 4 : 0 }}>
            {message}
          </p>

          {/* Fix hint */}
          {fix && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
              <strong style={{ color: 'var(--accent)', marginRight: 3 }}>Fix:</strong>
              {fix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Issue group by severity ───────────────────────────────────────────────────

function IssueGroup({ label, issues, onSelect, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  if (!issues.length) return null;

  const groupColor =
    label === 'error'   ? 'var(--danger)'  :
    label === 'warning' ? 'var(--warning)' : 'var(--text-muted)';

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width:       '100%',
          display:     'flex',
          alignItems:  'center',
          padding:     '6px 12px',
          background:  'var(--bg-tertiary)',
          border:      'none',
          borderBottom: '1px solid var(--border)',
          cursor:      'pointer',
          gap:         6,
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, color: groupColor,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {label}s ({issues.length})
        </span>
        <ChevronRight
          size={12}
          style={{ marginLeft: 'auto', color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>
      {open && issues.map((iss) => (
        <IssueRow key={iss.id} issue={iss} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      justifyContent: 'center',
      padding:       40,
      gap:           12,
      height:        '100%',
      color:         'var(--text-muted)',
      textAlign:     'center',
    }}>
      <ShieldCheck size={40} style={{ opacity: 0.3 }} />
      <p style={{ fontSize: 13, fontWeight: 500 }}>No validation run yet</p>
      <p style={{ fontSize: 11 }}>
        Click <strong style={{ color: 'var(--accent)' }}>Validate</strong> in the toolbar to analyse your template.
      </p>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function ValidationPanel() {
  const store      = useEditorStore();
  const { validation, runValidation, setSelectedIds, setUI } = store;
  const { report, isRunning, lastRun, autoValidate } = validation;

  // Server-side validation (authoritative, used before PDF export)
  const runServerValidation = useCallback(async () => {
    const template = store.getTemplateJSON();
    const tid = toast.loading('Running server validation…');
    try {
      const serverReport = await validateApi.validate(template);
      toast.success(
        serverReport.isValid ? 'Template passed all checks ✓' : `Found ${serverReport.summary.errors} error(s)`,
        { id: tid }
      );
      // Merge server report into store
      store.runValidation(); // also run client-side to sync UI
    } catch (err) {
      toast.error(`Validation failed: ${err.message}`, { id: tid });
    }
  }, [store]);

  // Select element on canvas when user clicks an issue
  const handleSelectElement = useCallback((elementId) => {
    setSelectedIds([elementId]);
    // Switch to select tool and show canvas
    store.setActiveTool('select');
  }, [setSelectedIds, store]);

  const errors   = report?.issues.filter((i) => i.severity === Severity.ERROR)   || [];
  const warnings = report?.issues.filter((i) => i.severity === Severity.WARNING) || [];
  const infos    = report?.issues.filter((i) => i.severity === Severity.INFO)    || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        padding:    '6px 10px',
        gap:        6,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
      }}>
        <button
          className="btn btn-primary"
          style={{ fontSize: 11, padding: '4px 10px' }}
          onClick={runValidation}
          disabled={isRunning}
        >
          <RefreshCw size={11} style={{ animation: isRunning ? 'spin 1s linear infinite' : 'none' }} />
          Validate
        </button>

        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: '4px 8px' }}
          onClick={runServerValidation}
          title="Run full server-side validation (authoritative)"
        >
          <ShieldAlert size={11} /> Full Check
        </button>

        <div style={{ flex: 1 }} />

        {lastRun && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {new Date(lastRun).toLocaleTimeString()}
          </span>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoValidate}
            onChange={(e) => store.setAutoValidate(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 11, height: 11 }}
          />
          Auto
        </label>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────────────── */}
      {report && <SummaryBar summary={report.summary} isValid={report.isValid} />}

      {/* ── Issues list ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!report ? (
          <EmptyState />
        ) : (
          <>
            <IssueGroup label="error"   issues={errors}   onSelect={handleSelectElement} defaultOpen />
            <IssueGroup label="warning" issues={warnings} onSelect={handleSelectElement} defaultOpen />
            <IssueGroup label="info"    issues={infos}    onSelect={handleSelectElement} defaultOpen={false} />

            {report.issues.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <ShieldCheck size={32} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>No issues found</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Your template passed all validation checks.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}