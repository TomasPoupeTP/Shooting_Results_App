import { store, num } from "../state.js";
import { catShort } from "../constants.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";
import { exportFinalePdf } from "../pdf.js";

export function renderFinale(root) {
  store.buildFinalists();
  const ni = store.numItems;
  let ties = new Set();

  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: `🏅 ${store.competitionName || "Soutěž"} – Finále` }),
    el("button", { class: "btn-ghost btn-sm", text: "← Výsledky", onclick: () => navigate("results") }),
  ]);

  const controls = el("div", { class: "btn-row" }, [
    el("button", { class: "btn-ghost btn-sm", text: "Vyhodnotit rozstřel", onclick: () => { collect(); store.evalFinaleRozstrel(); renderTable(); } }),
    el("button", { class: "btn-primary btn-sm", text: "Seřadit finále", onclick: () => { collect(); store.sortFinale(); ties = store.findFinaleTies(store.finaleFinalists); renderTable(); } }),
    el("button", { class: "btn-success btn-sm", text: "💾 Uložit", onclick: () => { collect(); store.save(); toast(); } }),
    el("button", { class: "btn-success btn-sm", text: "🖨 Tisk PDF", onclick: () => { collect(); store.save(); exportFinalePdf(); } }),
  ]);

  const tableWrap = el("div", { class: "table-wrap" });
  const scoreInputs = new Map();
  const rozInputs = new Map();

  function collect() {
    scoreInputs.forEach((input, idx) => { store.finaleFinalists[idx].finale_score = input.value.trim(); });
    rozInputs.forEach((input, idx) => { store.finaleFinalists[idx].finale_rozstrel = input.value.trim(); });
  }

  function renderTable() {
    clear(tableWrap);
    scoreInputs.clear(); rozInputs.clear();
    if (!store.finaleFinalists.length) {
      tableWrap.append(el("div", { class: "empty-state", text: "Zatím žádní finalisté. Nejdřív seřaď výsledky v Zápisu." }));
      return;
    }
    const table = el("table");
    const headRow = el("tr", {}, [
      el("th", { text: "Poř." }), el("th", { text: "Příjmení" }), el("th", { text: "Jméno" }), el("th", { text: "Kat." }),
    ]);
    for (let i = 1; i <= ni; i++) headRow.append(el("th", { text: `Pol.${i}` }), el("th", { text: `1.Ch.${i}` }));
    headRow.append(el("th", { text: "Fin.pol." }), el("th", { text: "Celkem" }), el("th", { text: "Rozstřel" }));
    table.append(el("thead", {}, headRow));

    const tbody = el("tbody");
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    store.finaleFinalists.forEach((d, idx) => {
      const rank = idx + 1;
      const isTie = ties.has(idx);
      const tr = el("tr", { class: isTie ? "tie" : (rank <= 6 ? "top6" : "") });
      tr.append(el("td", { class: "medal", text: medals[rank] || String(rank) }));
      tr.append(el("td", { class: "left", text: d.surname || "" }));
      tr.append(el("td", { class: "left muted", text: d.name || "" }));
      tr.append(el("td", { class: "muted", text: catShort(d.category || "") }));
      for (let i = 1; i <= ni; i++) {
        tr.append(el("td", { text: String(d[`item${i}_score`] ?? "") }));
        tr.append(el("td", { class: "muted", text: String(d[`item${i}_fault`] ?? "") }));
      }

      const totalCell = el("td", { class: "gold", text: fmtTotal(d) });
      const scoreInput = el("input", {
        type: "text", value: d.finale_score || "", style: "width:56px",
        oninput: (e) => { d.finale_score = e.target.value; totalCell.textContent = fmtTotal(d); },
      });
      scoreInputs.set(idx, scoreInput);
      tr.append(el("td", {}, scoreInput), totalCell);

      const rozInput = el("input", { type: "text", value: d.finale_rozstrel || "", style: "width:56px" });
      rozInputs.set(idx, rozInput);
      tr.append(el("td", {}, rozInput));

      tbody.append(tr);
    });
    table.append(tbody);
    tableWrap.append(table);
  }

  function fmtTotal(d) {
    const t = num(d.total, 0) + num(d.finale_score, 0);
    return Number.isInteger(t) ? String(t) : String(Math.round(t * 10000) / 10000);
  }

  renderTable();

  const view = el("div", { class: "view" }, [controls, tableWrap]);
  root.append(topbar, view);
}
