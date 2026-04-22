const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ── Storage Configuration ─────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype) || file.mimetype === 'image/svg+xml';
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, gif, webp, svg)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// ── POST /api/assets/upload ───────────────────────────────────────────────────
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const host = `${req.protocol}://${req.get('host')}`;
  const url = `${host}/uploads/${req.file.filename}`;

  res.status(201).json({
    id: path.basename(req.file.filename, path.extname(req.file.filename)),
    filename: req.file.filename,
    originalName: req.file.originalname,
    url,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// ── GET /api/assets ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const host = `${req.protocol}://${req.get('host')}`;

    const assets = files
      .filter((f) => !f.startsWith('.'))
      .map((filename) => {
        const stats = fs.statSync(path.join(uploadsDir, filename));
        return {
          id: path.basename(filename, path.extname(filename)),
          filename,
          url: `${host}/uploads/${filename}`,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ assets, total: assets.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

// ── DELETE /api/assets/:filename ──────────────────────────────────────────────
router.delete('/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  fs.unlinkSync(filePath);
  res.json({ message: 'Asset deleted' });
});

module.exports = router;