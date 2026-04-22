import React from 'react';
import { Rect, Ellipse, Line, Star, Group } from 'react-konva';

/**
 * Renders rect, ellipse, line, and star shapes via Konva primitives.
 */
export default function ShapeElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onDragMove,
  onTransformEnd,
  onDblClick,
  draggable,
}) {
  const common = {
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation || 0,
    scaleX: element.scaleX || 1,
    scaleY: element.scaleY || 1,
    fill: element.fill || 'transparent',
    stroke: element.stroke || undefined,
    strokeWidth: element.strokeWidth || 0,
    opacity: element.opacity ?? 1,
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd,
    onDragMove,
    onTransformEnd,
    onDblClick,
    onDblTap: onDblClick,
    shadowColor: isSelected ? 'rgba(99,102,241,0.4)' : undefined,
    shadowBlur: isSelected ? 10 : 0,
    shadowEnabled: isSelected,
  };

  switch (element.type) {
    case 'rect':
      return (
        <Rect
          {...common}
          width={element.width || 100}
          height={element.height || 100}
          cornerRadius={element.cornerRadius || 0}
        />
      );

    case 'ellipse':
      return (
        <Ellipse
          {...common}
          // Konva Ellipse: x/y is the CENTER, radiusX/Y are half-widths
          x={element.x + (element.width || 100) / 2}
          y={element.y + (element.height || 100) / 2}
          radiusX={(element.width || 100) / 2}
          radiusY={(element.height || 100) / 2}
        />
      );

    case 'line':
      return (
        <Line
          {...common}
          points={[0, 0, element.width || 200, 0]}
          fill={undefined}
          stroke={element.stroke || '#1e293b'}
          strokeWidth={element.strokeWidth || 2}
          lineCap="round"
        />
      );

    case 'star':
      return (
        <Star
          {...common}
          x={element.x + (element.width || 100) / 2}
          y={element.y + (element.height || 100) / 2}
          numPoints={element.numPoints || 5}
          innerRadius={(element.width || 100) * 0.4}
          outerRadius={(element.width || 100) / 2}
        />
      );

    default:
      return null;
  }
}