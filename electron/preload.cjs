const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('piccat', {
  chooseImages: () => ipcRenderer.invoke('piccat:choose-images'),
  chooseOutputDir: () => ipcRenderer.invoke('piccat:choose-output-dir'),
  inspectImages: files => ipcRenderer.invoke('piccat:inspect-images', files),
  convert: payload => ipcRenderer.invoke('piccat:convert', payload),
  revealFile: filePath => ipcRenderer.invoke('piccat:reveal-file', filePath),
  onProgress: callback => ipcRenderer.on('piccat:progress', (_e, data) => callback(data))
});
