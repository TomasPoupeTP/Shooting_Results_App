// Preload skript hlavního okna - bezpečně (přes contextBridge, bez přímého
// přístupu k Node/Electron API ze stránky) zpřístupní appce jen ty věci,
// které potřebuje: otevřít prezentaci ve vlastním OS okně a poslat data na
// automatickou zálohu na disk.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  openPresentationWindow: () => ipcRenderer.invoke("open-presentation-window"),
  backupData: (json) => ipcRenderer.invoke("backup-data", json),
});
