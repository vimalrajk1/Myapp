require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const templateRoutes  = require('./src/routes/templates');
const exportRoutes    = require('./src/routes/export');
const assetRoutes     = require('./src/routes/assets');
const validateRoutes  = require('./src/routes/validate');
const errorHandler    = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & Logging ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Static files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/templates', templateRoutes);
app.use('/api/export',    exportRoutes);
app.use('/api/assets',    assetRoutes);
app.use('/api/validate',  validateRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Database + Server Start ──────────────────────────────────────────────────
const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/canvas-editor';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected:', mongoUri);

    app.listen(PORT, () => {
      console.log(`🚀 Canvas Editor API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.log('⚠️  Starting server without database (template storage disabled)...');
    app.listen(PORT, () => {
      console.log(`🚀 Canvas Editor API running on http://localhost:${PORT} (no DB)`);
    });
  }
};

startServer();