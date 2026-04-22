const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const ElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'rect', 'ellipse', 'line', 'star'], required: true },

  // Transform
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  width: { type: Number, default: 100 },
  height: { type: Number, default: 100 },
  rotation: { type: Number, default: 0 },
  scaleX: { type: Number, default: 1 },
  scaleY: { type: Number, default: 1 },

  // Appearance
  fill: { type: String, default: '#000000' },
  stroke: { type: String, default: '' },
  strokeWidth: { type: Number, default: 0 },
  opacity: { type: Number, default: 1 },

  // Text-specific
  text: { type: String, default: '' },
  fontSize: { type: Number, default: 16 },
  fontFamily: { type: String, default: 'Arial' },
  fontStyle: { type: String, default: 'normal' },
  fontWeight: { type: String, default: 'normal' },
  textDecoration: { type: String, default: '' },
  align: { type: String, default: 'left' },
  lineHeight: { type: Number, default: 1.2 },
  letterSpacing: { type: Number, default: 0 },

  // Image-specific
  src: { type: String, default: '' },

  // Constraints
  locked: { type: Boolean, default: false },
  isEditable: { type: Boolean, default: true },
  isVariable: { type: Boolean, default: false },
  variableKey: { type: String, default: '' },

  // Layer
  zIndex: { type: Number, default: 0 },
  name: { type: String, default: '' },
  visible: { type: Boolean, default: true },
}, { _id: false });

const PageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, default: 'Page 1' },
  width: { type: Number, default: 800 },
  height: { type: Number, default: 600 },
  background: { type: String, default: '#ffffff' },
  elements: [ElementSchema],
}, { _id: false });

const StyleConstraintsSchema = new mongoose.Schema({
  allowedFonts: [{ type: String }],
  colorPalette: [{ type: String }],
  allowCustomColors: { type: Boolean, default: true },
  allowCustomFonts: { type: Boolean, default: true },
}, { _id: false });

// ── Main Template Schema ──────────────────────────────────────────────────────

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  tags: [{ type: String }],

  pages: [PageSchema],
  styleConstraints: { type: StyleConstraintsSchema, default: () => ({}) },

  // Meta
  author: { type: String, default: 'Anonymous' },
  isPublic: { type: Boolean, default: true },
  version: { type: Number, default: 1 },

  // Approval workflow
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected'],
    default: 'draft',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

TemplateSchema.index({ name: 'text', description: 'text' });
TemplateSchema.index({ tags: 1 });
TemplateSchema.index({ status: 1 });

module.exports = mongoose.model('Template', TemplateSchema);