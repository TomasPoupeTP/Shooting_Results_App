import { store } from "./state.js";
import { renderHome } from "./views/home.js";
import { renderLottery } from "./views/lottery.js";
import { renderEntry } from "./views/entry.js";
import { renderResults } from "./views/results.js";
import { renderFinale } from "./views/finale.js";

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");

const VIEWS = {
  home: renderHome,
  lottery: renderLottery,
  entry: renderEntry,
  results: renderResults,
  finale: renderFinale,
};

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
  [...tabbar.querySelectorAll("button")].forEach((b) => {
    b.classList.toggle("active", b.dataset.view === store.view);
  });
}

tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (!btn) return;
  navigate(btn.dataset.view);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
