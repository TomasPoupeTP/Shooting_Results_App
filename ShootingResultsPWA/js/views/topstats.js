import { store, num } from "../state.js";
import { catShort } from "../constants.js";
import { el } from "../dom.js";
import { t } from "../i18n.js";

export function openTopStats() {
  const winners = store.computeTopStats();
  const best = winners.length ? winners[0].count : 0;

  const overlay = el("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center",
    onclick: (e) => { if (e.target === overlay) overlay.remove(); },
  });

  const body = el("div", {
    style: "background:var(--bg-card);border-top:2px solid var(--accent);border-radius:16px 16px 0 0;max-height:82vh;width:100%;max-width:640px;overflow:auto;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))",
  });

  body.append(
    el("div", { class: "row-between" }, [
      el("h2", { style: "color:var(--accent);font-size:18px", text: t("📊 Top Statistika") }),
      el("button", { class: "btn-ghost btn-sm", text: t("Zavřít ✕"), onclick: () => overlay.remove() }),
    ]),
    el("p", { style: "color:var(--text-muted);font-size:13px;margin:4px 0 2px", text: `${t("Střelci s plnou položkou (maximum")} ${store.maxScore} ${t("terčů")}${t(") - alespoň jednou")}` }),
    el("p", { style: "color:var(--green);font-size:13px;margin:0 0 12px", text: `${t("Celkem střelců s plnou položkou:")} ${winners.length}` }),
  );

  if (!winners.length) {
    body.append(el("div", { class: "empty-state", text: t("Zatím žádný střelec nedosáhl plné položky.") }));
  } else {
    const table = el("table");
    table.append(el("thead", {}, el("tr", {}, [
      el("th", { text: t("Příjmení") }), el("th", { text: t("Jméno") }), el("th", { text: t("Kat.") }),
      el("th", { text: t("Plných pol.") }), el("th", { text: t("Které položky") }), el("th", { text: t("Součet") }),
    ])));
    const tbody = el("tbody");
    winners.forEach(({ d, count, hits }) => {
      const total = num(d.total, 0);
      tbody.append(el("tr", {}, [
        el("td", { class: "left", text: d.surname || "" }),
        el("td", { class: "left muted", text: d.name || "" }),
        el("td", { class: "muted", text: catShort(d.category || "") }),
        el("td", { class: count === best ? "gold" : "", text: `${count}×` }),
        el("td", { text: hits.map((i) => `Pol.${i}`).join(", ") }),
        el("td", { class: "gold", text: Number.isInteger(total) ? String(total) : String(total) }),
      ]));
    });
    table.append(tbody);
    body.append(el("div", { class: "table-wrap" }, table));
  }

  overlay.append(body);
  document.body.append(overlay);
}
