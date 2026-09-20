// Preload skript hlavního okna - bezpečně (přes contextBridge, bez přímého
// přístupu k Node/Electron API ze stránky) zpřístupní appce jen tu jednu
// věc, kterou potřebuje: otevřít prezentaci ve vlastním OS okně.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  openPresentationWindow: () => ipcRenderer.invoke("open-presentation-window"),
});
