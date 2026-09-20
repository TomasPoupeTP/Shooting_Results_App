import { store, num } from "../state.js";
import { catShort } from "../constants.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";
import { exportFinalePdf } from "../pdf.js";
import { t } from "../i18n.js";
import { openFinaleSheetDialog } from "../itemsheets.js";

export function renderFinale(root) {
  store.buildFinalists();
  const ni = store.numItems;
  const byCategory = store.useCategories && store.rankingMode === "byCategory";

  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: `🏅 ${store.competitionName || t("Soutěž")} – ${t("Finále")}` }),
    el("button", { class: "btn-ghost btn-sm", text: t("← Výsledky"), onclick: () => navigate("results") }),
  ]);

  const controls = el("div", { class: "btn-row" }, [
    el("button", { class: "btn-ghost btn-sm", text: t("Vyhodnotit rozstřel"), onclick: () => { collect(); store.evalFinaleRozstrel(); renderGroups(); } }),
    el("button", { class: "btn-primary btn-sm", text: t("Seřadit finále"), onclick: () => { collect(); store.sortFinale(); renderGroups(); } }),
    el("button", { class: "btn-success btn-sm", text: t("💾 Uložit"), onclick: () => { collect(); store.save(); toast(); } }),
    el("button", { class: "btn-success btn-sm", text: t("🖨 Tisk PDF"), onclick: () => { collect(); store.save(); exportFinalePdf(); } }),
    el("button", { class: "btn-ghost btn-sm", text: t("🎯 Položkový list finále"), onclick: () => openFinaleSheetDialog() }),
  ]);

  const groupsWrap = el("div", {});
  const scoreInputs = new Map(); // finalista objekt -> <input>
  const rozInputs = new Map();

  function collect() {
    scoreInputs.forEach((input, d) => { d.finale_score = input.value.trim(); });
    rozInputs.forEach((input, d) => { d.finale_rozstrel = input.value.trim(); });
  }

  function fmtTotal(d) {
    const total = num(d.total, 0) + num(d.finale_score, 0);
    return Number.isInteger(total) ? String(total) : String(Math.round(total * 10000) / 10000);
  }

  function renderOneTable(items) {
    const ties = store.findFinaleTies(items);
    const table = el("table");
    const headRow = el("tr", {}, [
      el("th", { text: t("Poř.") }), el("th", { text: t("Příjmení") }), el("th", { text: t("Jméno") }), el("th", { text: t("Kat.") }),
    ]);
    for (let i = 1; i <= ni; i++) headRow.append(el("th", { text: `Pol.${i}` }), el("th", { text: `1.Ch.${i}` }));
    headRow.append(el("th", { text: t("Fin.pol.") }), el("th", { text: t("Celkem") }), el("th", { text: t("Rozstřel") }));
    table.append(el("thead", {}, headRow));

    const tbody = el("tbody");
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    items.forEach((d, idx) => {
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
      scoreInputs.set(d, scoreInput);
      tr.append(el("td", {}, scoreInput), totalCell);

      const rozInput = el("input", { type: "text", value: d.finale_rozstrel || "", style: "width:56px" });
      rozInputs.set(d, rozInput);
      tr.append(el("td", {}, rozInput));

      tbody.append(tr);
    });
    table.append(tbody);
    return table;
  }

  function renderGroups() {
    clear(groupsWrap);
    scoreInputs.clear(); rozInputs.clear();
    if (!store.finaleFinalists.length) {
      groupsWrap.append(el("div", { class: "empty-state", text: t("Zatím žádní finalisté. Nejdřív seřaď výsledky v Zápisu.") }));
      return;
    }
    const groups = store.resultGroups(store.finaleFinalists);
    groups.forEach(({ category, items }) => {
      if (byCategory) {
        groupsWrap.append(el("div", { class: "section-title", text: category || t("Bez kategorie") }));
      }
      groupsWrap.append(el("div", { class: "table-wrap" }, renderOneTable(items)));
    });
  }

  renderGroups();

  const view = el("div", { class: "view" }, [controls, groupsWrap]);
  root.append(topbar, view);
}
