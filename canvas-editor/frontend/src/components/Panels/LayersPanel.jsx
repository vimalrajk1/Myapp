import React from 'react';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, Copy,
  ChevronUp, ChevronDown, Type, Square, Circle,
  Image as ImageIcon, Minus,
} from 'lucide-react';
import useEditorStore from '../../store/useEditorStore.js';

const TYPE_ICONS = {
  text:    <Type size={11} />,
  rect:    <Square size={11} />,
  ellipse: <Circle size={11} />,
  image:   <ImageIcon size={11} />,
  line:    <Minus size={11} />,
  star:    <span style={{ fontSize: 11 }}>★</span>,
};

export default function LayersPanel() {
  const store = useEditorStore();
  const page = store.getActivePage();
  const { selectedIds } = store;

  if (!page) return null;

  // Sort descending so top layer appears first (like Figma)
  const sorted = [...page.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const handleLayerClick = (e, id) => {
    if (e.shiftKey) {
      store.setSelectedIds(
        selectedIds.includes(id)
          ? selectedIds.filter((s) => s !== id)
          : [...selectedIds, id]
      );
    } else {
      store.setSelectedIds([id]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="panel-section" style={{ paddingBottom: 8 }}>
        <div className="panel-section-header" style={{ marginBottom: 0 }}>
          <span>Layers</span>
          <span className="badge badge-accent">{page.elements.length}</span>
        </div>
      </div>

      {/* Layer list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No elements yet.<br />Use the toolbar to add elements.
          </div>
        )}

        {sorted.map((el, idx) => {
          const isSelected = selectedIds.includes(el.id);
          const realIdx = page.elements.findIndex((e) => e.id === el.id);

          return (
            <div
              key={el.id}
              onClick={(e) => handleLayerClick(e, el.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                cursor: 'pointer',
                background: isSelected ? 'var(--accent-light)' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                userSelect: 'none',
                transition: 'background 0.1s',
              }}
            >
              {/* Type icon */}
              <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                {TYPE_ICONS[el.type] || <Square size={11} />}
              </span>

              {/* Name */}
              <span style={{
                flex: 1,
                fontSize: 12,
                color: el.visible === false ? 'var(--text-muted)' : isSelected ? 'var(--accent)' : 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textDecoration: el.visible === false ? 'line-through' : 'none',
              }}>
                {el.name || el.type}
                {el.isVariable && (
                  <span style={{ marginLeft: 4, color: 'var(--warning)', fontSize: 10 }}>{'{}'}</span>
                )}
              </span>

              {/* Actions (shown on hover via CSS or always shown) */}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {/* Visibility */}
                <button
                  className="btn-icon"
                  style={{ width: 22, height: 22 }}
                  data-tooltip={el.visible === false ? 'Show' : 'Hide'}
                  onClick={() => store.toggleVisibility(el.id)}
                >
                  {el.visible === false ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>

                {/* Lock */}
                <button
                  className="btn-icon"
                  style={{ width: 22, height: 22, color: el.locked ? 'var(--warning)' : undefined }}
                  data-tooltip={el.locked ? 'Unlock' : 'Lock'}
                  onClick={() => store.toggleLock(el.id)}
                >
                  {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom actions bar */}
      {selectedIds.length > 0 && (
        <div className="panel-section" style={{
          display: 'flex', gap: 4, paddingTop: 8, paddingBottom: 8, flexWrap: 'wrap',
        }}>
          <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11 }}
            onClick={store.duplicateSelected}>
            <Copy size={11} /> Duplicate
          </button>
          <button className="btn btn-danger" style={{ flex: 1, fontSize: 11 }}
            onClick={store.deleteSelected}>
            <Trash2 size={11} /> Delete
          </button>
          {selectedIds.length === 1 && (
            <>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11 }}
                onClick={() => store.bringForward(selectedIds[0])}>
                <ChevronUp size={11} /> Forward
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11 }}
                onClick={() => store.sendBackward(selectedIds[0])}>
                <ChevronDown size={11} /> Backward
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}