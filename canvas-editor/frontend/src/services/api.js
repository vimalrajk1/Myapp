import axios from 'axios';

/**
 * Centralised API client.
 * All backend calls go through this module so base-URL and error handling
 * are configured in one place.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 60_000, // 60 s — PDF generation can take a moment
  headers: { 'Content-Type': 'application/json' },
});

// ── Response interceptor — normalise errors ───────────────────────────────────
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Unknown error';
    return Promise.reject(new Error(message));
  }
);

// ── Templates ─────────────────────────────────────────────────────────────────
export const templatesApi = {
  list:      (params)         => api.get('/templates', { params }),
  get:       (id)             => api.get(`/templates/${id}`),
  create:    (data)           => api.post('/templates', data),
  update:    (id, data)       => api.put(`/templates/${id}`, data),
  patch:     (id, data)       => api.patch(`/templates/${id}`, data),
  updateStatus: (id, status)  => api.patch(`/templates/${id}/status`, { status }),
  delete:    (id)             => api.delete(`/templates/${id}`),
  duplicate: (id)             => api.post(`/templates/${id}/duplicate`),
};

// ── Validation Engine 🔥 ──────────────────────────────────────────────────────
export const validateApi = {
  /** Validate a raw template object. Returns a ValidationReport. */
  validate: (template) =>
    api.post('/validate', { template }),

  /** Validate a stored template by ID. */
  validateById: (id) =>
    api.get(`/validate/${id}`),

  /** Extract variable schema + summary from a stored template. */
  getSchema: (id) =>
    api.get(`/validate/${id}/schema`),

  /** Merge variable data, validate result, and return merged template. */
  mergePreview: (template, variableData) =>
    api.post('/validate/merge-preview', { template, variableData }),

  /** Resize a template to new dimensions. */
  resize: (template, width, height, mode = 'stretch') =>
    api.post('/validate/resize', { template, width, height, mode }),
};

// ── Export / Render ───────────────────────────────────────────────────────────
export const exportApi = {
  /** Trigger a PDF download. Returns a Blob. */
  pdf: (template, filename = 'export') =>
    axios.post(
      '/api/export/pdf',
      { template, filename },
      { responseType: 'blob', timeout: 120_000 }
    ).then((r) => r.data),

  /** Get a base-64 PDF string for inline preview. */
  pdfPreview: (template) =>
    api.post('/export/pdf-preview', { template }),
};

// ── Assets ────────────────────────────────────────────────────────────────────
export const assetsApi = {
  list: () => api.get('/assets'),

  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/assets/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (filename) => api.delete(`/assets/${filename}`),
};

export default api;