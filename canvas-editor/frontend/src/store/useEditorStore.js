import { create } from 'zustand';
import { v4 as uuid } from '../utils/uuid.js';

// ── Default page factory ──────────────────────────────────────────────────────
const createPage = (overrides = {}) => ({
  id: uuid(),
  name: 'Page 1',
  width: 800,
  height: 600,
  background: '#ffffff',
  elements: [],
  ...overrides,
});

// ── Default element factories ─────────────────────────────────────────────────
export const elementDefaults = {
  text: {
    type: 'text',
    x: 100, y: 100,
    width: 200, height: 50,
    text: 'Double-click to edit',
    fontSize: 18,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fontWeight: 'normal',
    textDecoration: '',
    align: 'left',
    fill: '#1e293b',
    stroke: '',
    strokeWidth: 0,
    lineHeight: 1.3,
    letterSpacing: 0,
    opacity: 1,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    locked: false,
    visible: true,
    isEditable: true,
    isVariable: false,
    variableKey: '',
  },
  rect: {
    type: 'rect',
    x: 150, y: 150,
    width: 200, height: 150,
    fill: '#6366f1',
    stroke: '',
    strokeWidth: 0,
    opacity: 1,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    locked: false,
    visible: true,
    cornerRadius: 0,
  },
  ellipse: {
    type: 'ellipse',
    x: 200, y: 200,
    width: 150, height: 150,
    fill: '#22c55e',
    stroke: '',
    strokeWidth: 0,
    opacity: 1,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    locked: false,
    visible: true,
  },
  image: {
    type: 'image',
    x: 100, y: 100,
    width: 300, height: 200,
    src: '',
    opacity: 1,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    locked: false,
    visible: true,
  },
  line: {
    type: 'line',
    x: 100, y: 100,
    width: 200, height: 2,
    stroke: '#1e293b',
    strokeWidth: 2,
    opacity: 1,
    rotation: 0,
    locked: false,
    visible: true,
  },
};

// ── History helpers ───────────────────────────────────────────────────────────
const MAX_HISTORY = 50;

const pushHistory = (state) => {
  const snapshot = JSON.stringify(state.pages);
  const past = [...state.history.past, snapshot].slice(-MAX_HISTORY);
  return { history: { past, future: [] } };
};

