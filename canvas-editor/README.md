# Canvas Editor — Web-to-Print Platform

A full-stack, browser-based web-to-print editor built with **React + Konva.js** (frontend) and **Node.js + Express** (backend). Designers create multi-page templates in the browser; the system validates, processes, and renders print-ready PDFs server-side.

---

## Architecture

```
[ User (Browser) ]
        ↓
[ Frontend Editor  —  React + Konva.js + Zustand ]
        ↓  REST / JSON
[ API Layer  —  Node.js + Express ]
        ↓
[ Core Services ]
   ├── Template Engine      — variable merge, resize, variant generation
   ├── Validation Engine 🔥 — rule-based preflight checks (15 rules)
   ├── Rendering Engine     — Puppeteer HTML→PDF (multi-page)
   └── Asset Manager        — Multer upload, list, delete
        ↓
[ Storage ]
   ├── Templates  — MongoDB (Mongoose)
   ├── Assets     — ./uploads/  (images, fonts)
   └── Outputs    — ./outputs/  (generated PDFs)
        ↓
[ Cloud Hosting — AWS ]
   ├── EC2 / ECS  — backend container
   ├── S3         — assets + outputs (env-flag switchable)
   └── CloudFront — CDN for assets
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (optional — PDF/PNG export works without it)

### Install & Run

```bash
# Backend
cd canvas-editor/backend
npm install
cp .env.example .env
npm run dev          # http://localhost:4000

# Frontend (new terminal)
cd canvas-editor/frontend
npm install
npm run dev          # http://localhost:5173
```

### Docker (full stack)

```bash
cd canvas-editor
docker-compose up --build
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:4000
```

---

## Feature Overview

| Category | Feature |
|---|---|
| **Canvas** | Multi-page editor, Konva.js Stage + Layer |
| **Elements** | Text (inline edit), Image, Rect, Ellipse, Line |
| **Layers** | Visibility, lock, reorder, bring-forward/send-back |
| **Properties** | Transform, typography, colour picker, variable fields |
| **Pages** | Add/delete/reorder pages |
| **History** | 50-step undo/redo |
| **Snap** | Snap-to-grid, snap-to-element guides |
| **Zoom** | 10 %–400 % with keyboard shortcuts |
| **Validation 🔥** | 15-rule preflight engine, live issue panel, PDF export gate |
| **Export** | PNG (client-side 2×), PDF (server-side Puppeteer) |
| **Templates** | JSON save/load, MongoDB CRUD, duplicate, status workflow |
| **Assets** | Upload (25 MB max), list, delete |
| **Outputs** | Saved PDFs listed at `/api/export/outputs` |

---

## Validation Engine 🔥

Rules run automatically every 600 ms (debounced) or on demand.

| Severity | Code | Description |
|---|---|---|
| **Error** | `NO_PAGES` | Template has no pages |
| **Error** | `MISSING_IMAGE_SRC` | Image element with no source |
| **Error** | `EMPTY_REQUIRED_VARIABLE` | Variable element with no key |
| **Error** | `ELEMENT_OUT_OF_BOUNDS` | Element completely outside page |
| **Error** | `DUPLICATE_ID` | Duplicate element IDs |
| **Warning** | `EMPTY_TEXT` | Placeholder / empty text |
| **Warning** | `FONT_NOT_IN_CONSTRAINTS` | Font not in allowedFonts list |
| **Warning** | `COLOR_NOT_IN_PALETTE` | Color not in brand palette |
| **Warning** | `SMALL_FONT_SIZE` | Font < 6 px |
| **Warning** | `TEXT_LIKELY_OVERFLOW` | Text likely exceeds frame |
| **Warning** | `NEAR_OUT_OF_BOUNDS` | Element partially off-canvas |
| **Warning** | `DUPLICATE_VARIABLE_KEYS` | Two elements share a variable key |
| **Warning** | `LOCKED_AND_EDITABLE` | Element is both locked + editable |
| **Warning** | `ZERO_DIMENSION` | Element has zero width or height |
| **Info** | `NO_VARIABLE_FIELDS` | No variable fields — static output |
| **Info** | `SINGLE_PAGE_TEMPLATE` | Single-page document |

PDF export is **blocked** while any `error`-severity issue remains unresolved.

---

## API Reference

### Templates

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates` | List (search, tag, status, page, limit) |
| `GET` | `/api/templates/:id` | Get by ID |
| `POST` | `/api/templates` | Create |
| `PUT` | `/api/templates/:id` | Update (auto-increments version) |
| `PATCH` | `/api/templates/:id/status` | Update status |
| `DELETE` | `/api/templates/:id` | Delete |
| `POST` | `/api/templates/:id/duplicate` | Duplicate |

