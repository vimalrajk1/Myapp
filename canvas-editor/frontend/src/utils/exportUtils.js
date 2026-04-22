import axios from 'axios';

/**
 * Export the current active page as a PNG using the Konva stage's toDataURL.
 * @param {Konva.Stage} stage - The Konva Stage instance
 * @param {string} filename - Download filename (without extension)
 * @param {number} pixelRatio - Resolution multiplier (2 = @2x / retina quality)
 */
export function exportStageToPNG(stage, filename = 'export', pixelRatio = 2) {
  if (!stage) throw new Error('No stage provided');

  const dataURL = stage.toDataURL({ pixelRatio, mimeType: 'image/png' });

  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataURL;
}

/**
 * Export the template JSON to a .json file (client-side download).
 * @param {Object} templateData - { pages, styleConstraints }
 * @param {string} filename
 */
export function exportTemplateJSON(templateData, filename = 'template') {
  const json = JSON.stringify(templateData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Load a template JSON from a file input File object.
 * @param {File} file
 * @returns {Promise<Object>} - Parsed template data
 */
export function loadTemplateFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== 'application/json') {
      reject(new Error('Please select a valid JSON file'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.pages || !Array.isArray(data.pages)) {
          reject(new Error('Invalid template: missing pages array'));
        } else {
          resolve(data);
        }
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Request server-side PDF generation via the backend API.
 * @param {Object} templateData - Full template JSON
 * @param {string} filename
 */
export async function exportToPDF(templateData, filename = 'export') {
  const response = await axios.post(
    '/api/export/pdf',
    { template: templateData, filename },
    { responseType: 'blob' }
  );

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Upload an image asset to the backend.
 * @param {File} file
 * @returns {Promise<{ url: string, id: string }>}
 */
export async function uploadAsset(file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post('/api/assets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}