const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printPdf: (payload) => ipcRenderer.invoke('print-pdf', payload),
  exportHtml: (payload) => ipcRenderer.invoke('export-html', payload),
  listDrawings: (relativePath) => ipcRenderer.invoke('drawings-list', relativePath),
  drawingsExists: (relativePath) => ipcRenderer.invoke('drawings-exists', relativePath),
  readDrawingSvg: (relativePath) => ipcRenderer.invoke('drawings-read-svg', relativePath),
  readKodCatalog: () => ipcRenderer.invoke('kod-catalog-read')
});
