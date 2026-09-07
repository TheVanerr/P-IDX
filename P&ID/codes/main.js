const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

const PROJECT_ROOT = path.join(__dirname, '..');
const DRAWINGS_ROOT = path.join(PROJECT_ROOT, 'drawings');
const KOD_CSV_FILES = {
  tr: path.join(PROJECT_ROOT, 'data', 'kod.csv'),
  en: path.join(PROJECT_ROOT, 'data', 'kod-en.csv'),
  de: path.join(PROJECT_ROOT, 'data', 'kod-de.csv')
};

const SAFETY_CSV_FILES = {
  tr: path.join(PROJECT_ROOT, 'data', 'guvenlik.csv'),
  en: path.join(PROJECT_ROOT, 'data', 'safety.csv'),
  de: path.join(PROJECT_ROOT, 'data', 'safety-de.csv')
};
const EXPORT_FILE_SUFFIX = 'P&ID DIAGRAM';

try {
  const electronPath = process.platform === 'win32'
    ? path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron');

  require('electron-reload')([__dirname, PROJECT_ROOT], {
    electron: electronPath,
    awaitWriteFinish: true,
    hardResetMethod: 'exit',
    ignored: [
      /node_modules/,
      /\.git/,
      /[\/\\]\./,
      /[\/\\]\.vscode/,
      /[\/\\]\.cursor/,
      /[\/\\]codes[\/\\]node_modules/
    ]
  });
} catch (e) {
  console.warn('electron-reload aktif değil:', e.message);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    backgroundColor: '#1a1d24',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function sanitizeFileName(name) {
  return String(name || '')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPosixPath(relPath) {
  return String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function resolveDrawingsPath(relativePath) {
  const segments = toPosixPath(relativePath)
    .split('/')
    .filter(Boolean)
    .filter(seg => seg !== '.' && seg !== '..');

  const abs = path.resolve(DRAWINGS_ROOT, ...segments);
  const rootResolved = path.resolve(DRAWINGS_ROOT);
  if (!abs.startsWith(rootResolved)) {
    throw new Error('Invalid drawings path');
  }
  return abs;
}

function listDrawingsDirectory(relativePath) {
  const rel = toPosixPath(relativePath);
  const abs = resolveDrawingsPath(rel || '.');

  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return { ok: false, error: 'Directory not found' };
  }

  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const folders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const files = entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.svg'))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return { ok: true, path: rel, folders, files };
}

function detectCsvDelimiter(line) {
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }

  cells.push(current);
  return cells.map(cell => cell.trim());
}

function parseCsvContent(text) {
  const normalized = String(text || '').replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line, delimiter);
    while (cells.length < headers.length) cells.push('');
    return cells.slice(0, headers.length);
  });

  return { headers, rows };
}

function readKodCsvText(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3).toString('utf8');
  }

  const utf8 = buf.toString('utf8');
  if (!utf8.includes('\uFFFD')) return utf8;

  return iconv.decode(buf, 'win1254');
}

function deriveCategoryFromKod(kod) {
  const match = String(kod || '').match(/^([A-Za-z]+)/);
  if (!match) return '';
  return match[1].toUpperCase();
}

function parseKodLangCsv(text) {
  const { headers, rows } = parseCsvContent(text);
  if (!headers.length) return [];

  const isThreeColumn = headers.length >= 3;
  const result = [];

  for (const row of rows) {
    const kod = String(row[0] || '').trim();
    if (!kod) continue;

    const name = String(row[1] || '').trim() || kod;
    const description = isThreeColumn ? String(row[2] || '').trim() : '';

    result.push({ kod, name, description });
  }

  return result;
}

