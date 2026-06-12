const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let server = null;
let serverPort = 8888;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
      sandbox: false,
      webSecurity: false
    }
  });

  win.loadFile('game.html');
}

function startLocalServer() {
  return new Promise((resolve) => {
    const assetsPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '..', 'assets');
    
    server = http.createServer((req, res) => {
      let filePath = path.join(assetsPath, req.url);
      if (filePath.endsWith('/')) {
        filePath = filePath.slice(0, -1);
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        
        let contentType = 'application/octet-stream';
        if (filePath.endsWith('.glb')) {
          contentType = 'model/gltf-binary';
        } else if (filePath.endsWith('.png')) {
          contentType = 'image/png';
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    
    server.listen(serverPort, '127.0.0.1', () => {
      resolve();
    });
  });
}

app.whenReady().then(async () => {
  await startLocalServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
