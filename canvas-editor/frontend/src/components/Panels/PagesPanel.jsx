import React from 'react';
import { Plus, Trash2, FilePlus } from 'lucide-react';
import useEditorStore from '../../store/useEditorStore.js';

export default function PagesPanel() {
  const store = useEditorStore();
  const { pages } = store;
  const activePage = store.getActivePage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="panel-section" style={{ paddingBottom: 8 }}>
        <div className="panel-section-header" style={{ marginBottom: 0 }}>
          <span>Pages</span>
          <button className="btn-icon" data-tooltip="Add page" onClick={store.addPage}>
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Page thumbnails */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {pages.map((page, idx) => {
          const isActive = activePage?.id === page.id;
          return (
            <div
              key={page.id}
              onClick={() => store.setActivePage(page.id)}
              style={{
                marginBottom: 8,
                border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                background: 'var(--bg-tertiary)',
              }}
            >
              {/* Thumbnail preview (CSS scaled) */}
              <div style={{
                width: '100%',
                paddingTop: `${(page.height / page.width) * 100}%`,
                position: 'relative',
                background: page.background || '#ffffff',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#94a3b8',
                }}>
                  {page.elements.length} element{page.elements.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Page footer */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 8px',
                background: isActive ? 'var(--accent-light)' : 'transparent',
              }}>
                <span style={{
                  fontSize: 11,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {idx + 1}. {page.name}
                </span>
                {pages.length > 1 && (
                  <button
                    className="btn-icon"
                    style={{ width: 18, height: 18, color: 'var(--danger)' }}
                    data-tooltip="Delete page"
                    onClick={(e) => { e.stopPropagation(); store.removePage(page.id); }}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add page button */}
      <div className="panel-section" style={{ paddingTop: 8 }}>
        <button className="btn btn-outline w-full" onClick={store.addPage}>
          <FilePlus size={13} /> Add Page
        </button>
      </div>
    </div>
  );
}