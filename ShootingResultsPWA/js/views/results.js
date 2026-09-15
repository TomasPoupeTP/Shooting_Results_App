import { store, num } from "../state.js";
import { catShort } from "../constants.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";
import { exportResultsPdf } from "../pdf.js";
import { openTopStats } from "./topstats.js";

export function renderResults(root) {
  if (!store.sortedResults.length && store.shootersData.length) store.goToSorted();
  const ni = store.numItems;

  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: `🏆 ${store.competitionName || "Soutěž"} – Výsledky` }),
    el("button", { class: "btn-ghost btn-sm", text: "← Zápis", onclick: () => navigate("entry") }),
  ]);

  const controls = el("div", { class: "btn-row" }, [
    el("button", { class: "btn-ghost btn-sm", text: "Vyhodnotit rozstřel", onclick: () => { collectRozstrel(); store.evalRozstrel(); renderTable(); } }),
    store.hasFinale ? el("button", {
      class: "btn-primary btn-sm", text: "Finále →",
      onclick: () => { collectRozstrel(); store.save(); navigate("finale"); },
    }) : null,
    el("button", { class: "btn-success btn-sm", text: "💾 Uložit", onclick: () => { collectRozstrel(); store.save(); toast(); } }),
    el("button", { class: "btn-success btn-sm", text: "🖨 Tisk PDF", onclick: () => exportResultsPdf() }),
    el("button", { class: "btn-ghost btn-sm", text: "📊 Top Statistika", onclick: () => openTopStats() }),
  ]);

  const tableWrap = el("div", { class: "table-wrap" });
  const rozInputs = new Map();

  function collectRozstrel() {
    rozInputs.forEach((input, idx) => { store.sortedResults[idx].rozstrel = input.value.trim(); });
  }

  function renderTable() {
    clear(tableWrap);
    rozInputs.clear();
    if (!store.sortedResults.length) {
      tableWrap.append(el("div", { class: "empty-state", text: "Zatím žádná data. Vyplň nejdřív Zápis." }));
      return;
    }
    const ties = store.findTiedIndices(store.sortedResults, ni, 6);
    const table = el("table");
    const headRow = el("tr", {}, [
      el("th", { text: "Poř." }), el("th", { text: "Příjmení" }), el("th", { text: "Jméno" }),
      el("th", { text: "Start.č" }), el("th", { text: "Kat." }),
    ]);
    for (let i = 1; i <= ni; i++) headRow.append(el("th", { text: `Pol.${i}` }), el("th", { text: `1.Ch.${i}` }));
    headRow.append(el("th", { text: "Součet" }), el("th", { text: "Rozstřel" }));
    table.append(el("thead", {}, headRow));

    const tbody = el("tbody");
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    store.sortedResults.forEach((d, idx) => {
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
      const t = num(d.total, 0);
      tr.append(el("td", { class: "gold", text: Number.isInteger(t) ? String(t) : String(t) }));

      if (isTied || !store.hasFinale) {
        const input = el("input", { type: "text", value: d.rozstrel || "", style: "width:56px" });
        rozInputs.set(idx, input);
        tr.append(el("td", {}, input));
      } else {
        tr.append(el("td", { class: "muted" }));
      }
      tbody.append(tr);
    });
    table.append(tbody);
    tableWrap.append(table);
  }

  renderTable();

  const legend = el("div", { class: "legend" }, [
    el("span", {}, [el("span", { class: "swatch", style: "background:var(--green)" }), "Top 6"]),
    el("span", {}, [el("span", { class: "swatch", style: "background:var(--accent)" }), "Shodné výsledky – nutný rozstřel"]),
  ]);

  const view = el("div", { class: "view" }, [controls, tableWrap, legend]);
  root.append(topbar, view);
}
