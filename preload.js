const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  assetsBaseUrl: 'http://127.0.0.1:8888/'
});
