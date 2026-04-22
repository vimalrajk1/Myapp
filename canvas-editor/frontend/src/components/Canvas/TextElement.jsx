import React, { useRef, useEffect } from 'react';
import { Text, Group, Rect } from 'react-konva';
import useEditorStore from '../../store/useEditorStore.js';

/**
 * Renders a Konva Text node.
 * When `editingId === element.id`, an absolutely-positioned <textarea> overlays
 * the Konva text for inline editing (HTML textarea mimics Konva text position).
 */
export default function TextElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onDragMove,
  onTransformEnd,
  onDblClick,
  draggable,
}) {
  const textRef = useRef(null);
  const { editingId, setEditingId, updateElement, zoom } = useEditorStore();
  const isEditing = editingId === element.id;

  // ── Inline text editing overlay ──────────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !textRef.current) return;

    const textNode = textRef.current;
    const stage = textNode.getStage();
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();

    // Absolute position of the text node on screen
    const absPos = textNode.getAbsolutePosition();

    // Create overlay textarea
    const ta = document.createElement('textarea');
    ta.value = element.text || '';
    ta.style.cssText = `
      position: fixed;
      top: ${stageRect.top + absPos.y}px;
      left: ${stageRect.left + absPos.x}px;
      width: ${element.width * zoom}px;
      min-height: ${element.height * zoom}px;
      font-size: ${element.fontSize * zoom}px;
      font-family: ${element.fontFamily};
      font-style: ${element.fontStyle};
      font-weight: ${element.fontWeight};
      text-align: ${element.align};
      line-height: ${element.lineHeight};
      letter-spacing: ${element.letterSpacing}px;
      color: ${element.fill};
      background: rgba(255,255,255,0.95);
      border: 2px solid #6366f1;
      border-radius: 3px;
      outline: none;
      resize: none;
      padding: 2px 4px;
      z-index: 9999;
      overflow: hidden;
      transform: rotate(${element.rotation || 0}deg);
      transform-origin: top left;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.25);
    `;

    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    // Auto-resize
    const resize = () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    };
    ta.addEventListener('input', resize);
    resize();

    const commit = () => {
      updateElement(element.id, { text: ta.value });
      setEditingId(null);
      if (ta.parentNode) ta.parentNode.removeChild(ta);
    };

    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { commit(); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { commit(); }
    });
    ta.addEventListener('blur', commit);

    // Hide Konva text while editing
    textNode.hide();
    textNode.getLayer()?.batchDraw();

    return () => {
      textNode.show();
      textNode.getLayer()?.batchDraw();
      ta.removeEventListener('input', resize);
      if (ta.parentNode) ta.parentNode.removeChild(ta);
    };
  }, [isEditing]);

  return (
    <Text
      ref={textRef}
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      text={element.text || ''}
      fontSize={element.fontSize || 16}
      fontFamily={element.fontFamily || 'Arial'}
      fontStyle={`${element.fontStyle || 'normal'} ${element.fontWeight || 'normal'}`}
      textDecoration={element.textDecoration || ''}
      align={element.align || 'left'}
      lineHeight={element.lineHeight || 1.3}
      letterSpacing={element.letterSpacing || 0}
      fill={element.fill || '#000000'}
      stroke={element.stroke || undefined}
      strokeWidth={element.strokeWidth || 0}
      opacity={element.opacity ?? 1}
      rotation={element.rotation || 0}
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onTransformEnd={onTransformEnd}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      wrap="word"
    />
  );
}