function loadKodCatalog() {
  try {
    if (!fs.existsSync(KOD_CSV_FILES.tr)) {
      return { ok: false, error: `kod.csv bulunamadı: ${KOD_CSV_FILES.tr}` };
    }

    const trRows = parseKodLangCsv(readKodCsvText(KOD_CSV_FILES.tr));
    const enRows = fs.existsSync(KOD_CSV_FILES.en)
      ? parseKodLangCsv(readKodCsvText(KOD_CSV_FILES.en))
      : [];
    const deRows = fs.existsSync(KOD_CSV_FILES.de)
      ? parseKodLangCsv(readKodCsvText(KOD_CSV_FILES.de))
      : [];

    if (!trRows.length) {
      return { ok: false, error: 'kod.csv dosyasında geçerli satır bulunamadı' };
    }

    const enMap = new Map(enRows.map(row => [row.kod, row]));
    const deMap = new Map(deRows.map(row => [row.kod, row]));
    const entries = [];
    const seen = new Set();

    for (const tr of trRows) {
      if (seen.has(tr.kod)) continue;
      const en = enMap.get(tr.kod);
      const de = deMap.get(tr.kod);

      entries.push({
        id: tr.kod,
        category: deriveCategoryFromKod(tr.kod),
        tr: {
          componentId: tr.kod,
          componentName: tr.name,
          description: tr.description
        },
        en: {
          componentId: tr.kod,
          componentName: en?.name || tr.name,
          description: en?.description || tr.description
        },
        de: {
          componentId: tr.kod,
          componentName: de?.name || en?.name || tr.name,
          description: de?.description || en?.description || tr.description
        }
      });
      seen.add(tr.kod);
    }

    return { ok: true, entries, path: KOD_CSV_FILES.tr };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function loadSafetyCatalog() {
  try {
    if (!fs.existsSync(SAFETY_CSV_FILES.tr)) {
      return { ok: false, error: `guvenlik.csv bulunamadı: ${SAFETY_CSV_FILES.tr}` };
    }

    const trRows = parseSafetyLangCsv(readKodCsvText(SAFETY_CSV_FILES.tr));
    const enRows = fs.existsSync(SAFETY_CSV_FILES.en)
      ? parseSafetyLangCsv(readKodCsvText(SAFETY_CSV_FILES.en))
      : [];
    const deRows = fs.existsSync(SAFETY_CSV_FILES.de)
      ? parseSafetyLangCsv(readKodCsvText(SAFETY_CSV_FILES.de))
      : [];

    if (!trRows.length) {
      return { ok: false, error: 'guvenlik.csv dosyasında geçerli satır bulunamadı' };
    }

    const enMap = new Map(enRows.map(row => [row.kod, row]));
    const deMap = new Map(deRows.map(row => [row.kod, row]));
    const entries = [];
    const seen = new Set();

    for (const tr of trRows) {
      if (seen.has(tr.kod)) continue;
      const en = enMap.get(tr.kod);
      const de = deMap.get(tr.kod);

      entries.push({
        id: tr.kod,
        category: deriveCategoryFromKod(tr.kod),
        tr: {
          interlockId: tr.kod,
          triggerSensor: tr.trigger,
          lockedEquipment: tr.locked,
          logic: tr.logic
        },
        en: {
          interlockId: tr.kod,
          triggerSensor: en?.trigger || tr.trigger,
          lockedEquipment: en?.locked || tr.locked,
          logic: en?.logic || tr.logic
        },
        de: {
          interlockId: tr.kod,
          triggerSensor: de?.trigger || en?.trigger || tr.trigger,
          lockedEquipment: de?.locked || en?.locked || tr.locked,
          logic: de?.logic || en?.logic || tr.logic
        }
      });
      seen.add(tr.kod);
    }

    return { ok: true, entries, path: SAFETY_CSV_FILES.tr };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function parseSafetyLangCsv(text) {
  const { headers, rows } = parseCsvContent(text);
  if (!headers.length) return [];

  const isFourColumn = headers.length >= 4;
  const result = [];

  for (const row of rows) {
    const kod = String(row[0] || '').trim();
    if (!kod) continue;

    const trigger = String(row[1] || '').trim() || kod;
    const locked = isFourColumn ? String(row[2] || '').trim() : '';
    const logic = isFourColumn ? String(row[3] || '').trim() : String(row[2] || '').trim();

    result.push({ kod, trigger, locked, logic });
  }

  return result;
}

function registerIpcHandlers() {
  ipcMain.removeHandler('print-pdf');
  ipcMain.removeHandler('export-html');
  ipcMain.removeHandler('drawings-list');
  ipcMain.removeHandler('drawings-read-svg');
  ipcMain.removeHandler('drawings-exists');
  ipcMain.removeHandler('kod-catalog-read');
  ipcMain.removeHandler('safety-catalog-read');

  ipcMain.handle('print-pdf', async (_event, payload) => {
    const baseName = sanitizeFileName(payload?.fileName) || `pid-dokuman ${EXPORT_FILE_SUFFIX}`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${baseName}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false };

    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true
    });

    fs.writeFileSync(filePath, data);
    return { success: true, filePath };
  });

  ipcMain.handle('export-html', async (_event, payload) => {
    const model = (payload && payload.model) || 'pid';
    const bodyHtml = (payload && payload.bodyHtml) || '';
    const title = (payload && payload.title) || `${model} P&ID Doküman`;
    const lang = (payload && payload.lang) || 'tr';
    const baseName = sanitizeFileName(payload?.fileName) || `${model} P&ID DIAGRAM`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${baseName}.html`,
      filters: [{ name: 'HTML', extensions: ['html'] }]
    });
    if (canceled || !filePath) return { success: false };

    try {
      const cssPath = path.join(__dirname, 'html-export.css');
      const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
      const inlined = inlineImagesToBase64(bodyHtml);
      const safeTitle = String(title)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const fullHtml = `<!DOCTYPE html>
<html lang="${lang}" class="html-export">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>${css}</style>
</head>
<body class="html-export">
${inlined}
</body>
</html>`;

      fs.writeFileSync(filePath, fullHtml, 'utf8');
      return { success: true, filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('drawings-list', async (_event, relativePath) => {
    try {
      return listDrawingsDirectory(relativePath);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('drawings-exists', async (_event, relativePath) => {
    try {
      const abs = resolveDrawingsPath(relativePath || '.');
      return { ok: true, exists: fs.existsSync(abs) };
    } catch {
      return { ok: true, exists: false };
    }
  });

  ipcMain.handle('safety-catalog-read', async () => {
    try {
      return loadSafetyCatalog();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('kod-catalog-read', async () => {
    try {
      return loadKodCatalog();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('drawings-read-svg', async (_event, relativePath) => {
    try {
      const rel = toPosixPath(relativePath);
      const abs = resolveDrawingsPath(rel);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return { ok: false, error: 'File not found' };
      }
      if (!rel.toLowerCase().endsWith('.svg')) {
        return { ok: false, error: 'Only SVG files are allowed' };
      }
      const content = fs.readFileSync(abs, 'utf8');
      return {
        ok: true,
        path: rel,
        name: path.basename(abs, '.svg'),
        content
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

function inlineImagesToBase64(html) {
  return html.replace(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi, (tag, src) => {
    if (/^data:/i.test(src)) return tag;
    try {
      const rel = decodeURIComponent(src);
      const abs = path.resolve(__dirname, rel);
      if (!fs.existsSync(abs)) {
        const alt = path.resolve(__dirname, '..', rel.replace(/^\.\.\//, ''));
        if (!fs.existsSync(alt)) return tag;
        return embedImage(tag, src, alt);
      }
      return embedImage(tag, src, abs);
    } catch {
      return tag;
    }
  });
}

function embedImage(tag, src, abs) {
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'svg+xml' : (ext === 'jpg' ? 'jpeg' : ext);
  const b64 = fs.readFileSync(abs).toString('base64');
  const dataUri = `data:image/${mime};base64,${b64}`;
  return tag.replace(src, dataUri);
}
