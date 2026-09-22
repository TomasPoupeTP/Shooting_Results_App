import { store } from "./state.js";
import { el, clear } from "./dom.js";
import { t } from "./i18n.js";
import { renderHome } from "./views/home.js";
import { renderLottery } from "./views/lottery.js";
import { renderEntry } from "./views/entry.js";
import { renderResults } from "./views/results.js";
import { renderFinale } from "./views/finale.js";
import { renderCompetitions } from "./views/competitions.js";
import { renderAppSettings } from "./views/appsettings.js";
import { renderHelp } from "./views/help.js";
import { renderDesktop } from "./views/desktop.js";
import { openMenu } from "./views/menu.js";

// Appka běží buď jako PWA v prohlížeči, nebo zabalená v Electronu jako
// desktopová offline verze pro Windows - podle toho se liší chování
// service workeru a nabídka stažení desktop appky v menu Více.
export const isElectron = typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent || "");

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");

const VIEWS = {
  home: renderHome,
  lottery: renderLottery,
  entry: renderEntry,
  results: renderResults,
  finale: renderFinale,
  competitions: renderCompetitions,
  appsettings: renderAppSettings,
  help: renderHelp,
  desktop: renderDesktop,
};

// Zobrazení dostupné z tabu "Více" (menu) - tab se u nich zvýrazní jako aktivní.
const MORE_VIEWS = new Set(["competitions", "appsettings", "help", "desktop"]);

// Pořadí a popisky záložek. Postupně se odemykají (viz store.isTabUnlocked) -
// appka na začátku ukazuje jen "Soutěž" a "Více".
const TABS = [
  { view: "home", icon: "🎯", label: "Soutěž" },
  { view: "lottery", icon: "🎲", label: "Los" },
  { view: "entry", icon: "✏️", label: "Zápis" },
  { view: "results", icon: "🏆", label: "Výsledky" },
  { view: "finale", icon: "🏅", label: "Finále" },
  { view: "more", icon: "☰", label: "Více" },
];

export function navigate(view) {
  store.view = view;
  render();
  window.scrollTo(0, 0);
}

export function toast(msg) {
  const toastEl = document.getElementById("toast");
  toastEl.textContent = t(msg || "Uloženo ✔");
  toastEl.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove("show"), 1600);
}

function renderTabbar() {
  clear(tabbar);
  const activeTabView = MORE_VIEWS.has(store.view) ? "more" : store.view;
  TABS.filter((tab) => store.isTabUnlocked(tab.view)).forEach((tab) => {
    const btn = el("button", { "data-view": tab.view }, [
      el("span", { class: "icon", text: tab.icon }),
      t(tab.label),
    ]);
    btn.classList.toggle("active", tab.view === activeTabView);
    tabbar.append(btn);
  });
}

function render() {
  app.innerHTML = "";
  const renderFn = VIEWS[store.view] || renderHome;
  renderFn(app);
  renderTabbar();
}

tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (!btn) return;
  if (btn.dataset.view === "more") { openMenu(); return; }
  navigate(btn.dataset.view);
});

store.applyTheme();
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (store.app.theme === "system") store.applyTheme();
  });
}

// V Electronu se prezentace otevírá ve vlastním OS okně (desktop/main.js),
// aby šla přetáhnout na externí monitor/projektor - to okno načte appku
// s "?presentation=1" a rovnou skočí do prezentace, bez normální appky
// okolo (viz openPresentation({ standalone: true }) v presentation.js).
const isPresentationWindow = new URLSearchParams(window.location.search).get("presentation") === "1";

if (isPresentationWindow) {
  import("./views/presentation.js").then((m) => m.openPresentation({ standalone: true }));
} else {
  // V desktopové (Electron) verzi appka běží čistě lokálně a service worker
  // (offline cache přes HTTP) tam nemá smysl - navíc appka sama sebe
  // nepatchuje síťově, takže registrace by jen zbytečně selhávala.
  if (!isElectron && "serviceWorker" in navigator) {
    // Když nová verze service workeru převezme kontrolu (po aktualizaci aplikace),
    // stránka se sama jednou obnoví - jinak by běžela dál na starém, už
    // stažením nahrazeném JS kódu až do dalšího ručního refreshe.
    let refreshingAfterSwUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshingAfterSwUpdate) return;
      refreshingAfterSwUpdate = true;
      window.location.reload();
    });
    window.addEventListener("load", () => {
      // updateViaCache: "none" - jinak prohlížeč kontroluje, jestli je sw.js
      // novější, přes běžnou HTTP cache (GitHub Pages posílá Cache-Control
      // s několikaminutovou platností) a appka tak po nasazení nové verze
      // ještě chvíli tiše běžela na staré, i když appka sama vypadala
      // "aktuálně" (viz version.json, který se natahuje zvlášť s no-store).
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
    });
  }

  render();
}
