// Electron hlavní proces - spustí lokální HTTP server servírující statické
// soubory PWA appky (žádný build krok, žádná závislost na internetu) a
// otevře je v BrowserWindow. Server běží jen na localhost, appka je tedy
// plně funkční offline (přesně jako PWA, jen bez prohlížeče okolo).
const { app, BrowserWindow, shell, ipcMain, screen, dialog } = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");

const APP_DIR = path.join(__dirname, "app");
const REPO = "TomasPoupeTP/Shooting_Results_App";
const VERSION_URL = `https://github.com/${REPO}/releases/latest/download/version.json`;
const EXE_URL = `https://github.com/${REPO}/releases/latest/download/ShootingResults-Setup.exe`;

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
let presentationWindow = null;
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
      preload: path.join(__dirname, "preload.js"),
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

/** Otevře prezentaci ve VLASTNÍM okně (ne jako overlay v hlavním okně), aby
 * šlo přetáhnout na externí monitor/projektor. Pokud appka detekuje druhý
 * displej, okno se rovnou umístí na něj a přepne do fullscreenu. */
function openPresentationWindow() {
  if (!server) return;
  if (presentationWindow && !presentationWindow.isDestroyed()) {
    presentationWindow.focus();
    return;
  }
  const port = server.address().port;
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const secondary = displays.find((d) => d.id !== primary.id);

  const winOptions = {
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Prezentace typicky běží na druhém monitoru bez focusu (uživatel
      // pracuje v hlavním okně) - bez tohohle Chromium škrtí časovače na
      // nezaostřených oknech a automatické scrollování by prakticky stálo.
      backgroundThrottling: false,
    },
  };

  if (secondary) {
    // Druhý displej nalezen - okno na něj rovnou umístíme a přepneme do
    // fullscreenu (typický případ: projektor/TV na střelnici).
    Object.assign(winOptions, {
      x: secondary.bounds.x,
      y: secondary.bounds.y,
      width: secondary.bounds.width,
      height: secondary.bounds.height,
    });
  } else {
    // Bez druhého displeje NESMÍ okno vzniknout přesně na místě hlavního
    // okna (to by vypadalo, jako by se po kliknutí nic nestalo) - otevře se
    // tedy jako normální posunuté okno, které jde ručně přetáhnout kamkoli
    // (třeba na externí monitor připojený až později).
    const mainBounds = mainWindow ? mainWindow.getBounds() : null;
    Object.assign(winOptions, {
      x: mainBounds ? mainBounds.x + 60 : undefined,
      y: mainBounds ? mainBounds.y + 60 : undefined,
      width: 1000,
      height: 700,
    });
  }

  presentationWindow = new BrowserWindow(winOptions);
  presentationWindow.setMenuBarVisibility(false);
  presentationWindow.loadURL(`http://127.0.0.1:${port}/index.html?presentation=1`);
  if (secondary) presentationWindow.setFullScreen(true);
  presentationWindow.focus();
  presentationWindow.on("closed", () => { presentationWindow = null; });
}

ipcMain.handle("open-presentation-window", () => openPresentationWindow());

// ── Kontrola aktualizací (jen když je PC online - jinak potichu selže) ────
function httpGetJson(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "ShootingResultsDesktop" }, timeout: 6000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(httpGetJson(res.headers.location, redirects - 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error("HTTP " + res.statusCode)); return; }
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

function downloadFile(url, destPath, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "ShootingResultsDesktop" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(downloadFile(res.headers.location, destPath, redirects - 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error("HTTP " + res.statusCode)); return; }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => fileStream.close(() => resolve()));
      fileStream.on("error", reject);
    });
    req.on("error", reject);
  });
}

async function checkForUpdates() {
  try {
    const localVersionPath = path.join(APP_DIR, "version.json");
    if (!fs.existsSync(localVersionPath)) return;
    const local = JSON.parse(fs.readFileSync(localVersionPath, "utf8"));
    const remote = await httpGetJson(VERSION_URL);
    if (!remote || !remote.commit || remote.commit === local.commit) return;

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Dostupná aktualizace",
      message: `Je dostupná novější verze appky (${remote.commit}) - aktuálně máš ${local.commit}.`,
      detail: "Chceš ji teď stáhnout a nainstalovat? Appka se po stažení zavře a spustí se instalátor.",
      buttons: ["Stáhnout a nainstalovat", "Později"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response !== 0) return;

    const tmpPath = path.join(os.tmpdir(), "ShootingResults-Setup.exe");
    await downloadFile(EXE_URL, tmpPath);
    await shell.openPath(tmpPath);
    app.quit();
  } catch (e) {
    // Appka je offline, nebo je GitHub nedostupný - normální provoz appky
    // to nijak neomezuje, jen se potichu přeskočí kontrola aktualizací.
    console.warn("Kontrola aktualizací selhala (appka běží dál normálně):", e.message);
  }
}

app.whenReady().then(async () => {
  await createWindow();
  checkForUpdates();
});

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
