const express = require('express');
const router = express.Router();
const { renderTemplateToPDF } = require('../services/pdfService');

// ── POST /api/export/pdf ──────────────────────────────────────────────────────
// Body: { template: { pages: [...] }, filename: 'my-doc' }
router.post('/pdf', async (req, res, next) => {
  try {
    const { template, filename = 'export' } = req.body;

    if (!template || !template.pages || !Array.isArray(template.pages)) {
      return res.status(400).json({ error: 'Invalid template: must include pages array' });
    }

    console.log(`📄 Generating PDF for "${filename}" (${template.pages.length} page(s))...`);

    const pdfBuffer = await renderTemplateToPDF(template);

    const safeFilename = filename.replace(/[^a-z0-9_\-]/gi, '_');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF generation failed:', err);
    next(err);
  }
});

// ── POST /api/export/pdf-preview ─────────────────────────────────────────────
// Returns a base64-encoded PDF for inline preview
router.post('/pdf-preview', async (req, res, next) => {
  try {
    const { template } = req.body;

    if (!template || !template.pages) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    const pdfBuffer = await renderTemplateToPDF(template);
    const base64 = pdfBuffer.toString('base64');

    res.json({ pdf: base64, mimeType: 'application/pdf' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;