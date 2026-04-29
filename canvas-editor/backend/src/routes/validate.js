'use strict';

const express = require('express');
const router  = express.Router();
const { ValidationEngine } = require('../services/validationService');
const { TemplateEngine }   = require('../services/templateEngine');
const Template             = require('../models/Template');

// ── POST /api/validate ────────────────────────────────────────────────────────
// Validate a raw template JSON payload.
// Body: { template: { pages, styleConstraints? } }
router.post('/', (req, res) => {
  const { template } = req.body;

  if (!template) {
    return res.status(400).json({ error: 'Request body must include a "template" object.' });
  }

  try {
    const report = ValidationEngine.validate(template);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/validate/:id ─────────────────────────────────────────────────────
// Validate a stored template by its MongoDB ID.
router.get('/:id', async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const report = ValidationEngine.validate(template.toObject());
    res.json({ templateId: req.params.id, templateName: template.name, ...report });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/validate/merge-preview ─────────────────────────────────────────
// Merge variable data into a template and validate the result.
// Body: { template, variableData: {} }
router.post('/merge-preview', (req, res) => {
  const { template, variableData = {} } = req.body;

  if (!template) {
    return res.status(400).json({ error: 'Request body must include a "template" object.' });
  }

  try {
    const merged = TemplateEngine.mergeVariables(template, variableData);
    const report = ValidationEngine.validate(merged);
    const schema = TemplateEngine.extractVariableSchema(template);

    res.json({ report, schema, mergedTemplate: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/validate/:id/schema ──────────────────────────────────────────────
// Return the variable field schema for a stored template.
router.get('/:id/schema', async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const schema  = TemplateEngine.extractVariableSchema(template.toObject());
    const summary = TemplateEngine.summarise(template.toObject());

    res.json({ templateId: req.params.id, templateName: template.name, schema, summary });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/validate/resize ─────────────────────────────────────────────────
// Resize a template to new dimensions and return the result.
// Body: { template, width, height, mode? }
router.post('/resize', (req, res) => {
  const { template, width, height, mode = 'stretch' } = req.body;

  if (!template || !width || !height) {
    return res.status(400).json({ error: 'template, width, and height are required.' });
  }

  try {
    const resized = TemplateEngine.resizeTemplate(template, Number(width), Number(height), mode);
    res.json({ resizedTemplate: resized });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;