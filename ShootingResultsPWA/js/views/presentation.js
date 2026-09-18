import { store, num } from "../state.js";
import { catShort } from "../constants.js";
import { el, clear } from "../dom.js";
import { t } from "../i18n.js";

let timer = null;
let scrollTimer = null;

const PAUSE_MS = 2200;

/** Rozdělí aktuální data zápisu do skupin dle kategorie (pokud je aktivní
 * řazení "po kategoriích"), stejně jako store.goToSorted() - prezentace
 * pracuje živě nad shootersData, ne až nad hotovými store.sortedResults. */
function computeGroups() {
  const ni = store.numItems;
  const raw = store.shootersData.filter((d) => d.surname || d.name);
  if (store.useCategories && store.rankingMode === "byCategory") {
    const cats = [...new Set(raw.map((d) => d.category || ""))].sort();
    return cats.map((cat) => ({
      category: cat,
      items: store.sortShooters(raw.filter((d) => (d.category || "") === cat), ni),
    }));
  }
  return [{ category: null, items: store.sortShooters(raw, ni) }];
}

export function openPresentation() {
  const byCategory = store.useCategories && store.rankingMode === "byCategory";
  const overlay = el("div", { class: "presentation" });

  const closeBtn = el("button", { class: "btn-ghost pres-close", text: t("✕ Zavřít"), onclick: closePresentation });
  const head = el("div", { class: "pres-head" }, [
    el("div", {}, [
      el("h2", { text: store.competitionName || t("Soutěž") }),
      el("div", { class: "sub", text: `${store.disciplineText()}${byCategory ? " • " + t("Po kategoriích") : " • " + t("Celkově")}` }),
    ]),
    closeBtn,
  ]);
  const list = el("div", { class: "pres-list" });

  overlay.append(head, list);
  document.body.append(overlay);

  let lastSnapshot = null;

  function startAutoScroll(inner) {
    clearInterval(scrollTimer);
    requestAnimationFrame(() => {
      if (inner.scrollHeight <= list.clientHeight) return;
      let phase = "down"; // "down" | "pause-bottom" | "up" | "pause-top"
      let pauseUntil = 0;
      scrollTimer = setInterval(() => {
        const now = Date.now();
        if (phase === "pause-bottom" || phase === "pause-top") {
          if (now < pauseUntil) return;
          phase = phase === "pause-bottom" ? "up" : "down";
          return;
        }
        const dir = phase === "down" ? 1 : -1;
        list.scrollTop += dir * 0.6;
        const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
        const atTop = list.scrollTop <= 1;
        if (dir === 1 && atBottom) {
          list.scrollTop = list.scrollHeight - list.clientHeight;
          phase = "pause-bottom";
          pauseUntil = now + PAUSE_MS;
        } else if (dir === -1 && atTop) {
          list.scrollTop = 0;
          phase = "pause-top";
          pauseUntil = now + PAUSE_MS;
        }
      }, 30);
    });
  }

  function renderRow(d, idx, isTop6, isTie) {
    const total = num(d.total, 0);
    return el("div", { class: `pres-row ${isTop6 ? "top6" : ""}` }, [
      el("div", { class: "rank", text: String(idx + 1) + (isTie ? "*" : "") }),
      el("div", { class: "name", text: `${d.surname || ""} ${d.name || ""}${d.category ? " (" + catShort(d.category) + ")" : ""}` }),
      el("div", { class: "total", text: Number.isInteger(total) ? String(total) : String(total) }),
    ]);
  }

  function tick() {
    const groups = computeGroups();
    const snapshot = JSON.stringify(groups.map((g) => [g.category, g.items.map((d) => [d.surname, d.name, d.category, d.total])]));
    // Pokud se data nezměnila, nepřekreslovat (a nepřerušovat probíhající scroll).
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;

    clear(list);
    const inner = el("div");
    let any = false;
    groups.forEach(({ category, items }) => {
      if (!items.length) return;
      any = true;
      if (byCategory) inner.append(el("div", { class: "section-title", text: category || t("Bez kategorie") }));
      const ni = store.numItems;
      const ties = store.findTiedIndices(items, ni, 6);
      items.forEach((d, idx) => inner.append(renderRow(d, idx, idx < 6, ties.has(idx))));
    });
    if (!any) inner.append(el("div", { class: "empty-state", text: t("Zatím žádné výsledky - vyplň Zápis.") }));
    list.append(inner);

    startAutoScroll(inner);
  }

  tick();
  timer = setInterval(tick, 4000);

  function closePresentation() {
    clearInterval(timer); clearInterval(scrollTimer);
    overlay.remove();
  }
  overlay._close = closePresentation;
}