### Validation Engine

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/validate` | Validate raw template JSON |
| `GET` | `/api/validate/:id` | Validate stored template |
| `GET` | `/api/validate/:id/schema` | Extract variable schema |
| `POST` | `/api/validate/merge-preview` | Merge data + validate |
| `POST` | `/api/validate/resize` | Resize template |

### Export / Render

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/export/pdf` | Generate + download PDF |
| `POST` | `/api/export/pdf-preview` | PDF as base64 string |
| `GET` | `/api/export/outputs` | List saved output PDFs |
| `DELETE` | `/api/export/outputs/:file` | Delete saved output |

### Assets

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/assets/upload` | Upload image (max 25 MB) |
| `GET` | `/api/assets` | List uploaded assets |
| `DELETE` | `/api/assets/:filename` | Delete asset |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Select tool |
| `T` | Text tool |
| `R` | Rectangle tool |
| `E` | Ellipse tool |
| `L` | Line tool |
| `I` | Image tool |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Y` | Redo |
| `⌘D` / `Ctrl+D` | Duplicate selection |
| `⌘A` / `Ctrl+A` | Select all |
| `Del` / `Backspace` | Delete selection |
| `Arrow keys` | Nudge (1 px) |
| `⇧+Arrow` | Nudge (10 px) |
| `[` / `]` | Send backward / Bring forward |
| `+` / `-` | Zoom in / out |
| `G` | Toggle grid |

---

## Project Structure

```
canvas-editor/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── Template.js          ← Mongoose schema
│   │   ├── routes/
│   │   │   ├── assets.js            ← Asset Manager API
│   │   │   ├── export.js            ← Rendering Engine API + Outputs
│   │   │   ├── templates.js         ← Template CRUD API
│   │   │   └── validate.js          ← Validation Engine API 🔥
│   │   ├── services/
│   │   │   ├── pdfService.js        ← HTML→PDF renderer (Puppeteer)
│   │   │   ├── templateEngine.js    ← Variable merge, resize, variants
│   │   │   └── validationService.js ← 15-rule preflight engine 🔥
│   │   └── middleware/
│   │       └── errorHandler.js
│   ├── outputs/                     ← Saved PDF outputs (auto-created)
│   ├── uploads/                     ← Asset uploads (auto-created)
│   ├── .env.example
│   ├── Dockerfile
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Canvas/              ← CanvasEditor, Text/Image/ShapeElement
│       │   ├── Panels/
│       │   │   ├── LayersPanel.jsx
│       │   │   ├── PagesPanel.jsx
│       │   │   ├── PropertiesPanel.jsx
│       │   │   └── ValidationPanel.jsx  ← Issue list, auto-validate 🔥
│       │   └── Toolbar/
│       │       └── Toolbar.jsx      ← Validate + Full-check + PDF gate
│       ├── hooks/
│       │   └── useKeyboardShortcuts.js
│       ├── services/
│       │   └── api.js               ← Centralised Axios API client
│       ├── store/
│       │   └── useEditorStore.js    ← Zustand store (+ validation state)
│       └── utils/
│           ├── alignmentUtils.js
│           ├── exportUtils.js
│           ├── uuid.js
│           └── validationUtils.js   ← Client-side validation (instant) 🔥
│
└── docker-compose.yml
```

---

## Roadmap

- [ ] AWS S3 integration (asset + output storage)
- [ ] Real-time collaboration (Yjs CRDT)
- [ ] CMYK colour support (print-ready output)
- [ ] Custom font upload + PDF embedding (PDFKit)
- [ ] Role-based access control (admin / designer / viewer)
- [ ] Template approval workflow UI
- [ ] Variable data CSV/JSON merge UI (batch personalisation)
- [ ] Image cropping & masking (Konva clip)
- [ ] DAM/PIM integration hooks
- [ ] Paragraph & character text style system