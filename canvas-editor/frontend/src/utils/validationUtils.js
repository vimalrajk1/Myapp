/**
 * Client-side Validation Engine (mirror of backend validationService.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs all validation rules locally (no network request) so the editor can
 * show live issue indicators as the user edits.  The backend engine is the
 * authoritative gate before PDF export; this is the fast feedback layer.
 */

export const Severity = Object.freeze({
  ERROR:   'error',
  WARNING: 'warning',
  INFO:    'info',
});

export const Code = Object.freeze({
  NO_PAGES:                'NO_PAGES',
  MISSING_IMAGE_SRC:       'MISSING_IMAGE_SRC',
  EMPTY_REQUIRED_VARIABLE: 'EMPTY_REQUIRED_VARIABLE',
  ELEMENT_OUT_OF_BOUNDS:   'ELEMENT_OUT_OF_BOUNDS',
  DUPLICATE_ID:            'DUPLICATE_ID',
  EMPTY_TEXT:              'EMPTY_TEXT',
  FONT_NOT_IN_CONSTRAINTS: 'FONT_NOT_IN_CONSTRAINTS',
  COLOR_NOT_IN_PALETTE:    'COLOR_NOT_IN_PALETTE',
  SMALL_FONT_SIZE:         'SMALL_FONT_SIZE',
  TEXT_LIKELY_OVERFLOW:    'TEXT_LIKELY_OVERFLOW',
  NEAR_OUT_OF_BOUNDS:      'NEAR_OUT_OF_BOUNDS',
  DUPLICATE_VARIABLE_KEYS: 'DUPLICATE_VARIABLE_KEYS',
  LOCKED_AND_EDITABLE:     'LOCKED_AND_EDITABLE',
  ZERO_DIMENSION:          'ZERO_DIMENSION',
  NO_VARIABLE_FIELDS:      'NO_VARIABLE_FIELDS',
  SINGLE_PAGE_TEMPLATE:    'SINGLE_PAGE_TEMPLATE',
});

const MIN_FONT_SIZE   = 6;
const BLEED_TOLERANCE = 2;
let _counter = 0;

const issue = ({ severity, code, message, fix = '', elementId = null, elementName = null, pageId = null, pageName = null }) => ({
  id:          `ci-${++_counter}`,
  severity,
  code,
  message,
  fix,
  elementId,
  elementName,
  pageId,
  pageName,
});

/**
 * Validate a template JSON object.
 * @param   {Object} templateData  { pages, styleConstraints? }
 * @returns {ValidationReport}
 */
