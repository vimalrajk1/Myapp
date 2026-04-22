import React, { useRef } from 'react';
import { Image, Group, Rect } from 'react-konva';
import useImage from 'use-image';

/**
 * Renders a Konva Image node.
 * Falls back to a placeholder rect with an icon when src is empty or loading.
 */
export default function ImageElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onDragMove,
  onTransformEnd,
  onDblClick,
  draggable,
}) {
  const [img, status] = useImage(element.src || '', 'anonymous');

  const sharedProps = {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation || 0,
    scaleX: element.scaleX || 1,
    scaleY: element.scaleY || 1,
    opacity: element.opacity ?? 1,
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd,
    onDragMove,
    onTransformEnd,
    onDblClick,
    onDblTap: onDblClick,
  };

  if (status === 'loaded' && img) {
    return (
      <Image
        {...sharedProps}
        image={img}
        stroke={element.stroke || undefined}
        strokeWidth={element.strokeWidth || 0}
      />
    );
  }

  // Placeholder: grey rect with crosshairs
  return (
    <Group {...sharedProps}>
      <Rect
        width={element.width}
        height={element.height}
        fill={status === 'loading' ? '#334155' : '#1e293b'}
        stroke={isSelected ? '#6366f1' : '#475569'}
        strokeWidth={1}
        cornerRadius={2}
      />
      {/* Diagonal lines (image placeholder) */}
      <Rect
        width={element.width}
        height={element.height}
        fillPatternImage={createPlaceholderPattern()}
        opacity={0.08}
        listening={false}
      />
    </Group>
  );
}

let _placeholderCanvas = null;
function createPlaceholderPattern() {
  if (_placeholderCanvas) return _placeholderCanvas;
  const c = document.createElement('canvas');
  c.width = 20; c.height = 20;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 20); ctx.lineTo(20, 0);
  ctx.stroke();
  _placeholderCanvas = c;
  return c;
}