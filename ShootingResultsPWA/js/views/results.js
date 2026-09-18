import { store, num } from "../state.js";
import { catShort } from "../constants.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";
import { exportResultsPdf } from "../pdf.js";
import { openTopStats } from "./topstats.js";
import { t } from "../i18n.js";

export function renderResults(root) {
  if (!store.sortedResults.length && store.shootersData.length) store.goToSorted();
  const ni = store.numItems;
  const byCategory = store.useCategories && store.rankingMode === "byCategory";

  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: `🏆 ${store.competitionName || t("Soutěž")} – ${t("Výsledky")}` }),
    el("button", { class: "btn-ghost btn-sm", text: t("← Zápis"), onclick: () => navigate("entry") }),
  ]);

  const controls = el("div", { class: "btn-row" }, [
    el("button", { class: "btn-ghost btn-sm", text: t("Vyhodnotit rozstřel"), onclick: () => { collectRozstrel(); store.evalRozstrel(); renderGroups(); } }),
    store.hasFinale ? el("button", {
      class: "btn-primary btn-sm", text: t("Finále →"),
      onclick: () => { collectRozstrel(); store.save(); store.unlockTab("finale"); navigate("finale"); },
    }) : null,
    el("button", { class: "btn-success btn-sm", text: t("💾 Uložit"), onclick: () => { collectRozstrel(); store.save(); toast(); } }),
    el("button", { class: "btn-success btn-sm", text: t("🖨 Tisk PDF"), onclick: () => exportResultsPdf() }),
    el("button", { class: "btn-ghost btn-sm", text: t("📊 Top Statistika"), onclick: () => openTopStats() }),
  ]);

  const groupsWrap = el("div", {});
  const rozInputs = new Map(); // shooter objekt -> <input>

  function collectRozstrel() {
    rozInputs.forEach((input, d) => { d.rozstrel = input.value.trim(); });
  }

  function renderOneTable(items) {
    const ties = store.findTiedIndices(items, ni, 6);
    const table = el("table");
    const headRow = el("tr", {}, [
      el("th", { text: t("Poř.") }), el("th", { text: t("Příjmení") }), el("th", { text: t("Jméno") }),
      el("th", { text: t("Start.č") }), el("th", { text: t("Kat.") }),
    ]);
    for (let i = 1; i <= ni; i++) headRow.append(el("th", { text: `Pol.${i}` }), el("th", { text: `1.Ch.${i}` }));
    headRow.append(el("th", { text: t("Součet") }), el("th", { text: t("Rozstřel") }));
    table.append(el("thead", {}, headRow));

    const tbody = el("tbody");
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    items.forEach((d, idx) => {
      const rank = idx + 1;
      const isTop6 = idx < 6, isTied = ties.has(idx);
      const tr = el("tr", { class: isTop6 ? "top6" : (isTied ? "tie" : "") });
      tr.append(el("td", { class: "medal", text: medals[rank] || String(rank) }));
      tr.append(el("td", { class: "left", text: d.surname || "" }));
      tr.append(el("td", { class: "left muted", text: d.name || "" }));
      tr.append(el("td", { class: "gold", text: String(d.start_num ?? "") }));
      tr.append(el("td", { class: "muted", text: catShort(d.category || "") }));
      for (let i = 1; i <= ni; i++) {
        tr.append(el("td", { text: String(d[`item${i}_score`] ?? "") }));
        tr.append(el("td", { class: "muted", text: String(d[`item${i}_fault`] ?? "") }));
      }
      const total = num(d.total, 0);
      tr.append(el("td", { class: "gold", text: String(total) }));

      if (isTied || !store.hasFinale) {
        const input = el("input", { type: "text", value: d.rozstrel || "", style: "width:56px" });
        rozInputs.set(d, input);
        tr.append(el("td", {}, input));
      } else {
        tr.append(el("td", { class: "muted" }));
      }
      tbody.append(tr);
    });
    table.append(tbody);
    return table;
  }

  function renderGroups() {
    clear(groupsWrap);
    rozInputs.clear();
    if (!store.sortedResults.length) {
      groupsWrap.append(el("div", { class: "empty-state", text: t("Zatím žádná data. Vyplň nejdřív Zápis.") }));
      return;
    }
    const groups = store.resultGroups(store.sortedResults);
    groups.forEach(({ category, items }) => {
      if (byCategory) {
        groupsWrap.append(el("div", { class: "section-title", text: category || t("Bez kategorie") }));
      }
      groupsWrap.append(el("div", { class: "table-wrap" }, renderOneTable(items)));
    });
  }

  renderGroups();

  const legend = el("div", { class: "legend" }, [
    el("span", {}, [el("span", { class: "swatch", style: "background:var(--green)" }), t("Top 6")]),
    el("span", {}, [el("span", { class: "swatch", style: "background:var(--accent)" }), t("Shodné výsledky – nutný rozstřel")]),
  ]);

  const view = el("div", { class: "view" }, [controls, groupsWrap, legend]);
  root.append(topbar, view);
}
