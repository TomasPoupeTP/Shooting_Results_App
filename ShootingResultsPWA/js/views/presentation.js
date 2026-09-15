import { store, num } from "../state.js";
import { catShort } from "../constants.js";
import { el, clear } from "../dom.js";

let timer = null;
let scrollTimer = null;

export function openPresentation() {
  const overlay = el("div", { class: "presentation" });

  const closeBtn = el("button", { class: "btn-ghost pres-close", text: "Zavřít ✕", onclick: closePresentation });
  const head = el("div", { class: "pres-head" }, [
    el("div", {}, [
      el("h2", { text: store.competitionName || "Soutěž" }),
      el("div", { class: "sub", text: store.disciplineText() }),
    ]),
    closeBtn,
  ]);
  const list = el("div", { class: "pres-list" });

  overlay.append(head, list);
  document.body.append(overlay);

  function tick() {
    const ni = store.numItems;
    const data = store.sortShooters(store.shootersData, ni).filter((d) => d.surname || d.name);
    const ties = store.findTiedIndices(data, ni, 6);
    clear(list);
    const inner = el("div");
    data.forEach((d, idx) => {
      const t = num(d.total, 0);
      const row = el("div", { class: `pres-row ${idx < 6 ? "top6" : ""}` }, [
        el("div", { class: "rank", text: String(idx + 1) + (ties.has(idx) ? "*" : "") }),
        el("div", { class: "name", text: `${d.surname || ""} ${d.name || ""}${d.category ? " (" + catShort(d.category) + ")" : ""}` }),
        el("div", { class: "total", text: Number.isInteger(t) ? String(t) : String(t) }),
      ]);
      inner.append(row);
    });
    if (!data.length) inner.append(el("div", { class: "empty-state", text: "Zatím žádné výsledky - vyplň Zápis." }));
    list.append(inner);

    // Pomalé automatické scrollování, pokud se obsah nevejde
    clearInterval(scrollTimer);
    requestAnimationFrame(() => {
      if (inner.scrollHeight > list.clientHeight) {
        let dir = 1;
        scrollTimer = setInterval(() => {
          list.scrollTop += dir * 0.6;
          if (list.scrollTop <= 0) dir = 1;
          if (list.scrollTop + list.clientHeight >= list.scrollHeight) dir = -1;
        }, 30);
      }
    });
  }

  tick();
  timer = setInterval(tick, 4000);

  function closePresentation() {
    clearInterval(timer); clearInterval(scrollTimer);
    overlay.remove();
  }
  overlay._close = closePresentation;
}
