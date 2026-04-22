import React, { useRef } from 'react';
import {
  MousePointer2, Type, Square, Circle, Image as ImageIcon,
  Minus, Undo2, Redo2, Grid3x3, Magnet, ZoomIn, ZoomOut,
  Download, Save, FolderOpen, FileJson, Star, ChevronDown,
} from 'lucide-react';
import useEditorStore from '../../store/useEditorStore.js';
import {
  exportStageToPNG, exportTemplateJSON, loadTemplateFromFile, exportToPDF,
} from '../../utils/exportUtils.js';
import toast from 'react-hot-toast';

const TOOLS = [
  { id: 'select',  Icon: MousePointer2, label: 'Select (V)' },
  { id: 'text',    Icon: Type,          label: 'Text (T)' },
  { id: 'rect',    Icon: Square,        label: 'Rectangle (R)' },
  { id: 'ellipse', Icon: Circle,        label: 'Ellipse (E)' },
  { id: 'line',    Icon: Minus,         label: 'Line (L)' },
  { id: 'image',   Icon: ImageIcon,     label: 'Image (I)' },
];

export default function Toolbar({ stageRef }) {
  const store = useEditorStore();
  const fileInputRef = useRef(null);

  const { activeTool, zoom, showGrid, snapEnabled } = store;

  // ── Export PNG ──────────────────────────────────────────────────────────────
  const handleExportPNG = () => {
    try {
      if (!stageRef?.current) { toast.error('Canvas not ready'); return; }
      exportStageToPNG(stageRef.current, 'canvas-export', 2);
      toast.success('PNG exported successfully');
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const toastId = toast.loading('Generating PDF…');
    try {
      const data = store.getTemplateJSON();
      await exportToPDF(data, 'canvas-export');
      toast.success('PDF downloaded', { id: toastId });
    } catch (e) {
      toast.error(`PDF failed: ${e.message}`, { id: toastId });
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

  return (
    <header style={{
      height: 'var(--toolbar-h)',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 4,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div style={{
        fontWeight: 700, fontSize: 14, color: 'var(--accent)',
        marginRight: 12, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
      }}>
        ✦ Canvas
      </div>

      <div className="divider" />

      {/* ── Drawing tools ─────────────────────────────────────────────────── */}
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

      {/* ── History ──────────────────────────────────────────────────────── */}
      <button
        className="btn-icon"
        data-tooltip="Undo (⌘Z)"
        onClick={store.undo}
        disabled={store.history.past.length === 0}
      >
        <Undo2 size={15} />
      </button>
      <button
        className="btn-icon"
        data-tooltip="Redo (⌘⇧Z)"
        onClick={store.redo}
        disabled={store.history.future.length === 0}
      >
        <Redo2 size={15} />
      </button>

      <div className="divider" />

      {/* ── View ──────────────────────────────────────────────────────────── */}
      <button
        className={`btn-icon ${showGrid ? 'active' : ''}`}
        data-tooltip="Toggle Grid (G)"
        onClick={store.toggleGrid}
      >
        <Grid3x3 size={15} />
      </button>
      <button
        className={`btn-icon ${snapEnabled ? 'active' : ''}`}
        data-tooltip="Toggle Snap"
        onClick={store.toggleSnap}
      >
        <Magnet size={15} />
      </button>

      <div className="divider" />

      {/* ── Zoom ──────────────────────────────────────────────────────────── */}
      <button className="btn-icon" data-tooltip="Zoom Out" onClick={() => store.setZoom(zoom - 0.1)}>
        <ZoomOut size={15} />
      </button>
      <span style={{
        fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'center', cursor: 'pointer',
      }} onClick={() => store.setZoom(1)}>
        {Math.round(zoom * 100)}%
      </span>
      <button className="btn-icon" data-tooltip="Zoom In" onClick={() => store.setZoom(zoom + 0.1)}>
        <ZoomIn size={15} />
      </button>

      {/* ── Spacer ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── File actions ──────────────────────────────────────────────────── */}
      <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} data-tooltip="Load JSON template">
        <FolderOpen size={13} /> Open
      </button>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleLoadJSON} />

      <button className="btn btn-ghost" onClick={handleSaveJSON} data-tooltip="Save template as JSON">
        <FileJson size={13} /> Save JSON
      </button>

      <div className="divider" />

      <button className="btn btn-ghost" onClick={handleExportPNG}>
        <Download size={13} /> PNG
      </button>

      <button className="btn btn-primary" onClick={handleExportPDF}>
        <Download size={13} /> PDF
      </button>
    </header>
  );
}