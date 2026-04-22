import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Lock, Unlock, Variable,
} from 'lucide-react';
import useEditorStore from '../../store/useEditorStore.js';
import { alignElements } from '../../utils/alignmentUtils.js';

const SYSTEM_FONTS = [
  'Arial', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana',
  'Courier New', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
  'Impact', 'Lucida Sans', 'Tahoma', 'Optima', 'Futura',
];

export default function PropertiesPanel() {
  const store = useEditorStore();
  const [colorTarget, setColorTarget] = useState(null); // 'fill' | 'stroke' | 'background'
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const page = store.getActivePage();
  const selected = store.getSelectedElements();
  const el = selected.length === 1 ? selected[0] : null;
  const { styleConstraints } = store;

  const fonts = styleConstraints.allowedFonts?.length > 0
    ? styleConstraints.allowedFonts
    : SYSTEM_FONTS;

  const colors = styleConstraints.colorPalette || [];

  // ── Patch helper ──────────────────────────────────────────────────────────
  const patch = (updates) => {
    if (!el) return;
    store.updateElement(el.id, updates);
  };

  // ── Color picker handler ──────────────────────────────────────────────────
  const openColor = (target) => {
    setColorTarget(target);
    setColorPickerOpen(true);
  };

  const handleColorChange = (color) => {
    if (colorTarget === 'background') {
      store.updatePage(page.id, { background: color });
    } else if (el) {
      patch({ [colorTarget]: color });
    }
  };

  const currentColor = () => {
    if (colorTarget === 'background') return page?.background || '#ffffff';
    if (!el) return '#000000';
    return el[colorTarget] || '#000000';
  };

  // ── Alignment ─────────────────────────────────────────────────────────────
  const handleAlign = (alignment) => {
    const patches = alignElements(selected, alignment, page, selected.length <= 1);
    patches.forEach(({ id, x, y }) => store.updateElement(id, { x, y }));
  };

  // ── No selection ──────────────────────────────────────────────────────────
  if (!el && selected.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Page properties */}
        <div className="panel-section">
          <div className="panel-section-header">Page</div>
          {page && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label="Width">
                <input type="number" className="input input-sm" value={page.width}
                  onChange={(e) => store.updatePage(page.id, { width: +e.target.value })} />
              </Row>
              <Row label="Height">
                <input type="number" className="input input-sm" value={page.height}
                  onChange={(e) => store.updatePage(page.id, { height: +e.target.value })} />
              </Row>
              <Row label="Background">
                <ColorSwatch
                  color={page.background}
                  onClick={() => openColor('background')}
                />
              </Row>
            </div>
          )}
        </div>

        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
          Select an element to edit its properties.
        </div>

        {colorPickerOpen && <ColorPickerPopup
          color={currentColor()}
          onChange={handleColorChange}
          onClose={() => setColorPickerOpen(false)}
          palette={colors}
        />}
      </div>
    );
  }

  // ── Multi-selection ───────────────────────────────────────────────────────
  if (selected.length > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="panel-section">
          <div className="panel-section-header">
            Align <span className="badge badge-accent">{selected.length}</span>
          </div>
          <AlignmentControls onAlign={handleAlign} />
        </div>
        <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>
          {selected.length} elements selected.
        </div>
      </div>
    );
  }

  // ── Single element ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* ── Transform ───────────────────────────────────────────────────── */}
      <div className="panel-section">
        <div className="panel-section-header">
          Transform
          <button
            className="btn-icon"
            style={{ width: 20, height: 20, color: el.locked ? 'var(--warning)' : undefined }}
            onClick={() => store.toggleLock(el.id)}
          >
            {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <NumField label="X" value={el.x} onChange={(v) => patch({ x: v })} />
          <NumField label="Y" value={el.y} onChange={(v) => patch({ y: v })} />
          <NumField label="W" value={Math.round((el.width || 0) * (el.scaleX || 1))}
            onChange={(v) => patch({ width: v, scaleX: 1 })} />
          <NumField label="H" value={Math.round((el.height || 0) * (el.scaleY || 1))}
            onChange={(v) => patch({ height: v, scaleY: 1 })} />
          <NumField label="Rot°" value={Math.round(el.rotation || 0)}
            onChange={(v) => patch({ rotation: v })} />
          <NumField label="Opacity" value={Math.round((el.opacity ?? 1) * 100)}
            onChange={(v) => patch({ opacity: v / 100 })} min={0} max={100} />
        </div>
      </div>

      {/* ── Appearance ────────────────────────────────────────────────────── */}
      <div className="panel-section">
        <div className="panel-section-header">Appearance</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {el.type !== 'line' && (
            <Row label="Fill">
              <ColorSwatch color={el.fill} onClick={() => openColor('fill')} />
            </Row>
          )}
          <Row label="Stroke">
            <ColorSwatch color={el.stroke || '#00000000'} onClick={() => openColor('stroke')} />
          </Row>
          {(el.stroke) && (
            <Row label="Stroke W">
              <input type="number" className="input input-sm" value={el.strokeWidth || 0} min={0}
                onChange={(e) => patch({ strokeWidth: +e.target.value })} />
            </Row>
          )}
          {el.type === 'rect' && (
            <Row label="Radius">
              <input type="number" className="input input-sm" value={el.cornerRadius || 0} min={0}
                onChange={(e) => patch({ cornerRadius: +e.target.value })} />
            </Row>
          )}
        </div>
      </div>

      {/* ── Text properties (text elements only) ─────────────────────────── */}
      {el.type === 'text' && (
        <div className="panel-section">
          <div className="panel-section-header">Typography</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Font family */}
            <div>
              <label className="label">Font</label>
              <select className="input" value={el.fontFamily || 'Arial'}
                onChange={(e) => patch({ fontFamily: e.target.value })}>
                {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Font size & line height */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <NumField label="Size" value={el.fontSize || 16} min={6}
                onChange={(v) => patch({ fontSize: v })} />
              <NumField label="Line H" value={+(el.lineHeight || 1.3).toFixed(1)} step={0.1}
                onChange={(v) => patch({ lineHeight: v })} />
            </div>

            {/* Letter spacing */}
            <Row label="Letter Sp.">
              <input type="number" className="input input-sm" value={el.letterSpacing || 0}
                onChange={(e) => patch({ letterSpacing: +e.target.value })} />
            </Row>

            {/* Style toggles */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`btn-icon ${el.fontWeight === 'bold' ? 'active' : ''}`}
                onClick={() => patch({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })}
              ><Bold size={13} /></button>
              <button
                className={`btn-icon ${el.fontStyle === 'italic' ? 'active' : ''}`}
                onClick={() => patch({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })}
              ><Italic size={13} /></button>
              <button
                className={`btn-icon ${el.textDecoration === 'underline' ? 'active' : ''}`}
                onClick={() => patch({ textDecoration: el.textDecoration === 'underline' ? '' : 'underline' })}
              ><Underline size={13} /></button>
            </div>

            {/* Text align */}
            <div>
              <label className="label">Align</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['left', 'center', 'right'].map((a) => (
                  <button key={a} className={`btn-icon ${el.align === a ? 'active' : ''}`}
                    onClick={() => patch({ align: a })}>
                    {a === 'left' ? <AlignLeft size={13} /> : a === 'center' ? <AlignCenter size={13} /> : <AlignRight size={13} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Text fill color */}
            <Row label="Color">
              <ColorSwatch color={el.fill} onClick={() => openColor('fill')} />
            </Row>

            {/* Variable field toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="label" style={{ marginBottom: 0 }}>Variable</label>
              <input type="checkbox" checked={el.isVariable || false}
                onChange={(e) => patch({ isVariable: e.target.checked })} />
              {el.isVariable && (
                <input className="input input-sm" style={{ flex: 1 }}
                  placeholder="field key"
                  value={el.variableKey || ''}
                  onChange={(e) => patch({ variableKey: e.target.value })} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Image src ────────────────────────────────────────────────────── */}
      {el.type === 'image' && (
        <div className="panel-section">
          <div className="panel-section-header">Image</div>
          <label className="label">Source URL</label>
          <input className="input" type="url" value={el.src || ''}
            placeholder="https://…"
            onChange={(e) => patch({ src: e.target.value })} />
        </div>
      )}

      {/* ── Alignment (single element → align to page) ───────────────────── */}
      <div className="panel-section">
        <div className="panel-section-header">Align to Page</div>
        <AlignmentControls onAlign={handleAlign} />
      </div>

      {/* ── Name & editability ───────────────────────────────────────────── */}
      <div className="panel-section">
        <div className="panel-section-header">Settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Name">
            <input className="input input-sm" value={el.name || ''}
              onChange={(e) => patch({ name: e.target.value })} />
          </Row>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="label" style={{ marginBottom: 0 }}>Editable region</label>
            <input type="checkbox" checked={el.isEditable !== false}
              onChange={(e) => patch({ isEditable: e.target.checked })} />
          </div>
        </div>
      </div>

      {/* ── Color Picker popup ───────────────────────────────────────────── */}
      {colorPickerOpen && (
        <ColorPickerPopup
          color={currentColor()}
          onChange={handleColorChange}
          onClose={() => setColorPickerOpen(false)}
          palette={colors}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label className="label" style={{ marginBottom: 0, minWidth: 60 }}>{label}</label>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" className="input input-sm"
        value={value ?? ''} min={min} max={max} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  );
}

function ColorSwatch({ color, onClick }) {
  const isTransparent = !color || color === '#00000000' || color === 'transparent';
  return (
    <button onClick={onClick} style={{
      width: 28, height: 22, borderRadius: 4,
      background: isTransparent
        ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 10px 10px'
        : color,
      border: '1px solid var(--border-light)',
      cursor: 'pointer', flexShrink: 0,
    }} />
  );
}

function ColorPickerPopup({ color, onChange, onClose, palette }) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 270,
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 12,
      boxShadow: 'var(--shadow)', zIndex: 999, minWidth: 220,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Color</span>
        <button className="btn-icon" style={{ width: 20, height: 20 }} onClick={onClose}>✕</button>
      </div>
      <HexColorPicker color={color || '#000000'} onChange={onChange} />

      {/* Palette */}
      {palette.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {palette.map((c) => (
            <button key={c} onClick={() => onChange(c)} style={{
              width: 20, height: 20, borderRadius: 4,
              background: c, border: '1px solid var(--border-light)',
              cursor: 'pointer',
            }} />
          ))}
        </div>
      )}

      {/* Hex input */}
      <input className="input input-sm" style={{ marginTop: 8 }}
        value={color || ''} onChange={(e) => onChange(e.target.value)}
        maxLength={7} placeholder="#000000" />
    </div>
  );
}

function AlignmentControls({ onAlign }) {
  const alignments = [
    { id: 'left',   label: '⬤←' },
    { id: 'center', label: '⬤⇔' },
    { id: 'right',  label: '→⬤' },
    { id: 'top',    label: '⬤↑' },
    { id: 'middle', label: '⬤⇕' },
    { id: 'bottom', label: '↓⬤' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {alignments.map(({ id, label }) => (
        <button key={id} className="btn btn-ghost" style={{ flex: '1 0 30%', fontSize: 11 }}
          onClick={() => onAlign(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}