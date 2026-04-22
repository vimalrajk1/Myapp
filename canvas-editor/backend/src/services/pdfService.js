const puppeteer = require('puppeteer');

/**
 * Renders a canvas editor JSON template to a multi-page PDF using Puppeteer.
 * Each page is rendered as a separate HTML canvas, then captured via PDF.
 *
 * @param {Object} templateData - The full template JSON { pages: [...] }
 * @returns {Buffer} - PDF file buffer
 */
async function renderTemplateToPDF(templateData) {
  const { pages = [] } = templateData;

  // Build an HTML document that renders each page using HTML/CSS
  const html = buildHTML(pages);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Use the first page dimensions for PDF format (or A4 fallback)
    const firstPage = pages[0] || { width: 794, height: 1123 };

    const pdfBuffer = await page.pdf({
      width: `${firstPage.width}px`,
      height: `${firstPage.height}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Generates an HTML string that visually reproduces each canvas page.
 */
function buildHTML(pages) {
  const pageHTMLs = pages.map((page) => buildPageHTML(page)).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; }
    .page {
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }
    .element { position: absolute; }
    .text-element {
      white-space: pre-wrap;
      word-break: break-word;
      overflow: hidden;
    }
    .image-element {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
${pageHTMLs}
</body>
</html>`;
}

function buildPageHTML(page) {
  const { width = 800, height = 600, background = '#ffffff', elements = [] } = page;

  // Sort by zIndex ascending
  const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const elementsHTML = sorted.map((el) => buildElementHTML(el)).join('\n');

  return `<div class="page" style="width:${width}px;height:${height}px;background:${background};">
${elementsHTML}
</div>`;
}

function buildElementHTML(el) {
  if (!el.visible && el.visible !== undefined) return '';

  const transform = buildTransformStyle(el);
  const opacity = el.opacity !== undefined ? el.opacity : 1;

  switch (el.type) {
    case 'text':
      return buildTextHTML(el, transform, opacity);
    case 'image':
      return buildImageHTML(el, transform, opacity);
    case 'rect':
      return buildRectHTML(el, transform, opacity);
    case 'ellipse':
      return buildEllipseHTML(el, transform, opacity);
    default:
      return '';
  }
}

function buildTransformStyle(el) {
  const { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1 } = el;
  const transforms = [];
  if (rotation) transforms.push(`rotate(${rotation}deg)`);
  if (scaleX !== 1 || scaleY !== 1) transforms.push(`scale(${scaleX}, ${scaleY})`);

  return `left:${x}px;top:${y}px;${transforms.length ? `transform:${transforms.join(' ')};transform-origin:center center;` : ''}`;
}

function buildTextHTML(el, transform, opacity) {
  const {
    width = 200, height = 50,
    text = '', fontSize = 16, fontFamily = 'Arial',
    fontStyle = 'normal', fontWeight = 'normal',
    textDecoration = '', align = 'left',
    lineHeight = 1.2, letterSpacing = 0,
    fill = '#000000', stroke = '', strokeWidth = 0,
  } = el;

  const webkitStroke = stroke && strokeWidth
    ? `-webkit-text-stroke:${strokeWidth}px ${stroke};`
    : '';

  return `<div class="element text-element" style="${transform}width:${width}px;height:${height}px;
    font-size:${fontSize}px;font-family:${fontFamily};font-style:${fontStyle};
    font-weight:${fontWeight};text-decoration:${textDecoration};text-align:${align};
    line-height:${lineHeight};letter-spacing:${letterSpacing}px;
    color:${fill};opacity:${opacity};${webkitStroke}">${escapeHTML(text)}</div>`;
}

function buildImageHTML(el, transform, opacity) {
  const { width = 100, height = 100, src = '', stroke = '', strokeWidth = 0 } = el;
  const border = stroke && strokeWidth ? `border:${strokeWidth}px solid ${stroke};` : '';
  return `<div class="element" style="${transform}width:${width}px;height:${height}px;opacity:${opacity};${border}overflow:hidden;">
    <img class="image-element" src="${escapeAttr(src)}" />
  </div>`;
}

function buildRectHTML(el, transform, opacity) {
  const {
    width = 100, height = 100,
    fill = '#cccccc', stroke = '', strokeWidth = 0,
  } = el;
  const border = stroke && strokeWidth ? `border:${strokeWidth}px solid ${stroke};` : '';
  return `<div class="element" style="${transform}width:${width}px;height:${height}px;background:${fill};opacity:${opacity};${border}"></div>`;
}

function buildEllipseHTML(el, transform, opacity) {
  const {
    width = 100, height = 100,
    fill = '#cccccc', stroke = '', strokeWidth = 0,
  } = el;
  const border = stroke && strokeWidth ? `border:${strokeWidth}px solid ${stroke};` : '';
  return `<div class="element" style="${transform}width:${width}px;height:${height}px;background:${fill};opacity:${opacity};border-radius:50%;${border}"></div>`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/\n/g, '<br/>');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '"');
}

module.exports = { renderTemplateToPDF };