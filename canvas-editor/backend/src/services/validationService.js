'use strict';

/**
 * Validation Engine 🔥
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs a comprehensive set of rule-based checks against a Web-to-Print
 * template JSON.  Returns a structured report with severity-graded issues
 * (error | warning | info) so callers can decide whether to block PDF export.
 *
 * Usage:
 *   const report = ValidationEngine.validate(templateData);
 *   if (!report.isValid) { ... }
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const Severity = Object.freeze({
  ERROR:   'error',    // Blocks PDF export
  WARNING: 'warning',  // Allows export but flags concern
  INFO:    'info',     // Informational nudge
});

const Code = Object.freeze({
  // Errors
  NO_PAGES:                   'NO_PAGES',
  MISSING_IMAGE_SRC:          'MISSING_IMAGE_SRC',
  EMPTY_REQUIRED_VARIABLE:    'EMPTY_REQUIRED_VARIABLE',
  ELEMENT_OUT_OF_BOUNDS:      'ELEMENT_OUT_OF_BOUNDS',
  DUPLICATE_ID:               'DUPLICATE_ID',

  // Warnings
  EMPTY_TEXT:                 'EMPTY_TEXT',
  FONT_NOT_IN_CONSTRAINTS:    'FONT_NOT_IN_CONSTRAINTS',
  COLOR_NOT_IN_PALETTE:       'COLOR_NOT_IN_PALETTE',
  SMALL_FONT_SIZE:            'SMALL_FONT_SIZE',
  TEXT_LIKELY_OVERFLOW:       'TEXT_LIKELY_OVERFLOW',
  NEAR_OUT_OF_BOUNDS:         'NEAR_OUT_OF_BOUNDS',
  DUPLICATE_VARIABLE_KEYS:    'DUPLICATE_VARIABLE_KEYS',
  LOCKED_AND_EDITABLE:        'LOCKED_AND_EDITABLE',
  ZERO_DIMENSION:             'ZERO_DIMENSION',

  // Info
  NO_VARIABLE_FIELDS:         'NO_VARIABLE_FIELDS',
  SINGLE_PAGE_TEMPLATE:       'SINGLE_PAGE_TEMPLATE',
  UNLOCKED_ELEMENTS_PRESENT:  'UNLOCKED_ELEMENTS_PRESENT',
});

const DEFAULT_MIN_FONT_SIZE = 6;   // px — below this is typically illegible in print
const BLEED_TOLERANCE_PX    = 2;   // allow 2 px partial overlap before flagging NEAR_OUT_OF_BOUNDS

// ── Issue factory ─────────────────────────────────────────────────────────────

let _issueCounter = 0;
const createIssue = ({
  severity, code, message, fix = '',
  elementId = null, elementName = null,
  pageId = null, pageName = null,
}) => ({
  id:          `issue-${++_issueCounter}`,
  severity,
  code,
  message,
  fix,
  elementId,
  elementName,
  pageId,
  pageName,
});

// ── Validation Engine ─────────────────────────────────────────────────────────

const ValidationEngine = {
  /**
   * Main entry point.
   * @param   {Object} templateData  Full template JSON { pages, styleConstraints? }
   * @returns {ValidationReport}
   */
  validate(templateData) {
    _issueCounter = 0; // reset per run

    const issues = [];
    const { pages = [], styleConstraints = {} } = templateData || {};

    // ── Rule 1: Template must have at least one page ──────────────────────────
    if (!Array.isArray(pages) || pages.length === 0) {
      issues.push(createIssue({
        severity: Severity.ERROR,
        code:     Code.NO_PAGES,
        message:  'Template has no pages.',
        fix:      'Add at least one page to the template.',
      }));
      return this._buildReport(issues);
    }

    // ── Rule 2: Detect duplicate element IDs across all pages ─────────────────
    const allIds = [];
    for (const page of pages) {
      for (const el of (page.elements || [])) {
        if (el.id) allIds.push({ id: el.id, pageId: page.id, pageName: page.name });
      }
    }
    const idCounts = {};
    for (const entry of allIds) {
      idCounts[entry.id] = (idCounts[entry.id] || []);
      idCounts[entry.id].push(entry);
    }
    for (const [id, entries] of Object.entries(idCounts)) {
      if (entries.length > 1) {
        issues.push(createIssue({
          severity:    Severity.ERROR,
          code:        Code.DUPLICATE_ID,
          message:     `Element ID "${id}" appears ${entries.length} times across pages.`,
          fix:         'Ensure each element has a unique ID.',
          elementId:   id,
          pageId:      entries[0].pageId,
          pageName:    entries[0].pageName,
        }));
      }
    }

    // ── Rule 3: Collect variable keys to detect duplicates ────────────────────
    const variableKeys = {}; // key → array of element references
    let hasAnyVariableField = false;

    // ── Per-page checks ───────────────────────────────────────────────────────
    for (const page of pages) {
      const { id: pageId, name: pageName = 'Unnamed Page', width = 0, height = 0, elements = [] } = page;

      for (const el of elements) {
        const { id: elId, name: elName = el.type || 'element', type } = el;
        const ctx = { elementId: elId, elementName: elName, pageId, pageName };

        // Rule: zero-dimension elements
        const elWidth  = (el.width  || 0) * (el.scaleX || 1);
        const elHeight = (el.height || 0) * (el.scaleY || 1);
        if (elWidth === 0 || elHeight === 0) {
          issues.push(createIssue({
            ...ctx,
            severity: Severity.WARNING,
            code:     Code.ZERO_DIMENSION,
            message:  `Element "${elName}" on page "${pageName}" has zero width or height.`,
            fix:      'Resize the element to have a positive width and height.',
          }));
        }

        // Rule: element out of bounds (completely outside page)
        if (width > 0 && height > 0) {
          const elRight  = el.x + elWidth;
          const elBottom = el.y + elHeight;

          const completelyOutside =
            el.x  >= width  ||
            el.y  >= height ||
            elRight  <= 0   ||
            elBottom <= 0;

          if (completelyOutside) {
            issues.push(createIssue({
              ...ctx,
              severity: Severity.ERROR,
              code:     Code.ELEMENT_OUT_OF_BOUNDS,
              message:  `Element "${elName}" on page "${pageName}" is completely outside the page boundaries.`,
              fix:      'Move the element within the page canvas.',
            }));
          } else {
            // Near (partially) out of bounds — warning only
            const partiallyOutside =
              el.x  < -BLEED_TOLERANCE_PX ||
              el.y  < -BLEED_TOLERANCE_PX ||
              elRight  > width  + BLEED_TOLERANCE_PX ||
              elBottom > height + BLEED_TOLERANCE_PX;

            if (partiallyOutside) {
              issues.push(createIssue({
                ...ctx,
                severity: Severity.WARNING,
                code:     Code.NEAR_OUT_OF_BOUNDS,
                message:  `Element "${elName}" on page "${pageName}" extends beyond the page boundaries.`,
                fix:      'Resize or move the element to stay within the canvas, or add bleed intentionally.',
              }));
            }
          }
        }

        // Rule: locked + editable conflict
        if (el.locked && el.isEditable) {
          issues.push(createIssue({
            ...ctx,
            severity: Severity.WARNING,
            code:     Code.LOCKED_AND_EDITABLE,
            message:  `Element "${elName}" is both locked and marked as editable.`,
            fix:      'Unlock the element or remove the editable flag.',
          }));
        }

        // ── Type-specific rules ───────────────────────────────────────────────

        if (type === 'text') {
          // Rule: empty text
          const textContent = (el.text || '').trim();
          if (textContent === '' || textContent === 'Double-click to edit') {
            issues.push(createIssue({
              ...ctx,
              severity: Severity.WARNING,
              code:     Code.EMPTY_TEXT,
              message:  `Text element "${elName}" on page "${pageName}" has placeholder or empty content.`,
              fix:      'Replace the default placeholder text with actual content.',
            }));
          }

          // Rule: small font size
          const fontSize = el.fontSize || 16;
          if (fontSize < DEFAULT_MIN_FONT_SIZE) {
            issues.push(createIssue({
              ...ctx,
              severity: Severity.WARNING,
              code:     Code.SMALL_FONT_SIZE,
              message:  `Text "${elName}" has font size ${fontSize}px (< ${DEFAULT_MIN_FONT_SIZE}px). May be illegible in print.`,
              fix:      `Increase font size to at least ${DEFAULT_MIN_FONT_SIZE}px.`,
            }));
          }

          // Rule: text overflow approximation
          // Rough heuristic: chars × (fontSize × 0.6) > width × lines
          if (el.text && el.width && el.height && fontSize) {
            const approxCharWidth = fontSize * 0.55;
            const approxLineHeight = (el.lineHeight || 1.2) * fontSize;
            const charsPerLine = Math.max(1, Math.floor(el.width / approxCharWidth));
            const linesAvailable = Math.max(1, Math.floor(el.height / approxLineHeight));
            const charsAvailable = charsPerLine * linesAvailable;
            if (el.text.length > charsAvailable * 1.5) {
              issues.push(createIssue({
                ...ctx,
                severity: Severity.WARNING,
                code:     Code.TEXT_LIKELY_OVERFLOW,
                message:  `Text element "${elName}" may overflow its frame (${el.text.length} chars in ~${charsAvailable}-char frame).`,
                fix:      'Reduce the text length, increase the frame size, or reduce the font size.',
              }));
            }
          }

          // Rule: font constraint check
          if (
            styleConstraints.allowCustomFonts === false &&
            styleConstraints.allowedFonts &&
            styleConstraints.allowedFonts.length > 0
          ) {
            const fontFamily = el.fontFamily || 'Arial';
            const isAllowed = styleConstraints.allowedFonts.some(
              (f) => f.toLowerCase() === fontFamily.toLowerCase()
            );
            if (!isAllowed) {
              issues.push(createIssue({
                ...ctx,
                severity: Severity.WARNING,
                code:     Code.FONT_NOT_IN_CONSTRAINTS,
                message:  `Font "${fontFamily}" in "${elName}" is not in the allowed font list.`,
                fix:      `Change the font to one of: ${styleConstraints.allowedFonts.join(', ')}.`,
              }));
            }
          }

          // Rule: text color constraint check
          if (
            styleConstraints.allowCustomColors === false &&
            styleConstraints.colorPalette &&
            styleConstraints.colorPalette.length > 0
          ) {
            const fillColor = el.fill || '';
            if (fillColor && !styleConstraints.colorPalette.includes(fillColor)) {
              issues.push(createIssue({
                ...ctx,
                severity: Severity.WARNING,
                code:     Code.COLOR_NOT_IN_PALETTE,
                message:  `Text color "${fillColor}" in "${elName}" is not in the brand color palette.`,
                fix:      `Change the fill color to one of: ${styleConstraints.colorPalette.join(', ')}.`,
              }));
            }
          }
        } // end type=text

        if (type === 'image') {
          // Rule: missing image source
          const src = (el.src || '').trim();
          if (!src) {
            issues.push(createIssue({
              ...ctx,
              severity: Severity.ERROR,
              code:     Code.MISSING_IMAGE_SRC,
              message:  `Image element "${elName}" on page "${pageName}" has no image source.`,
              fix:      'Upload or link an image for this element.',
            }));
          }
        } // end type=image

        // Rule: shape fill color constraint check
        if (['rect', 'ellipse'].includes(type)) {
          if (
            styleConstraints.allowCustomColors === false &&
            styleConstraints.colorPalette &&
            styleConstraints.colorPalette.length > 0
          ) {
            const fillColor = el.fill || '';
            if (fillColor && !styleConstraints.colorPalette.includes(fillColor)) {
              issues.push(createIssue({
                ...ctx,
                severity: Severity.WARNING,
                code:     Code.COLOR_NOT_IN_PALETTE,
                message:  `Shape "${elName}" fill color "${fillColor}" is not in the brand color palette.`,
                fix:      `Change the fill color to one of: ${styleConstraints.colorPalette.join(', ')}.`,
              }));
            }
          }
        }

        // Rule: variable field checks
        if (el.isVariable) {
          hasAnyVariableField = true;
          const key = (el.variableKey || '').trim();

          if (!key) {
            issues.push(createIssue({
              ...ctx,
              severity: Severity.ERROR,
              code:     Code.EMPTY_REQUIRED_VARIABLE,
              message:  `Variable element "${elName}" on page "${pageName}" has no variable key set.`,
              fix:      'Set a unique variable key (e.g. "headline", "price", "logo") in the Properties panel.',
            }));
          } else {
            if (!variableKeys[key]) variableKeys[key] = [];
            variableKeys[key].push(ctx);
          }
        }
      } // end element loop
    } // end page loop

    // ── Rule: duplicate variable keys ─────────────────────────────────────────
    for (const [key, refs] of Object.entries(variableKeys)) {
      if (refs.length > 1) {
        issues.push(createIssue({
          severity:    Severity.WARNING,
          code:        Code.DUPLICATE_VARIABLE_KEYS,
          message:     `Variable key "${key}" is used by ${refs.length} elements. Variable keys should be unique.`,
          fix:         'Assign unique variable keys to each variable element.',
          elementId:   refs[0].elementId,
          elementName: refs[0].elementName,
          pageId:      refs[0].pageId,
          pageName:    refs[0].pageName,
        }));
      }
    }

    // ── Rule: no variable fields (info) ───────────────────────────────────────
    if (!hasAnyVariableField) {
      issues.push(createIssue({
        severity: Severity.INFO,
        code:     Code.NO_VARIABLE_FIELDS,
        message:  'This template has no variable fields. It will produce identical output every time.',
        fix:      'Mark text or image elements as variable in the Properties panel to enable data-driven personalization.',
      }));
    }

    // ── Rule: single-page template (info) ─────────────────────────────────────
    if (pages.length === 1) {
      issues.push(createIssue({
        severity: Severity.INFO,
        code:     Code.SINGLE_PAGE_TEMPLATE,
        message:  'Template has a single page.',
        fix:      'Add more pages if this is a multi-page document (e.g. brochure, booklet).',
      }));
    }

    return this._buildReport(issues);
  },

  /**
   * Builds the final ValidationReport object from the accumulated issues.
   * @private
   */
  _buildReport(issues) {
    const summary = issues.reduce(
      (acc, issue) => {
        acc[issue.severity]++;
        return acc;
      },
      { error: 0, warning: 0, info: 0 }
    );

    const isValid = summary.error === 0;

    return {
      isValid,
      issues,
      summary: {
        errors:   summary.error,
        warnings: summary.warning,
        infos:    summary.info,
        total:    issues.length,
      },
      timestamp: new Date().toISOString(),
    };
  },
};

module.exports = { ValidationEngine, Severity, Code };