// ── Store ─────────────────────────────────────────────────────────────────────
const useEditorStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  pages: [createPage()],
  activePageId: null,          // null → uses pages[0]
  selectedIds: [],
  activeTool: 'select',        // 'select' | 'text' | 'rect' | 'ellipse' | 'image' | 'line'
  editingId: null,             // element being inline-edited
  zoom: 1,
  showGrid: false,
  snapEnabled: true,
  history: { past: [], future: [] },

  // Style constraints (per template)
  styleConstraints: {
    allowedFonts: [],
    colorPalette: [],
    allowCustomColors: true,
    allowCustomFonts: true,
  },

  // UI panels
  ui: {
    leftPanel: 'layers',      // 'layers' | 'templates' | 'assets'
    rightPanel: 'properties', // 'properties' | 'pages'
    showExportModal: false,
    showTemplatesModal: false,
  },

  // ── Computed helpers ───────────────────────────────────────────────────────
  getActivePage: () => {
    const { pages, activePageId } = get();
    return pages.find((p) => p.id === activePageId) || pages[0];
  },

  getSelectedElements: () => {
    const page = get().getActivePage();
    return page ? page.elements.filter((el) => get().selectedIds.includes(el.id)) : [];
  },

  // ── Page actions ───────────────────────────────────────────────────────────
  addPage: () => set((state) => {
    const newPage = createPage({ name: `Page ${state.pages.length + 1}` });
    return {
      ...pushHistory(state),
      pages: [...state.pages, newPage],
      activePageId: newPage.id,
      selectedIds: [],
    };
  }),

  removePage: (pageId) => set((state) => {
    if (state.pages.length <= 1) return {};
    const remaining = state.pages.filter((p) => p.id !== pageId);
    const wasActive = (state.activePageId || state.pages[0].id) === pageId;
    return {
      ...pushHistory(state),
      pages: remaining,
      activePageId: wasActive ? remaining[0].id : state.activePageId,
      selectedIds: [],
    };
  }),

  setActivePage: (pageId) => set({ activePageId: pageId, selectedIds: [], editingId: null }),

  updatePage: (pageId, updates) => set((state) => ({
    pages: state.pages.map((p) => p.id === pageId ? { ...p, ...updates } : p),
  })),

  reorderPages: (fromIdx, toIdx) => set((state) => {
    const pages = [...state.pages];
    const [moved] = pages.splice(fromIdx, 1);
    pages.splice(toIdx, 0, moved);
    return { pages };
  }),

  // ── Element actions ────────────────────────────────────────────────────────
  addElement: (type, overrides = {}) => set((state) => {
    const page = state.getActivePage();
    if (!page) return {};
    const el = {
      ...elementDefaults[type],
      id: uuid(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      zIndex: page.elements.length,
      ...overrides,
    };
    return {
      ...pushHistory(state),
      pages: state.pages.map((p) =>
        p.id === page.id ? { ...p, elements: [...p.elements, el] } : p
      ),
      selectedIds: [el.id],
      activeTool: 'select',
    };
  }),

  updateElement: (id, updates) => set((state) => {
    const page = state.getActivePage();
    if (!page) return {};
    return {
      pages: state.pages.map((p) =>
        p.id === page.id
          ? { ...p, elements: p.elements.map((el) => el.id === id ? { ...el, ...updates } : el) }
          : p
      ),
    };
  }),

  updateElements: (ids, updates) => set((state) => {
    const page = state.getActivePage();
    if (!page) return {};
    return {
      pages: state.pages.map((p) =>
        p.id === page.id
          ? { ...p, elements: p.elements.map((el) => ids.includes(el.id) ? { ...el, ...updates } : el) }
          : p
      ),
    };
  }),

  deleteSelected: () => set((state) => {
    const page = state.getActivePage();
    if (!page || state.selectedIds.length === 0) return {};
    return {
      ...pushHistory(state),
      pages: state.pages.map((p) =>
        p.id === page.id
          ? { ...p, elements: p.elements.filter((el) => !state.selectedIds.includes(el.id)) }
          : p
      ),
      selectedIds: [],
    };
  }),

  duplicateSelected: () => set((state) => {
    const page = state.getActivePage();
    if (!page || state.selectedIds.length === 0) return {};
    const newEls = [];
    const elements = page.elements.map((el) => {
      if (!state.selectedIds.includes(el.id)) return el;
      const dup = { ...el, id: uuid(), x: el.x + 20, y: el.y + 20, zIndex: page.elements.length + newEls.length };
      newEls.push(dup);
      return el;
    });
    return {
      ...pushHistory(state),
      pages: state.pages.map((p) =>
        p.id === page.id ? { ...p, elements: [...elements, ...newEls] } : p
      ),
      selectedIds: newEls.map((e) => e.id),
    };
  }),

  toggleLock: (id) => set((state) => {
    const page = state.getActivePage();
    if (!page) return {};
    return {
      pages: state.pages.map((p) =>
        p.id === page.id
          ? { ...p, elements: p.elements.map((el) => el.id === id ? { ...el, locked: !el.locked } : el) }
          : p
      ),
    };
  }),

  toggleVisibility: (id) => set((state) => {
    const page = state.getActivePage();
    if (!page) return {};
    return {
      pages: state.pages.map((p) =>
        p.id === page.id
          ? { ...p, elements: p.elements.map((el) => el.id === id ? { ...el, visible: !el.visible } : el) }
          : p
      ),
    };
  }),

  bringForward: (id) => set((state) => {
    const page = state.getActivePage();
    if (!page) return {};
    const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((el) => el.id === id);
    if (idx === sorted.length - 1) return {};
    const el = sorted[idx];
    const above = sorted[idx + 1];
    const newEls = page.elements.map((e) => {
      if (e.id === el.id) return { ...e, zIndex: above.zIndex };
      if (e.id === above.id) return { ...e, zIndex: el.zIndex };
      return e;
    });
    return { pages: state.pages.map((p) => p.id === page.id ? { ...p, elements: newEls } : p) };
  }),

  sendBackward: (id) => set((state) => {
    const page = state.getActivePage();
    if (!page) return {};
    const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((el) => el.id === id);
    if (idx === 0) return {};
    const el = sorted[idx];
    const below = sorted[idx - 1];
    const newEls = page.elements.map((e) => {
      if (e.id === el.id) return { ...e, zIndex: below.zIndex };
      if (e.id === below.id) return { ...e, zIndex: el.zIndex };
      return e;
    });
    return { pages: state.pages.map((p) => p.id === page.id ? { ...p, elements: newEls } : p) };
  }),

  reorderElements: (pageId, fromIdx, toIdx) => set((state) => {
    return {
      pages: state.pages.map((p) => {
        if (p.id !== pageId) return p;
        const sorted = [...p.elements].sort((a, b) => a.zIndex - b.zIndex);
        const [moved] = sorted.splice(fromIdx, 1);
        sorted.splice(toIdx, 0, moved);
        return { ...p, elements: sorted.map((el, i) => ({ ...el, zIndex: i })) };
      }),
    };
  }),

  // ── Selection ──────────────────────────────────────────────────────────────
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [], editingId: null }),
  setEditingId: (id) => set({ editingId: id }),

  // ── Tool / UI ──────────────────────────────────────────────────────────────
  setActiveTool: (tool) => set({ activeTool: tool, selectedIds: [], editingId: null }),
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

  // ── History ────────────────────────────────────────────────────────────────
  undo: () => set((state) => {
    if (state.history.past.length === 0) return {};
    const past = [...state.history.past];
    const snapshot = past.pop();
    const future = [JSON.stringify(state.pages), ...state.history.future];
    return {
      pages: JSON.parse(snapshot),
      history: { past, future: future.slice(0, MAX_HISTORY) },
      selectedIds: [],
    };
  }),

  redo: () => set((state) => {
    if (state.history.future.length === 0) return {};
    const future = [...state.history.future];
    const snapshot = future.shift();
    const past = [...state.history.past, JSON.stringify(state.pages)];
    return {
      pages: JSON.parse(snapshot),
      history: { past: past.slice(-MAX_HISTORY), future },
      selectedIds: [],
    };
  }),

  // ── Template save / load ──────────────────────────────────────────────────
  loadTemplate: (templateData) => set((state) => {
    const pages = templateData.pages && templateData.pages.length
      ? templateData.pages
      : [createPage()];
    return {
      ...pushHistory(state),
      pages,
      activePageId: pages[0].id,
      selectedIds: [],
      editingId: null,
      styleConstraints: templateData.styleConstraints || state.styleConstraints,
    };
  }),

  getTemplateJSON: () => {
    const { pages, styleConstraints } = get();
    return { pages, styleConstraints };
  },

  setStyleConstraints: (sc) => set({ styleConstraints: sc }),
}));

export default useEditorStore;