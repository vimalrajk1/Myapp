'use strict';

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { renderTemplateToPDF } = require('../services/pdfService');
const { ValidationEngine }   = require('../services/validationService');

// ── Outputs storage directory ──────────────────────────────────────────────────
const outputsDir = path.join(__dirname, '../../../outputs');
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

// ── POST /api/export/pdf ──────────────────────────────────────────────────────
// Body: { template: { pages: [...] }, filename?, saveOutput?, skipValidation? }
router.post('/pdf', async (req, res, next) => {
  try {
    const {
      template,
      filename      = 'export',
      saveOutput    = false,    // persist to outputs/ folder
      skipValidation = false,   // override for trusted server-to-server calls
    } = req.body;

    if (!template || !template.pages || !Array.isArray(template.pages)) {
      return res.status(400).json({ error: 'Invalid template: must include a pages array.' });
    }

    // ── Validation gate ───────────────────────────────────────────────────────
    if (!skipValidation) {
      const report = ValidationEngine.validate(template);
      if (!report.isValid) {
        return res.status(422).json({
          error:    'Template failed validation — PDF export blocked.',
          report,
        });
      }
    }

    console.log(`📄 Generating PDF "${filename}" (${template.pages.length} page(s))…`);
    const pdfBuffer = await renderTemplateToPDF(template);

    const safeFilename = filename.replace(/[^a-z0-9_\-]/gi, '_');

    // ── Optionally persist to outputs/ ────────────────────────────────────────
    if (saveOutput) {
      const ts       = new Date().toISOString().replace(/[:.]/g, '-');
      const outFile  = path.join(outputsDir, `${safeFilename}_${ts}.pdf`);
      fs.writeFileSync(outFile, pdfBuffer);
      console.log(`💾 Saved output: ${outFile}`);
    }

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF generation failed:', err);
    next(err);
  }
});

// ── POST /api/export/pdf-preview ─────────────────────────────────────────────
// Returns a base64-encoded PDF for inline preview.
// Body: { template }
router.post('/pdf-preview', async (req, res, next) => {
  try {
    const { template } = req.body;

    if (!template || !template.pages) {
      return res.status(400).json({ error: 'Invalid template.' });
    }

    const pdfBuffer = await renderTemplateToPDF(template);
    const base64    = pdfBuffer.toString('base64');

    res.json({ pdf: base64, mimeType: 'application/pdf' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/export/outputs ───────────────────────────────────────────────────
// List previously saved PDF outputs.
router.get('/outputs', (req, res) => {
  try {
    const files  = fs.readdirSync(outputsDir).filter((f) => f.endsWith('.pdf'));
    const host   = `${req.protocol}://${req.get('host')}`;

    const outputs = files
      .map((filename) => {
        const stats = fs.statSync(path.join(outputsDir, filename));
        return {
          filename,
          url:       `${host}/outputs/${filename}`,
          size:      stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ outputs, total: outputs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list outputs.' });
  }
});

// ── DELETE /api/export/outputs/:filename ─────────────────────────────────────
router.delete('/outputs/:filename', (req, res) => {
  const filePath = path.join(outputsDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Output file not found.' });
  }
  fs.unlinkSync(filePath);
  res.json({ message: 'Output deleted.' });
});

module.exports = router;