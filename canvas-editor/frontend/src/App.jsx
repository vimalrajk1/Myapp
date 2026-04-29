import React, { useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar/Toolbar.jsx';
import CanvasEditor from './components/Canvas/CanvasEditor.jsx';
import LayersPanel from './components/Panels/LayersPanel.jsx';
import PropertiesPanel from './components/Panels/PropertiesPanel.jsx';
import PagesPanel from './components/Panels/PagesPanel.jsx';
import ValidationPanel from './components/Panels/ValidationPanel.jsx';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import useEditorStore from './store/useEditorStore.js';
import { Severity } from './utils/validationUtils.js';
import {
  Layers, FileText, ShieldCheck,
} from 'lucide-react';

export default function App() {
  const stageRef = useRef(null);
  const store    = useEditorStore();
  const { ui, validation, pages } = store;

  // Keyboard shortcuts
  useKeyboardShortcuts(stageRef);

  // Auto-validate whenever pages change (debounced 600 ms)
  useEffect(() => {
    if (!validation.autoValidate) return;
    const timer = setTimeout(() => {
      store.runValidation();
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, validation.autoValidate]);

  // Derive issue badge count (errors + warnings) for the tab indicator
  const report       = validation.report;
  const errorCount   = report?.summary.errors   || 0;
  const warningCount = report?.summary.warnings  || 0;
  const badgeCount   = errorCount + warningCount;

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      width:         '100%',
      height:        '100%',
      overflow:      'hidden',
      background:    'var(--bg-primary)',
    }}>
      {/* ── Top Toolbar ─────────────────────────────────────────────────────── */}
      <Toolbar stageRef={stageRef} />

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        <aside style={{
          width:         'var(--sidebar-w)',
          background:    'var(--bg-secondary)',
          borderRight:   '1px solid var(--border)',
          display:       'flex',
          flexDirection: 'column',
          flexShrink:    0,
          overflow:      'hidden',
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <SidebarTab
              label="Layers"
              icon={<Layers size={12} />}
              active={ui.leftPanel === 'layers'}
              onClick={() => store.setUI({ leftPanel: 'layers' })}
            />
            <SidebarTab
              label="Pages"
              icon={<FileText size={12} />}
              active={ui.leftPanel === 'pages'}
              onClick={() => store.setUI({ leftPanel: 'pages' })}
            />
            <SidebarTab
              label="Issues"
              icon={<ShieldCheck size={12} />}
              active={ui.leftPanel === 'validation'}
              badge={badgeCount}
              badgeColor={errorCount > 0 ? 'var(--danger)' : 'var(--warning)'}
              onClick={() => store.setUI({ leftPanel: 'validation' })}
            />
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {ui.leftPanel === 'layers'     && <LayersPanel />}
            {ui.leftPanel === 'pages'      && <PagesPanel />}
            {ui.leftPanel === 'validation' && <ValidationPanel />}
          </div>
        </aside>

        {/* ── Canvas Area ───────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
          <CanvasEditor stageRef={stageRef} />

          {/* Out-of-bounds / error overlay indicators on canvas */}
          {report && errorCount > 0 && (
            <div style={{
              position:   'absolute',
              bottom:     12,
              right:      12,
              background: 'rgba(239,68,68,0.9)',
              color:      '#fff',
              padding:    '5px 10px',
              borderRadius: 6,
              fontSize:   11,
              fontWeight: 600,
              display:    'flex',
              alignItems: 'center',
              gap:        6,
              pointerEvents: 'none',
            }}>
              ✕ {errorCount} validation error{errorCount !== 1 ? 's' : ''} — PDF export blocked
            </div>
          )}
        </main>

        {/* ── Right Properties Panel ────────────────────────────────────────── */}
        <aside style={{
          width:         'var(--panel-w)',
          background:    'var(--bg-secondary)',
          borderLeft:    '1px solid var(--border)',
          display:       'flex',
          flexDirection: 'column',
          flexShrink:    0,
          overflow:      'hidden',
        }}>
          <div style={{
            padding:       '0 12px',
            height:        36,
            display:       'flex',
            alignItems:    'center',
            borderBottom:  '1px solid var(--border)',
            flexShrink:    0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Properties
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PropertiesPanel />
          </div>
        </aside>
      </div>

      {/* ── Status Bar ──────────────────────────────────────────────────────── */}
      <StatusBar />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SidebarTab({ label, icon, active, onClick, badge = 0, badgeColor = 'var(--danger)' }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex:          1,
        display:       'flex',
        alignItems:    'center',
        justifyContent: 'center',
        gap:           3,
        padding:       '7px 2px',
        fontSize:      10,
        fontWeight:    active ? 600 : 400,
        color:         active ? 'var(--accent)' : 'var(--text-muted)',
        background:    'transparent',
        border:        'none',
        borderBottom:  active ? '2px solid var(--accent)' : '2px solid transparent',
        cursor:        'pointer',
        transition:    'all 0.15s',
        position:      'relative',
        whiteSpace:    'nowrap',
      }}
    >
      {icon}
      {label}
      {badge > 0 && (
        <span style={{
          position:    'absolute',
          top:         4,
          right:       4,
          background:  badgeColor,
          color:       '#fff',
          fontSize:    9,
          fontWeight:  700,
          width:       14,
          height:      14,
          borderRadius: '50%',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          lineHeight:  1,
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function StatusBar() {
  const store = useEditorStore();
  const page  = store.getActivePage();
  const { selectedIds, activeTool, validation } = store;
  const report = validation.report;

  const statusColor = !report          ? 'var(--text-muted)'
                    : !report.isValid  ? 'var(--danger)'
                    : report.summary.warnings > 0 ? 'var(--warning)'
                    : 'var(--success)';

  const statusLabel = !report ? 'Not validated'
                    : !report.isValid ? `${report.summary.errors} error${report.summary.errors !== 1 ? 's' : ''}`
                    : report.summary.warnings > 0 ? `${report.summary.warnings} warning${report.summary.warnings !== 1 ? 's' : ''}`
                    : 'Valid ✓';

  return (
    <div style={{
      height:     24,
      background: 'var(--bg-secondary)',
      borderTop:  '1px solid var(--border)',
      display:    'flex',
      alignItems: 'center',
      padding:    '0 12px',
      gap:        16,
      fontSize:   11,
      color:      'var(--text-muted)',
      flexShrink: 0,
    }}>
      <span>Tool: <strong style={{ color: 'var(--text-secondary)' }}>{activeTool}</strong></span>
      {page && (
        <>
          <span>Page: <strong style={{ color: 'var(--text-secondary)' }}>{page.width} × {page.height}px</strong></span>
          <span>Elements: <strong style={{ color: 'var(--text-secondary)' }}>{page.elements.length}</strong></span>
        </>
      )}
      {selectedIds.length > 0 && (
        <span style={{ color: 'var(--accent)' }}>
          {selectedIds.length} selected
        </span>
      )}
      <div style={{ flex: 1 }} />
      {/* Validation status pill */}
      <span style={{
        display:      'flex',
        alignItems:   'center',
        gap:          4,
        padding:      '1px 7px',
        borderRadius: 10,
        background:   `${statusColor}22`,
        color:        statusColor,
        fontWeight:   600,
        fontSize:     10,
      }}>
        <ShieldCheck size={10} />
        {statusLabel}
      </span>
      <span style={{ color: 'var(--text-muted)' }}>Canvas Editor v1.0</span>
    </div>
  );
}

// Needed for the StatusBar import
function ShieldCheck({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}