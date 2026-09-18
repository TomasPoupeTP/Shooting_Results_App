import { store } from "./state.js";
import { renderHome } from "./views/home.js";
import { renderLottery } from "./views/lottery.js";
import { renderEntry } from "./views/entry.js";
import { renderResults } from "./views/results.js";
import { renderFinale } from "./views/finale.js";
import { renderCompetitions } from "./views/competitions.js";
import { renderAppSettings } from "./views/appsettings.js";
import { renderHelp } from "./views/help.js";
import { openMenu } from "./views/menu.js";

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
};

// Zobrazení dostupné z tabu "Více" (menu) - tab se u nich zvýrazní jako aktivní.
const MORE_VIEWS = new Set(["competitions", "appsettings", "help"]);

export function navigate(view) {
  store.view = view;
  render();
  window.scrollTo(0, 0);
}

export function toast(msg = "Uloženo ✔") {
  const toastEl = document.getElementById("toast");
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove("show"), 1600);
}

function render() {
  app.innerHTML = "";
  const renderFn = VIEWS[store.view] || renderHome;
  renderFn(app);
  const activeTabView = MORE_VIEWS.has(store.view) ? "more" : store.view;
  [...tabbar.querySelectorAll("button")].forEach((b) => {
    b.classList.toggle("active", b.dataset.view === activeTabView);
  });
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

if ("serviceWorker" in navigator) {
  // Když nová verze service workeru převezme kontrolu (po aktualizaci appky),
  // stránka se sama jednou obnoví - jinak by běžela dál na starém, už
  // stažením nahrazeném JS kódu až do dalšího ručního refreshe.
  let refreshingAfterSwUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingAfterSwUpdate) return;
    refreshingAfterSwUpdate = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
