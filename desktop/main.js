// Electron hlavní proces - spustí lokální HTTP server servírující statické
// soubory PWA appky (žádný build krok, žádná závislost na internetu) a
// otevře je v BrowserWindow. Server běží jen na localhost, appka je tedy
// plně funkční offline (přesně jako PWA, jen bez prohlížeče okolo).
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const APP_DIR = path.join(__dirname, "app");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      // Service worker appky v Electronu nepotřebujeme (soubory jsou lokální
      // a vždy aktuální podle nainstalované verze) - požadavek na sw.js
      // jednoduše ignorujeme, ať se náhodou nezaregistruje.
      if (urlPath === "/sw.js") { res.writeHead(404); res.end(); return; }

      const filePath = path.normalize(path.join(APP_DIR, urlPath));
      if (!filePath.startsWith(APP_DIR)) { res.writeHead(403); res.end(); return; }

      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found: " + urlPath); return; }
        res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
        res.end(data);
      });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

let mainWindow = null;
let server = null;

async function createWindow() {
  server = await startServer();
  const port = server.address().port;

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 480,
    minHeight: 600,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  // Externí odkazy (kdyby nějaké byly) otevřít v systémovém prohlížeči,
  // ne v novém okně appky.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
