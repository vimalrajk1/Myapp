# ✦ Canvas Editor — Web-to-Print

A professional, browser-based canvas editor for creating multi-page print and digital templates. Built with **React + Konva.js** (frontend) and **Node.js + Express + Puppeteer** (backend).

---

## 🗂 Project Structure

```
canvas-editor/
├── frontend/           # React + Vite + Konva.js
│   └── src/
│       ├── components/
│       │   ├── Canvas/         # CanvasEditor, TextElement, ImageElement, ShapeElement
│       │   ├── Toolbar/        # Top toolbar with tools & export actions
│       │   └── Panels/         # LayersPanel, PropertiesPanel, PagesPanel
│       ├── store/              # Zustand global state (useEditorStore)
│       ├── hooks/              # Keyboard shortcuts
│       └── utils/              # Export, alignment, snap utilities
└── backend/            # Express API
    └── src/
        ├── routes/             # /api/templates, /api/export, /api/assets
        ├── models/             # Mongoose Template model
        ├── services/           # pdfService (Puppeteer)
        └── middleware/         # Error handler
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd canvas-editor/backend
cp .env.example .env        # edit MONGODB_URI if needed
npm install
npm run dev                 # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd canvas-editor/frontend
npm install
npm run dev                 # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🐳 Docker (Production)

```bash
cd canvas-editor
docker-compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:4000
- MongoDB → localhost:27017

---

## ✨ Features

### Canvas
| Feature | Details |
|---|---|
| **Elements** | Text, Image, Rectangle, Ellipse, Line, Star |
| **Transform** | Drag, Resize, Rotate via Konva Transformer |
| **Inline Text Editing** | Double-click → HTML textarea overlay (no re-render flicker) |
| **Multi-select** | Shift+click, Ctrl+A |
| **Lock / Unlock** | Per-element; locked elements can't be moved |
| **Visibility toggle** | Hide/show elements in Layers panel |
| **Variable fields** | Mark text elements as `{variable}` with a key |
| **Editable regions** | Toggle `isEditable` per element |

### Layers Panel
- Full layers list sorted top-to-bottom (like Figma)
- Show/hide, lock/unlock, delete, duplicate
- Bring forward / Send backward

### Pages
- Multi-page support
- Add, delete, reorder pages
- Per-page dimensions & background color

### Properties Panel
- Position, size, rotation, opacity
- Fill & stroke color pickers (with palette support)
- Typography controls: font, size, bold/italic/underline, align, line-height, letter-spacing
- Style constraints: restrict fonts & color palettes per template

### Alignment & Snapping
- Align selected elements: left, center, right, top, middle, bottom
- Distribute evenly (horizontal/vertical)
- Snap-to-grid (20px) with visual grid overlay
- Alignment guides when dragging near other elements

### History
- 50-step undo/redo
- Keyboard: `Ctrl/⌘+Z` / `Ctrl/⌘+Y`

### Export
| Type | Method |
|---|---|
| **PNG** | Client-side via Konva `toDataURL` at 2× pixel ratio |
| **PDF** | Server-side via Puppeteer; multi-page support |
| **JSON** | Template save/load (client-side download & file open) |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Select tool |
| `T` | Text tool |
| `R` | Rectangle tool |
| `E` | Ellipse tool |
| `L` | Line tool |
| `I` | Image tool |
| `Ctrl/⌘+Z` | Undo |
| `Ctrl/⌘+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl/⌘+D` | Duplicate selection |
| `Delete` / `Backspace` | Delete selection |
| `Ctrl/⌘+A` | Select all |
| `Ctrl/⌘+]` | Bring forward |
| `Ctrl/⌘+[` | Send backward |
| `Arrow keys` | Nudge (1px) |
| `Shift+Arrow` | Nudge (10px) |
| `Ctrl/⌘+0` | Reset zoom to 100% |
| `Escape` | Deselect / switch to Select tool |

---

## 🔌 Backend API

### Templates
```
GET    /api/templates          List templates (paginated, filterable)
GET    /api/templates/:id      Get single template
POST   /api/templates          Create template
PUT    /api/templates/:id      Update template
DELETE /api/templates/:id      Delete template
POST   /api/templates/:id/duplicate  Duplicate template
PATCH  /api/templates/:id/status     Update approval status
```

### Export
```
POST   /api/export/pdf         Generate PDF → file download
POST   /api/export/pdf-preview Generate PDF → base64 response
```

### Assets
```
GET    /api/assets             List uploaded assets
POST   /api/assets/upload      Upload image (multipart/form-data, field: "file")
DELETE /api/assets/:filename   Delete asset
```

---

## 🔮 Roadmap

- [ ] Real-time collaboration (WebSocket / CRDT)
- [ ] Image cropping & masking (Konva clip)
- [ ] Custom font upload & embedding
- [ ] CMYK color support (print-ready)
- [ ] Role-based access control (admin / designer / viewer)
- [ ] Template approval workflow UI
- [ ] AWS S3 integration for asset storage
- [ ] Variable field merge (data-driven print)
- [ ] PDF font embedding (PDFKit / jsPDF)
- [ ] Paragraph & character text styles