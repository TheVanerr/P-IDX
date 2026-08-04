/* A4 sayfa oluşturma — antet + içerik + alt bilgi + sayfa numarası */

const LETTERHEAD_CONTENT_MAX_HEIGHT = 918;

function buildLetterheadPage({ firma, modelName, pageNumber, content }) {
  const brand = (typeof HEADER_BRANDS !== 'undefined' && HEADER_BRANDS[firma])
    ? HEADER_BRANDS[firma]
    : { color: '#ff0000' };

  const page = document.createElement('div');
  page.className = 'a4-page';
  if (pageNumber != null) page.id = 'a4-page-' + pageNumber;
  page.style.setProperty('--brand-color', brand.color);

  if (firma && typeof buildHeader === 'function') {
    page.appendChild(buildHeader(firma, modelName));
  }

  const footerLine = document.createElement('div');
  footerLine.className = 'ph-footer-line';
  page.appendChild(footerLine);

  const pageContent = document.createElement('div');
  pageContent.className = 'page-content';

  if (content) {
    const nodes = Array.isArray(content) ? content : [content];
    for (const node of nodes) {
      if (node instanceof Node) pageContent.appendChild(node);
    }
  }

  page.appendChild(pageContent);

  if (pageNumber != null) {
    const num = document.createElement('div');
    num.className = 'page-number';
    num.textContent = pageNumber;
    page.appendChild(num);
  }

  const footer = document.createElement('div');
  footer.className = 'ph-footer';
  footer.textContent = typeof getFirmaFooter === 'function'
    ? getFirmaFooter(firma)
    : '';
  page.appendChild(footer);

  return page;
}

function measureLetterheadContentHeight(contentNodes, firma, modelName, measureHost) {
  const clones = contentNodes.map((node) => node.cloneNode(true));
  const page = buildLetterheadPage({
    firma,
    modelName,
    pageNumber: null,
    content: clones
  });

  measureHost.appendChild(page);
  const pageContent = page.querySelector('.page-content');
  const height = pageContent ? pageContent.scrollHeight : 0;
  page.remove();
  return height;
}

function buildLetterheadPages({ firma, modelName, startPageNumber, content }) {
  const nodes = (Array.isArray(content) ? content : [content]).filter((node) => node instanceof Node);
  if (!nodes.length) return [];

  const measureHost = document.createElement('div');
  measureHost.className = 'letterhead-measure-host';
  measureHost.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;visibility:hidden;pointer-events:none;';
  document.body.appendChild(measureHost);

  const pages = [];
  let currentNodes = [];
  let pageNumber = startPageNumber ?? 1;

  try {
    for (const node of nodes) {
      const trialNodes = [...currentNodes, node];
      const height = measureLetterheadContentHeight(trialNodes, firma, modelName, measureHost);

      if (height > LETTERHEAD_CONTENT_MAX_HEIGHT && currentNodes.length > 0) {
        pages.push(buildLetterheadPage({
          firma,
          modelName,
          pageNumber: pageNumber++,
          content: currentNodes
        }));
        currentNodes = [node];
      } else {
        currentNodes.push(node);
      }
    }

    if (currentNodes.length) {
      pages.push(buildLetterheadPage({
        firma,
        modelName,
        pageNumber: pageNumber++,
        content: currentNodes
      }));
    }
  } finally {
    measureHost.remove();
  }

  return pages;
}
