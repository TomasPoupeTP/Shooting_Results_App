import { store, num } from "../state.js";
import { el, clear } from "../dom.js";
import { t } from "../i18n.js";
import { choiceDialog } from "../dialog.js";

let timer = null;
let scrollTimer = null;

const PAUSE_MS = 2200;

/** Rozdělí aktuální data zápisu do skupin dle kategorie (pokud byl zvolen
 * režim "po kategoriích" v dialogu při otevření prezentace) - prezentace
 * pracuje živě nad shootersData, ne až nad hotovými store.sortedResults. */
function computeGroups(byCategory) {
  const ni = store.numItems;
  const raw = store.shootersData.filter((d) => d.surname || d.name);
  if (byCategory) {
    const cats = [...new Set(raw.map((d) => d.category || ""))].sort();
    return cats.map((cat) => ({
      category: cat,
      items: store.sortShooters(raw.filter((d) => (d.category || "") === cat), ni),
    }));
  }
  return [{ category: null, items: store.sortShooters(raw, ni) }];
}

/** Otevře prezentaci. Pokud jsou zapnuté kategorie, nejdřív se zeptá, jestli
 * zobrazovat pořadí celkově nebo po kategoriích (nezávisle na tom, jak se
 * pak reálně počítají Výsledky/Finále - jde jen o živý náhled na obrazovce). */
export async function openPresentation({ standalone = false } = {}) {
  let byCategory = false;
  if (store.useCategories) {
    const overallMark = store.rankingMode === "overall" ? "✓ " : "";
    const byCatMark = store.rankingMode === "byCategory" ? "✓ " : "";
    const mode = await choiceDialog(t("Jak zobrazit prezentaci?"), [
      { label: overallMark + t("Celkově (jedno pořadí přes všechny kategorie)"), value: "overall" },
      { label: byCatMark + t("Po kategoriích (samostatné pořadí pro každou kategorii)"), value: "byCategory" },
    ]);
    if (!mode) return;
    byCategory = mode === "byCategory";
  }

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

  function renderHeaderRow(ni) {
    const scores = Array.from({ length: ni }, (_, i) => el("div", { class: "score", text: `P${i + 1}` }));
    return el("div", { class: "pres-row pres-header" }, [
      el("div", { class: "rank" }),
      el("div", { class: "name" }),
      el("div", { class: "scores" }, scores),
      el("div", { class: "total", text: t("Celkem") }),
    ]);
  }

  function renderRow(d, ni, idx, isTop6, isTie) {
    const total = num(d.total, 0);
    const scores = Array.from({ length: ni }, (_, i) => {
      const raw = d[`item${i + 1}_score`];
      return el("div", { class: "score", text: raw === undefined || raw === null || String(raw).trim() === "" ? "–" : String(raw) });
    });
    const nameEl = el("div", { class: "name" }, [
      `${d.surname || ""} ${d.name || ""}`.trim(),
      d.category ? el("span", { class: "cat-badge", text: d.category }) : null,
    ]);
    return el("div", { class: `pres-row ${isTop6 ? "top6" : ""}` }, [
      el("div", { class: "rank", text: String(idx + 1) + (isTie ? "*" : "") }),
      nameEl,
      el("div", { class: "scores" }, scores),
      el("div", { class: "total", text: Number.isInteger(total) ? String(total) : String(total) }),
    ]);
  }

  function tick() {
    // Samostatné okno prezentace (Electron, na externím monitoru) má vlastní
    // instanci store v paměti - o změnách z hlavního okna (živé psaní skóre
    // do Zápisu) se dozví jen tím, že si při každém tiku znovu načte aktuální
    // stav z localStorage (sdíleného mezi okny stejného původu).
    if (standalone) store.load();
    const ni = store.numItems;
    const groups = computeGroups(byCategory);
    const snapshot = JSON.stringify(groups.map((g) => [
      g.category,
      g.items.map((d) => [d.surname, d.name, d.category, d.total, ...Array.from({ length: ni }, (_, i) => d[`item${i + 1}_score`])]),
    ]));
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
      const ties = store.findTiedIndices(items, ni, 6);
      inner.append(renderHeaderRow(ni));
      items.forEach((d, idx) => inner.append(renderRow(d, ni, idx, idx < 6, ties.has(idx))));
    });
    if (!any) inner.append(el("div", { class: "empty-state", text: t("Zatím žádné výsledky - vyplň Zápis.") }));
    list.append(inner);

    startAutoScroll(inner);
  }

  tick();
  timer = setInterval(tick, 4000);

  function closePresentation() {
    clearInterval(timer); clearInterval(scrollTimer);
    if (standalone) { window.close(); return; }
    overlay.remove();
  }
  overlay._close = closePresentation;
}
