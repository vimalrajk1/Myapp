'use strict';

/**
 * Template Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Processes Web-to-Print templates:
 *   - Variable substitution  (data-merge)
 *   - Variable schema extraction
 *   - Multi-size variant generation
 *   - Deep template cloning
 */

const { v4: uuid } = require('uuid');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deep-clone a plain object/array via JSON (safe for template JSON). */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Resolve a dotted-path key from a data object.
 * e.g. get({ user: { name: 'Alice' } }, 'user.name') → 'Alice'
 */
const getNestedValue = (data, keyPath) => {
  return keyPath.split('.').reduce((acc, part) => {
    return acc != null && typeof acc === 'object' ? acc[part] : undefined;
  }, data);
};

// ── Template Engine ───────────────────────────────────────────────────────────

const TemplateEngine = {
  /**
   * Merge a flat or nested variable data object into a template.
   * Variable elements (isVariable: true) are matched by their variableKey.
   *
   * For text elements: the `text` field is replaced with the data value.
   * For image elements: the `src` field is replaced with the data value (URL).
   *
   * Missing keys leave the element unchanged.
   *
   * @param   {Object} templateData  Full template JSON { pages, styleConstraints }
   * @param   {Object} variableData  Flat or nested map of key → value
   * @returns {Object}               New merged template (original is not mutated)
   */
  mergeVariables(templateData, variableData = {}) {
    if (!templateData || !templateData.pages) {
      throw new Error('templateData must include a pages array');
    }

    const merged = deepClone(templateData);

    for (const page of merged.pages) {
      for (const el of (page.elements || [])) {
        if (!el.isVariable || !el.variableKey) continue;

        const value = getNestedValue(variableData, el.variableKey);
        if (value === undefined || value === null) continue;

        if (el.type === 'text') {
          el.text = String(value);
        } else if (el.type === 'image') {
          el.src = String(value);
        }
        // Other types: attach as metadata for forward-compatibility
        el._mergedValue = value;
      }
    }

    return merged;
  },

  /**
   * Extract the variable field schema from a template.
   * Returns an array describing every variable element so calling code
   * (a form builder, CSV importer, etc.) knows what data to supply.
   *
   * @param   {Object} templateData
   * @returns {VariableSchema[]}
   *   [{ key, type, label, defaultValue, pageId, pageName, elementId, required }]
   */
  extractVariableSchema(templateData) {
    if (!templateData || !templateData.pages) return [];

    const schema = [];
    const seenKeys = new Set();

    for (const page of templateData.pages) {
      for (const el of (page.elements || [])) {
        if (!el.isVariable || !el.variableKey) continue;

        const key = el.variableKey;

        // Deduplicate by key (same key on multiple pages = same variable)
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        schema.push({
          key,
          type:         el.type === 'image' ? 'image' : 'text',
          label:        el.name || key,
          defaultValue: el.type === 'image' ? (el.src || '') : (el.text || ''),
          pageId:       page.id,
          pageName:     page.name || 'Page 1',
          elementId:    el.id,
          required:     true,
        });
      }
    }

    return schema;
  },

  /**
   * Batch-merge: produce an array of merged templates from an array of data rows.
   * Useful for generating personalised variants (e.g. variable-data printing).
   *
   * @param   {Object}   templateData
   * @param   {Object[]} rows         Array of variable-data objects
   * @returns {Object[]}              Array of merged templates (one per row)
   */
  generateVariants(templateData, rows = []) {
    if (!Array.isArray(rows)) throw new Error('rows must be an array');
    return rows.map((row, idx) => ({
      variantIndex: idx,
      rowData:      row,
      template:     this.mergeVariables(templateData, row),
    }));
  },

  /**
   * Resize all pages (and proportionally reposition elements) to a new size.
   *
   * mode:
   *   'stretch'     – scale elements to fill the new canvas exactly
   *   'fit'         – scale elements to fit within the new canvas (preserve ratio)
   *   'reposition'  – keep element sizes; re-anchor by relative position only
   *
   * @param   {Object} templateData
   * @param   {number} newWidth
   * @param   {number} newHeight
   * @param   {string} [mode='stretch']
   * @returns {Object}  New resized template
   */
  resizeTemplate(templateData, newWidth, newHeight, mode = 'stretch') {
    if (!newWidth || !newHeight || newWidth <= 0 || newHeight <= 0) {
      throw new Error(`Invalid target dimensions: ${newWidth} × ${newHeight}`);
    }

    const resized = deepClone(templateData);

    for (const page of resized.pages) {
      const scaleX = newWidth  / (page.width  || newWidth);
      const scaleY = newHeight / (page.height || newHeight);

      let sx, sy;

      if (mode === 'stretch') {
        sx = scaleX;
        sy = scaleY;
      } else if (mode === 'fit') {
        const uniform = Math.min(scaleX, scaleY);
        sx = uniform;
        sy = uniform;
      } else {
        // reposition: maintain element size, scale position only
        sx = scaleX;
        sy = scaleY;
      }

      page.width  = newWidth;
      page.height = newHeight;

      for (const el of (page.elements || [])) {
        el.x = Math.round(el.x * scaleX);
        el.y = Math.round(el.y * scaleY);

        if (mode !== 'reposition') {
          el.width  = Math.round((el.width  || 0) * sx);
          el.height = Math.round((el.height || 0) * sy);

          // Scale font size proportionally (average of sx/sy for readability)
          if (el.type === 'text' && el.fontSize) {
            el.fontSize = Math.max(6, Math.round(el.fontSize * ((sx + sy) / 2)));
          }
        }
      }
    }

    return resized;
  },

  /**
   * Deep-clone a template and assign fresh IDs to all pages and elements.
   * Useful for "duplicate template" operations.
   *
   * @param   {Object} templateData
   * @param   {string} [newName]
   * @returns {Object}
   */
  cloneTemplate(templateData, newName) {
    const cloned = deepClone(templateData);

    if (newName) cloned.name = newName;

    for (const page of (cloned.pages || [])) {
      page.id = uuid();
      for (const el of (page.elements || [])) {
        el.id = uuid();
      }
    }

    return cloned;
  },

  /**
   * Produce a summary of a template for display in template galleries.
   *
   * @param   {Object} templateData
   * @returns {Object}
   */
  summarise(templateData) {
    const { pages = [], styleConstraints = {}, name, description, tags = [] } = templateData;

    let totalElements  = 0;
    let textElements   = 0;
    let imageElements  = 0;
    let variableFields = 0;

    for (const page of pages) {
      for (const el of (page.elements || [])) {
        totalElements++;
        if (el.type === 'text')  textElements++;
        if (el.type === 'image') imageElements++;
        if (el.isVariable)       variableFields++;
      }
    }

    return {
      name:          name || 'Untitled',
      description:   description || '',
      tags,
      pageCount:     pages.length,
      dimensions:    pages[0] ? `${pages[0].width} × ${pages[0].height}px` : 'N/A',
      totalElements,
      textElements,
      imageElements,
      variableFields,
      hasConstraints: !!(styleConstraints.allowedFonts?.length || styleConstraints.colorPalette?.length),
    };
  },
};

module.exports = { TemplateEngine };