export function validateTemplate(templateData) {
  _counter = 0;
  const issues = [];
  const { pages = [], styleConstraints = {} } = templateData || {};

  // No pages
  if (!Array.isArray(pages) || pages.length === 0) {
    issues.push(issue({
      severity: Severity.ERROR, code: Code.NO_PAGES,
      message: 'Template has no pages.',
      fix: 'Add at least one page to the template.',
    }));
    return buildReport(issues);
  }

  // Duplicate IDs
  const allIds = [];
  for (const page of pages)
    for (const el of page.elements || [])
      if (el.id) allIds.push({ id: el.id, pageId: page.id, pageName: page.name });

  const idMap = {};
  for (const e of allIds) {
    if (!idMap[e.id]) idMap[e.id] = [];
    idMap[e.id].push(e);
  }
  for (const [id, refs] of Object.entries(idMap)) {
    if (refs.length > 1) {
      issues.push(issue({
        severity: Severity.ERROR, code: Code.DUPLICATE_ID,
        message: `Element ID "${id}" is duplicated across ${refs.length} pages.`,
        fix: 'Ensure each element has a unique ID.',
        elementId: id, pageId: refs[0].pageId, pageName: refs[0].pageName,
      }));
    }
  }

  // Variable key tracking
  const varKeys = {};
  let hasVariable = false;

  for (const page of pages) {
    const { id: pageId, name: pageName = 'Page', width = 0, height = 0, elements = [] } = page;

    for (const el of elements) {
      const { id: elId, name: elName = el.type || 'element', type } = el;
      const ctx = { elementId: elId, elementName: elName, pageId, pageName };

      // Zero dimension
      const elW = (el.width || 0) * (el.scaleX || 1);
      const elH = (el.height || 0) * (el.scaleY || 1);
      if (elW === 0 || elH === 0) {
        issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.ZERO_DIMENSION,
          message: `"${elName}" has zero width or height.`,
          fix: 'Resize the element.',
        }));
      }

      // Bounds checks
      if (width > 0 && height > 0) {
        const right  = el.x + elW;
        const bottom = el.y + elH;
        const outside = el.x >= width || el.y >= height || right <= 0 || bottom <= 0;
        if (outside) {
          issues.push(issue({ ...ctx, severity: Severity.ERROR, code: Code.ELEMENT_OUT_OF_BOUNDS,
            message: `"${elName}" is completely outside the page.`,
            fix: 'Move the element onto the canvas.',
          }));
        } else {
          const partial = el.x < -BLEED_TOLERANCE || el.y < -BLEED_TOLERANCE ||
                          right > width + BLEED_TOLERANCE || bottom > height + BLEED_TOLERANCE;
          if (partial) {
            issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.NEAR_OUT_OF_BOUNDS,
              message: `"${elName}" extends beyond the page boundary.`,
              fix: 'Reposition or resize to fit within the canvas.',
            }));
          }
        }
      }

      // Locked + editable
      if (el.locked && el.isEditable) {
        issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.LOCKED_AND_EDITABLE,
          message: `"${elName}" is both locked and marked editable.`,
          fix: 'Remove the editable flag or unlock the element.',
        }));
      }

      // Text checks
      if (type === 'text') {
        const text = (el.text || '').trim();
        if (!text || text === 'Double-click to edit') {
          issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.EMPTY_TEXT,
            message: `Text element "${elName}" has empty or default placeholder text.`,
            fix: 'Replace with actual content.',
          }));
        }

        const fs = el.fontSize || 16;
        if (fs < MIN_FONT_SIZE) {
          issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.SMALL_FONT_SIZE,
            message: `"${elName}" font size ${fs}px is below ${MIN_FONT_SIZE}px — may be illegible in print.`,
            fix: `Increase font size to at least ${MIN_FONT_SIZE}px.`,
          }));
        }

        // Overflow approximation
        if (el.text && el.width && el.height && fs) {
          const cpl = Math.max(1, Math.floor(el.width / (fs * 0.55)));
          const lines = Math.max(1, Math.floor(el.height / ((el.lineHeight || 1.2) * fs)));
          if (el.text.length > cpl * lines * 1.5) {
            issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.TEXT_LIKELY_OVERFLOW,
              message: `"${elName}" text may overflow its frame.`,
              fix: 'Reduce text length, increase frame size, or reduce font size.',
            }));
          }
        }

        // Font constraint
        if (styleConstraints.allowCustomFonts === false &&
            styleConstraints.allowedFonts?.length) {
          const ff = el.fontFamily || 'Arial';
          if (!styleConstraints.allowedFonts.some((f) => f.toLowerCase() === ff.toLowerCase())) {
            issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.FONT_NOT_IN_CONSTRAINTS,
              message: `Font "${ff}" is not in the allowed list.`,
              fix: `Use: ${styleConstraints.allowedFonts.join(', ')}.`,
            }));
          }
        }

        // Color constraint
        if (styleConstraints.allowCustomColors === false &&
            styleConstraints.colorPalette?.length) {
          const fill = el.fill || '';
          if (fill && !styleConstraints.colorPalette.includes(fill)) {
            issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.COLOR_NOT_IN_PALETTE,
              message: `Text color "${fill}" in "${elName}" is not in the palette.`,
              fix: `Use: ${styleConstraints.colorPalette.join(', ')}.`,
            }));
          }
        }
      }

      // Image checks
      if (type === 'image') {
        if (!(el.src || '').trim()) {
          issues.push(issue({ ...ctx, severity: Severity.ERROR, code: Code.MISSING_IMAGE_SRC,
            message: `Image "${elName}" has no source image.`,
            fix: 'Upload or link an image.',
          }));
        }
      }

      // Shape color constraint
      if (['rect', 'ellipse'].includes(type)) {
        if (styleConstraints.allowCustomColors === false &&
            styleConstraints.colorPalette?.length) {
          const fill = el.fill || '';
          if (fill && !styleConstraints.colorPalette.includes(fill)) {
            issues.push(issue({ ...ctx, severity: Severity.WARNING, code: Code.COLOR_NOT_IN_PALETTE,
              message: `Shape "${elName}" fill "${fill}" is not in the palette.`,
              fix: `Use: ${styleConstraints.colorPalette.join(', ')}.`,
            }));
          }
        }
      }

      // Variable checks
      if (el.isVariable) {
        hasVariable = true;
        const key = (el.variableKey || '').trim();
        if (!key) {
          issues.push(issue({ ...ctx, severity: Severity.ERROR, code: Code.EMPTY_REQUIRED_VARIABLE,
            message: `Variable element "${elName}" has no key set.`,
            fix: 'Set a unique variable key in the Properties panel.',
          }));
        } else {
          if (!varKeys[key]) varKeys[key] = [];
          varKeys[key].push(ctx);
        }
      }
    }
  }

  // Duplicate variable keys
  for (const [key, refs] of Object.entries(varKeys)) {
    if (refs.length > 1) {
      issues.push(issue({
        severity: Severity.WARNING, code: Code.DUPLICATE_VARIABLE_KEYS,
        message: `Variable key "${key}" is used by ${refs.length} elements.`,
        fix: 'Assign unique variable keys.',
        ...refs[0],
      }));
    }
  }

  // No variable fields (info)
  if (!hasVariable) {
    issues.push(issue({
      severity: Severity.INFO, code: Code.NO_VARIABLE_FIELDS,
      message: 'No variable fields found — output will be static.',
      fix: 'Mark elements as variable in the Properties panel for data-driven personalisation.',
    }));
  }

  // Single page (info)
  if (pages.length === 1) {
    issues.push(issue({
      severity: Severity.INFO, code: Code.SINGLE_PAGE_TEMPLATE,
      message: 'Single-page template.',
      fix: 'Add more pages for multi-page documents.',
    }));
  }

  return buildReport(issues);
}

function buildReport(issues) {
  const summary = issues.reduce(
    (acc, i) => { acc[i.severity]++; return acc; },
    { error: 0, warning: 0, info: 0 }
  );
  return {
    isValid:  summary.error === 0,
    issues,
    summary:  { errors: summary.error, warnings: summary.warning, infos: summary.info, total: issues.length },
    timestamp: new Date().toISOString(),
  };
}

/** Get the dominant severity colour for the UI. */
export function severityColor(severity) {
  if (severity === Severity.ERROR)   return 'var(--danger)';
  if (severity === Severity.WARNING) return 'var(--warning)';
  return 'var(--text-muted)';
}

/** Get the severity icon label. */
export function severityIcon(severity) {
  if (severity === Severity.ERROR)   return '✕';
  if (severity === Severity.WARNING) return '⚠';
  return 'ℹ';
}