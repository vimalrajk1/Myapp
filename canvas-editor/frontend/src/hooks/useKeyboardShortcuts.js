import { useEffect } from 'react';
import useEditorStore from '../store/useEditorStore.js';

/**
 * Global keyboard shortcut handler.
 * Binds to the document so shortcuts work anywhere in the editor.
 */
export function useKeyboardShortcuts(stageRef) {
  const store = useEditorStore();

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName.toLowerCase();
      // Don't fire shortcuts when user is typing in an input
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // ── Undo / Redo ─────────────────────────────────────────────────────────
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); return; }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); return; }

      // ── Copy / Paste / Duplicate ────────────────────────────────────────────
      if (ctrl && e.key === 'd') { e.preventDefault(); store.duplicateSelected(); return; }

      // ── Delete ──────────────────────────────────────────────────────────────
      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedIds.length > 0) {
        e.preventDefault();
        store.deleteSelected();
        return;
      }

      // ── Escape ──────────────────────────────────────────────────────────────
      if (e.key === 'Escape') {
        store.clearSelection();
        store.setActiveTool('select');
        return;
      }

      // ── Tool shortcuts ──────────────────────────────────────────────────────
      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 'v': store.setActiveTool('select'); break;
          case 't': store.setActiveTool('text'); break;
          case 'r': store.setActiveTool('rect'); break;
          case 'e': store.setActiveTool('ellipse'); break;
          case 'i': store.setActiveTool('image'); break;
          case 'l': store.setActiveTool('line'); break;
        }
      }

      // ── Zoom ────────────────────────────────────────────────────────────────
      if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); store.setZoom(store.zoom + 0.1); }
      if (ctrl && e.key === '-') { e.preventDefault(); store.setZoom(store.zoom - 0.1); }
      if (ctrl && e.key === '0') { e.preventDefault(); store.setZoom(1); }

      // ── Nudge selected elements ─────────────────────────────────────────────
      const nudge = e.shiftKey ? 10 : 1;
      if (store.selectedIds.length > 0) {
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); dx = -nudge; }
        if (e.key === 'ArrowRight') { e.preventDefault(); dx = nudge; }
        if (e.key === 'ArrowUp')    { e.preventDefault(); dy = -nudge; }
        if (e.key === 'ArrowDown')  { e.preventDefault(); dy = nudge; }

        if (dx !== 0 || dy !== 0) {
          const page = store.getActivePage();
          if (page) {
            page.elements
              .filter((el) => store.selectedIds.includes(el.id) && !el.locked)
              .forEach((el) => store.updateElement(el.id, { x: el.x + dx, y: el.y + dy }));
          }
        }
      }

      // ── Layer order ─────────────────────────────────────────────────────────
      if (ctrl && e.key === ']' && store.selectedIds.length === 1) {
        e.preventDefault();
        store.bringForward(store.selectedIds[0]);
      }
      if (ctrl && e.key === '[' && store.selectedIds.length === 1) {
        e.preventDefault();
        store.sendBackward(store.selectedIds[0]);
      }

      // ── Select all ─────────────────────────────────────────────────────────
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        const page = store.getActivePage();
        if (page) {
          store.setSelectedIds(page.elements.map((el) => el.id));
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedIds, store.zoom, store.activeTool]);
}