const express = require('express');
const router = express.Router();
const Template = require('../models/Template');

// ── GET /api/templates ────────────────────────────────────────────────────────
// List all templates (with optional ?search=&tag=&status= filters)
router.get('/', async (req, res, next) => {
  try {
    const { search, tag, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (tag) {
      query.tags = tag;
    }
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [templates, total] = await Promise.all([
      Template.find(query)
        .select('-pages.elements') // Exclude heavy element data from list
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Template.countDocuments(query),
    ]);

    res.json({
      templates,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/templates/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/templates ───────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const template = new Template(req.body);
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/templates/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { ...req.body, $inc: { version: 1 } },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/templates/:id/status ──────────────────────────────────────────
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'pending_review', 'approved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/templates/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/templates/:id/duplicate ─────────────────────────────────────────
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await Template.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Template not found' });

    const duplicate = new Template({
      ...original.toObject(),
      _id: undefined,
      name: `${original.name} (Copy)`,
      status: 'draft',
      version: 1,
      createdAt: undefined,
      updatedAt: undefined,
    });
    await duplicate.save();
    res.status(201).json(duplicate);
  } catch (err) {
    next(err);
  }
});

module.exports = router;