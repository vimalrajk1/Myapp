import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Stage, Layer, Rect, Transformer, Line,
} from 'react-konva';
import useEditorStore from '../../store/useEditorStore.js';
import TextElement from './TextElement.jsx';
import ImageElement from './ImageElement.jsx';
import ShapeElement from './ShapeElement.jsx';
import { snapToGrid } from '../../utils/alignmentUtils.js';

const GRID_SIZE = 20;

export default function CanvasEditor({ stageRef }) {
  const store = useEditorStore();
  const transformerRef = useRef(null);
  const layerRef = useRef(null);
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 900, height: 700 });
  const [guides, setGuides] = useState([]);

  const page = store.getActivePage();
  const { selectedIds, activeTool, zoom, showGrid, snapEnabled } = store;

  // ── Resize Stage to fit container ─────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStageSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setStageSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ── Sync Transformer with selection ──────────────────────────────────────
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return;
    const nodes = selectedIds
      .map((id) => layerRef.current.findOne(`#${id}`))
      .filter(Boolean)
      .filter((n) => {
        const el = page?.elements.find((e) => e.id === n.id());
        return el && !el.locked;
      });
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, page?.elements]);

  // ── Stage click: deselect or add element ─────────────────────────────────
  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage() || e.target.name() === 'page-bg') {
      if (activeTool === 'select') {
        store.clearSelection();
        return;
      }
      // Place new element at click position
      const pos = e.target.getStage().getRelativePointerPosition();
      const snapped = snapEnabled
        ? { x: snapToGrid(pos.x, GRID_SIZE), y: snapToGrid(pos.y, GRID_SIZE) }
        : pos;

      store.addElement(activeTool, { x: snapped.x - 50, y: snapped.y - 25 });
    }
  }, [activeTool, snapEnabled, store]);

  // ── Element click: select ────────────────────────────────────────────────
  const handleElementClick = useCallback((e, id) => {
    const el = page?.elements.find((el) => el.id === id);
    if (el?.locked) return;

    if (e.evt.shiftKey) {
      // Multi-select
      if (selectedIds.includes(id)) {
        store.setSelectedIds(selectedIds.filter((s) => s !== id));
      } else {
        store.setSelectedIds([...selectedIds, id]);
      }
    } else {
      store.setSelectedIds([id]);
    }
  }, [page, selectedIds, store]);

  // ── Drag end: commit position ────────────────────────────────────────────
  const handleDragEnd = useCallback((e, id) => {
    let x = e.target.x();
    let y = e.target.y();
    if (snapEnabled) {
      x = snapToGrid(x, GRID_SIZE);
      y = snapToGrid(y, GRID_SIZE);
      e.target.position({ x, y });
    }
    store.updateElement(id, { x, y });
    setGuides([]);
  }, [snapEnabled, store]);

  // ── Drag move: snap guides ───────────────────────────────────────────────
  const handleDragMove = useCallback((e, id) => {
    if (!snapEnabled || !page) return;
    let x = e.target.x();
    let y = e.target.y();
    if (snapEnabled) {
      x = snapToGrid(x, GRID_SIZE);
      y = snapToGrid(y, GRID_SIZE);
    }
    setGuides([]);
  }, [snapEnabled, page]);

  // ── Transform end: commit scale/rotation ─────────────────────────────────
  const handleTransformEnd = useCallback((e, id) => {
    const node = e.target;
    store.updateElement(id, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
      width: node.width(),
      height: node.height(),
    });
  }, [store]);

  // ── Double click: enter text edit mode ───────────────────────────────────
  const handleDblClick = useCallback((e, id) => {
    const el = page?.elements.find((el) => el.id === id);
    if (!el || el.locked) return;
    if (el.type === 'text' && el.isEditable) {
      store.setEditingId(id);
    }
  }, [page, store]);

  if (!page) return null;

  const sorted = [...page.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // Canvas offset to centre page in viewport
  const offsetX = Math.max(40, (stageSize.width - page.width * zoom) / 2);
  const offsetY = Math.max(40, (stageSize.height - page.height * zoom) / 2);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', background: '#334155', position: 'relative' }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={offsetX}
        y={offsetY}
        onClick={handleStageClick}
        style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
      >
        {/* ── Page background ─────────────────────────────────────────── */}
        <Layer>
          {/* Drop shadow for page */}
          <Rect
            x={4} y={4}
            width={page.width} height={page.height}
            fill="rgba(0,0,0,0.35)"
            listening={false}
          />
          {/* Page white background */}
          <Rect
            name="page-bg"
            x={0} y={0}
            width={page.width} height={page.height}
            fill={page.background || '#ffffff'}
            listening={true}
          />

          {/* ── Grid overlay ─────────────────────────────────────────── */}
          {showGrid && renderGrid(page.width, page.height, GRID_SIZE)}

          {/* ── Alignment guides ─────────────────────────────────────── */}
          {guides.map((g, i) =>
            g.type === 'vertical'
              ? <Line key={i} points={[g.x, 0, g.x, page.height]} stroke="#6366f1" strokeWidth={1} dash={[4, 4]} listening={false} />
              : <Line key={i} points={[0, g.y, page.width, g.y]} stroke="#6366f1" strokeWidth={1} dash={[4, 4]} listening={false} />
          )}
        </Layer>

        {/* ── Elements layer ──────────────────────────────────────────── */}
        <Layer ref={layerRef}>
          {sorted.map((el) => {
            if (!el.visible) return null;
            const isSelected = selectedIds.includes(el.id);
            const commonProps = {
              key: el.id,
              element: el,
              isSelected,
              onSelect: (e) => handleElementClick(e, el.id),
              onDragEnd: (e) => handleDragEnd(e, el.id),
              onDragMove: (e) => handleDragMove(e, el.id),
              onTransformEnd: (e) => handleTransformEnd(e, el.id),
              onDblClick: (e) => handleDblClick(e, el.id),
              draggable: !el.locked && activeTool === 'select',
            };

            switch (el.type) {
              case 'text':    return <TextElement {...commonProps} />;
              case 'image':   return <ImageElement {...commonProps} />;
              case 'rect':
              case 'ellipse':
              case 'line':
              case 'star':    return <ShapeElement {...commonProps} />;
              default:        return null;
            }
          })}

          {/* ── Transformer ─────────────────────────────────────────── */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Minimum size constraint
              if (newBox.width < 10 || newBox.height < 10) return oldBox;
              return newBox;
            }}
            rotateEnabled={true}
            keepRatio={false}
            anchorStroke="#6366f1"
            anchorFill="#ffffff"
            anchorSize={8}
            borderStroke="#6366f1"
            borderDash={[4, 4]}
          />
        </Layer>
      </Stage>

      {/* ── Zoom indicator ──────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        background: 'rgba(15,23,42,0.85)', color: '#94a3b8',
        padding: '4px 10px', borderRadius: 6, fontSize: 11,
        border: '1px solid #334155', backdropFilter: 'blur(4px)',
      }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

// ── Grid renderer ─────────────────────────────────────────────────────────────
function renderGrid(width, height, size) {
  const lines = [];
  for (let x = 0; x <= width; x += size) {
    lines.push(
      <Line key={`gv-${x}`} points={[x, 0, x, height]}
        stroke="rgba(99,102,241,0.15)" strokeWidth={1} listening={false} />
    );
  }
  for (let y = 0; y <= height; y += size) {
    lines.push(
      <Line key={`gh-${y}`} points={[0, y, width, y]}
        stroke="rgba(99,102,241,0.15)" strokeWidth={1} listening={false} />
    );
  }
  return lines;
}