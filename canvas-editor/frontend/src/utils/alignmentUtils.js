/**
 * Alignment & distribution helpers for multi-selected elements.
 * All functions return an array of { id, x, y } patches to apply.
 */

/**
 * @param {Array} elements - Selected element objects
 * @param {string} alignment - 'left'|'center'|'right'|'top'|'middle'|'bottom'
 * @param {{ width: number, height: number }} page - Canvas page dimensions (for align-to-page)
 * @param {boolean} alignToPage - If true, align relative to page bounds
 */
export function alignElements(elements, alignment, page, alignToPage = false) {
  if (!elements || elements.length === 0) return [];

  const bounds = alignToPage
    ? { left: 0, top: 0, right: page.width, bottom: page.height, cx: page.width / 2, cy: page.height / 2 }
    : getBounds(elements);

  return elements.map((el) => {
    const w = (el.width || 0) * (el.scaleX || 1);
    const h = (el.height || 0) * (el.scaleY || 1);
    let x = el.x;
    let y = el.y;

    switch (alignment) {
      case 'left':   x = bounds.left; break;
      case 'center': x = bounds.cx - w / 2; break;
      case 'right':  x = bounds.right - w; break;
      case 'top':    y = bounds.top; break;
      case 'middle': y = bounds.cy - h / 2; break;
      case 'bottom': y = bounds.bottom - h; break;
    }

    return { id: el.id, x, y };
  });
}

/**
 * Distribute elements evenly along an axis.
 * @param {Array} elements
 * @param {'horizontal'|'vertical'} axis
 */
export function distributeElements(elements, axis) {
  if (!elements || elements.length < 3) return [];

  if (axis === 'horizontal') {
    const sorted = [...elements].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalGap = last.x - first.x - (last.width || 0) * (last.scaleX || 1);
    // Distribute centers evenly
    const firstCenter = first.x + (first.width * (first.scaleX || 1)) / 2;
    const lastCenter = last.x + (last.width * (last.scaleX || 1)) / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);

    return sorted.map((el, i) => ({
      id: el.id,
      x: firstCenter + step * i - (el.width * (el.scaleX || 1)) / 2,
      y: el.y,
    }));
  } else {
    const sorted = [...elements].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstCenter = first.y + (first.height * (first.scaleY || 1)) / 2;
    const lastCenter = last.y + (last.height * (last.scaleY || 1)) / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);

    return sorted.map((el, i) => ({
      id: el.id,
      x: el.x,
      y: firstCenter + step * i - (el.height * (el.scaleY || 1)) / 2,
    }));
  }
}

/**
 * Snap a position to the nearest snap point (grid or element edges).
 * @param {number} value - Raw position
 * @param {number} gridSize - Snap grid size (px)
 * @returns {number} - Snapped position
 */
export function snapToGrid(value, gridSize = 10) {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap to other elements' edges with a given threshold.
 * Returns snapped { x, y } and guide lines to draw.
 */
export function snapToElements(moving, allElements, threshold = 6) {
  const mx1 = moving.x;
  const mx2 = moving.x + moving.width;
  const mxc = moving.x + moving.width / 2;
  const my1 = moving.y;
  const my2 = moving.y + moving.height;
  const myc = moving.y + moving.height / 2;

  let snapX = null;
  let snapY = null;
  const guides = [];

  for (const el of allElements) {
    if (el.id === moving.id) continue;
    const ex1 = el.x;
    const ex2 = el.x + (el.width || 0) * (el.scaleX || 1);
    const exc = el.x + ((el.width || 0) * (el.scaleX || 1)) / 2;
    const ey1 = el.y;
    const ey2 = el.y + (el.height || 0) * (el.scaleY || 1);
    const eyc = el.y + ((el.height || 0) * (el.scaleY || 1)) / 2;

    // X snapping
    const xCandidates = [
      { val: ex1, movingRef: mx1, offset: 0 },
      { val: ex1, movingRef: mx2, offset: -moving.width },
      { val: ex2, movingRef: mx1, offset: 0 },
      { val: ex2, movingRef: mx2, offset: -moving.width },
      { val: exc, movingRef: mxc, offset: -moving.width / 2 },
    ];
    for (const c of xCandidates) {
      if (Math.abs(c.movingRef - c.val) < threshold) {
        snapX = c.val + c.offset;
        guides.push({ type: 'vertical', x: c.val });
        break;
      }
    }

    // Y snapping
    const yCandidates = [
      { val: ey1, movingRef: my1, offset: 0 },
      { val: ey1, movingRef: my2, offset: -moving.height },
      { val: ey2, movingRef: my1, offset: 0 },
      { val: ey2, movingRef: my2, offset: -moving.height },
      { val: eyc, movingRef: myc, offset: -moving.height / 2 },
    ];
    for (const c of yCandidates) {
      if (Math.abs(c.movingRef - c.val) < threshold) {
        snapY = c.val + c.offset;
        guides.push({ type: 'horizontal', y: c.val });
        break;
      }
    }
  }

  return {
    x: snapX !== null ? snapX : moving.x,
    y: snapY !== null ? snapY : moving.y,
    guides,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────
function getBounds(elements) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const el of elements) {
    const w = (el.width || 0) * (el.scaleX || 1);
    const h = (el.height || 0) * (el.scaleY || 1);
    left   = Math.min(left, el.x);
    top    = Math.min(top, el.y);
    right  = Math.max(right, el.x + w);
    bottom = Math.max(bottom, el.y + h);
  }
  return { left, top, right, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
}