import React, { useRef } from 'react';
import {
  MousePointer2, Type, Square, Circle, Image as ImageIcon,
  Minus, Undo2, Redo2, Grid3x3, Magnet, ZoomIn, ZoomOut,
  Download, FileJson, FolderOpen, ShieldCheck, ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import useEditorStore from '../../store/useEditorStore.js';
import {
  exportStageToPNG, exportTemplateJSON, loadTemplateFromFile, exportToPDF,
} from '../../utils/exportUtils.js';
import { validateApi } from '../../services/api.js';
import toast from 'react-hot-toast';

const TOOLS = [
  { id: 'select',  Icon: MousePointer2, label: 'Select (V)' },
  { id: 'text',    Icon: Type,          label: 'Text (T)'   },
  { id: 'rect',    Icon: Square,        label: 'Rectangle (R)' },
  { id: 'ellipse', Icon: Circle,        label: 'Ellipse (E)'   },
  { id: 'line',    Icon: Minus,         label: 'Line (L)'      },
  { id: 'image',   Icon: ImageIcon,     label: 'Image (I)'     },
];

export default function Toolbar({ stageRef }) {
  const store       = useEditorStore();
  const fileInputRef = useRef(null);

  const { activeTool, zoom, showGrid, snapEnabled, validation } = store;
  const report      = validation?.report;
  const hasErrors   = (report?.summary.errors || 0) > 0;
  const hasWarnings = (report?.summary.warnings || 0) > 0;

  // ── Local (instant) validation ──────────────────────────────────────────────
  const handleValidate = () => {
    store.runValidation();
    store.setUI({ leftPanel: 'validation' });
    const r = store.validation.report;
    if (!r) { toast('Validation running…'); return; }
  };

  // ── Export PNG ──────────────────────────────────────────────────────────────
  const handleExportPNG = () => {
    try {
      if (!stageRef?.current) { toast.error('Canvas not ready'); return; }
      exportStageToPNG(stageRef.current, 'canvas-export', 2);
      toast.success('PNG exported');
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Export PDF (gated by validation) ────────────────────────────────────────
  const handleExportPDF = async () => {
    // Run a quick client-side validation first
    store.runValidation();

    // Wait a tick for the store to update, then read fresh state
    setTimeout(async () => {
      const freshReport = useEditorStore.getState().validation.report;
      if (freshReport?.summary.errors > 0) {
        toast.error(
          `PDF blocked: ${freshReport.summary.errors} error${freshReport.summary.errors !== 1 ? 's' : ''} found. Fix issues in the Issues panel.`,
          { duration: 6000 }
        );
        store.setUI({ leftPanel: 'validation' });
        return;
      }

      const toastId = toast.loading('Generating PDF…');
      try {
        const data = store.getTemplateJSON();
        await exportToPDF(data, 'canvas-export');
        toast.success('PDF downloaded', { id: toastId });
      } catch (e) {
        toast.error(`PDF failed: ${e.message}`, { id: toastId });
      }
    }, 50);
  };

  // ── Full server-side validation ─────────────────────────────────────────────
  const handleServerValidate = async () => {
    const tid = toast.loading('Running server validation…');
    try {
      const template     = store.getTemplateJSON();
      const serverReport = await validateApi.validate(template);
      store.runValidation(); // sync client-side view
      store.setUI({ leftPanel: 'validation' });

      if (serverReport.isValid) {
        toast.success(`Template valid ✓ (${serverReport.summary.warnings} warning${serverReport.summary.warnings !== 1 ? 's' : ''})`, { id: tid });
      } else {
        toast.error(`${serverReport.summary.errors} error${serverReport.summary.errors !== 1 ? 's' : ''} found — PDF blocked`, { id: tid, duration: 6000 });
      }
    } catch (err) {
      toast.error(`Server validation failed: ${err.message}`, { id: tid });
    }
  };

  // ── Save JSON ───────────────────────────────────────────────────────────────
  const handleSaveJSON = () => {
    const data = store.getTemplateJSON();
    exportTemplateJSON(data, 'template');
    toast.success('Template saved as JSON');
  };

  // ── Load JSON ───────────────────────────────────────────────────────────────
  const handleLoadJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await loadTemplateFromFile(file);
      store.loadTemplate(data);
      toast.success('Template loaded');
    } catch (err) {
      toast.error(err.message);
    }
    e.target.value = '';
  };

  // ── Validation icon / colour state ──────────────────────────────────────────
  const ValidateIcon = !report       ? ShieldCheck
                     : hasErrors     ? ShieldAlert
                     : ShieldCheck;

  const validateBtnStyle = !report
    ? {}
    : hasErrors
      ? { background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.4)' }
      : hasWarnings
        ? { background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.4)' }
        : { background: 'rgba(34,197,94,0.15)',  color: 'var(--success)', borderColor: 'rgba(34,197,94,0.4)'  };

  return (
    <header style={{
      height:      'var(--toolbar-h)',
      background:  'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display:     'flex',
      alignItems:  'center',
      padding:     '0 12px',
      gap:         4,
      flexShrink:  0,
      zIndex:      100,
    }}>
      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)', marginRight: 12, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
        ✦ Canvas
      </div>

      <div className="divider" />

      {/* ── Drawing tools ──────────────────────────────────────────────────── */}
      {TOOLS.map(({ id, Icon, label }) => (
        <button
          key={id}
          className={`btn-icon ${activeTool === id ? 'active' : ''}`}
          data-tooltip={label}
          onClick={() => store.setActiveTool(id)}
        >
          <Icon size={15} />
        </button>
      ))}

      <div className="divider" />

      {/* ── History ────────────────────────────────────────────────────────── */}
      <button className="btn-icon" data-tooltip="Undo (⌘Z)"   onClick={store.undo} disabled={store.history.past.length === 0}>
        <Undo2 size={15} />
      </button>
      <button className="btn-icon" data-tooltip="Redo (⌘⇧Z)" onClick={store.redo} disabled={store.history.future.length === 0}>
        <Redo2 size={15} />
      </button>

      <div className="divider" />

      {/* ── View ───────────────────────────────────────────────────────────── */}
      <button className={`btn-icon ${showGrid    ? 'active' : ''}`} data-tooltip="Toggle Grid (G)"  onClick={store.toggleGrid}>
        <Grid3x3 size={15} />
      </button>
      <button className={`btn-icon ${snapEnabled ? 'active' : ''}`} data-tooltip="Toggle Snap"     onClick={store.toggleSnap}>
        <Magnet size={15} />
      </button>

      <div className="divider" />

      {/* ── Zoom ───────────────────────────────────────────────────────────── */}
      <button className="btn-icon" data-tooltip="Zoom Out (-)" onClick={() => store.setZoom(zoom - 0.1)}>
        <ZoomOut size={15} />
      </button>
      <span
        style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'center', cursor: 'pointer' }}
        onClick={() => store.setZoom(1)}
        data-tooltip="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </span>
      <button className="btn-icon" data-tooltip="Zoom In (+)" onClick={() => store.setZoom(zoom + 0.1)}>
        <ZoomIn size={15} />
      </button>

      {/* ── Spacer ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Validation ──────────────────────────────────────────────────────── */}
      <button
        className="btn btn-outline"
        style={{ fontSize: 11, padding: '4px 10px', gap: 5, ...validateBtnStyle }}
        onClick={handleValidate}
        data-tooltip="Run client-side validation (instant)"
      >
        <RefreshCw size={12} />
        Validate
        {hasErrors   && <span style={{ background: 'var(--danger)',  color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 8 }}>{report.summary.errors}</span>}
        {!hasErrors && hasWarnings && <span style={{ background: 'var(--warning)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 8 }}>{report.summary.warnings}</span>}
        {report && !hasErrors && !hasWarnings && <ValidateIcon size={12} />}
      </button>

      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, padding: '4px 8px' }}
        onClick={handleServerValidate}
        data-tooltip="Full server-side validation (authoritative)"
      >
        <ShieldAlert size={12} /> Full
      </button>

      <div className="divider" />

      {/* ── File actions ────────────────────────────────────────────────────── */}
      <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} data-tooltip="Open JSON template">
        <FolderOpen size={13} /> Open
      </button>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleLoadJSON} />

      <button className="btn btn-ghost" onClick={handleSaveJSON} data-tooltip="Save as JSON">
        <FileJson size={13} /> Save
      </button>

      <div className="divider" />

      <button className="btn btn-ghost" onClick={handleExportPNG} data-tooltip="Export PNG">
        <Download size={13} /> PNG
      </button>

      <button
        className="btn btn-primary"
        onClick={handleExportPDF}
        data-tooltip={hasErrors ? 'Fix validation errors before exporting PDF' : 'Export PDF (server-side render)'}
        style={hasErrors ? { opacity: 0.6 } : {}}
      >
        <Download size={13} /> PDF
      </button>
    </header>
  );
}