import React, { useRef } from 'react';
import Toolbar from './components/Toolbar/Toolbar.jsx';
import CanvasEditor from './components/Canvas/CanvasEditor.jsx';
import LayersPanel from './components/Panels/LayersPanel.jsx';
import PropertiesPanel from './components/Panels/PropertiesPanel.jsx';
import PagesPanel from './components/Panels/PagesPanel.jsx';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import useEditorStore from './store/useEditorStore.js';
import {
  Layers, FileText, Image as ImageIcon, Settings,
} from 'lucide-react';

export default function App() {
  const stageRef = useRef(null);
  const store = useEditorStore();
  const { ui } = store;

  // Activate all keyboard shortcuts
  useKeyboardShortcuts(stageRef);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* ── Top Toolbar ───────────────────────────────────────────────────── */}
      <Toolbar stageRef={stageRef} />

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left Sidebar ──────────────────────────────────────────────── */}
        <aside style={{
          width: 'var(--sidebar-w)',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <SidebarTab
              label="Layers"
              icon={<Layers size={13} />}
              active={ui.leftPanel === 'layers'}
              onClick={() => store.setUI({ leftPanel: 'layers' })}
            />
            <SidebarTab
              label="Pages"
              icon={<FileText size={13} />}
              active={ui.leftPanel === 'pages'}
              onClick={() => store.setUI({ leftPanel: 'pages' })}
            />
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {ui.leftPanel === 'layers' && <LayersPanel />}
            {ui.leftPanel === 'pages'  && <PagesPanel />}
          </div>
        </aside>

        {/* ── Canvas Area ───────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <CanvasEditor stageRef={stageRef} />
        </main>

        {/* ── Right Properties Panel ────────────────────────────────────── */}
        <aside style={{
          width: 'var(--panel-w)',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '0 12px',
            height: 36,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <Settings size={12} style={{ marginRight: 6, color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Properties
            </span>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PropertiesPanel />
          </div>
        </aside>
      </div>

      {/* ── Status Bar ────────────────────────────────────────────────────── */}
      <StatusBar />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SidebarTab({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '8px 4px',
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {icon} {label}
    </button>
  );
}

function StatusBar() {
  const store = useEditorStore();
  const page = store.getActivePage();
  const { selectedIds, activeTool } = store;

  return (
    <div style={{
      height: 24,
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 16,
      fontSize: 11,
      color: 'var(--text-muted)',
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
          {selectedIds.length} selected — Del to delete, ⌘D to duplicate
        </span>
      )}
      <div style={{ flex: 1 }} />
      <span>Canvas Editor v1.0</span>
    </div>
  );
}