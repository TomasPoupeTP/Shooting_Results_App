import { store } from "../state.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("cs-CZ") + " " + d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

export function renderCompetitions(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: "🔀 Soutěže" }),
    el("button", { class: "btn-ghost btn-sm", text: "← Zpět", onclick: () => navigate("home") }),
  ]);

  const view = el("div", { class: "view" });
  const listWrap = el("div", { class: "card", style: "padding:0" });

  function renderList() {
    clear(listWrap);
    const sorted = [...store.competitions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    sorted.forEach((c) => {
      const isActive = c.id === store.activeId;
      const item = el("div", { class: `list-item${isActive ? " active" : ""}` }, [
        el("div", {
          class: "main", style: "cursor:pointer",
          onclick: () => {
            if (!isActive) { store.switchCompetition(c.id); toast("Přepnuto ✔"); }
            navigate("home");
          },
        }, [
          el("div", { class: "title" }, [
            c.name || "Bez názvu",
            isActive ? el("span", { class: "pill", style: "margin-left:8px", text: "aktivní" }) : null,
          ]),
          el("div", { class: "sub", text: `Naposledy upraveno: ${fmtDate(c.updatedAt)}` }),
        ]),
        el("div", { class: "btn-row" }, [
          el("button", {
            class: "btn-ghost btn-sm", text: "✏️",
            onclick: () => {
              const name = prompt("Nový název soutěže:", c.name || "");
              if (name !== null) { store.renameCompetition(c.id, name.trim()); renderList(); }
            },
          }),
          el("button", {
            class: "btn-ghost btn-sm", text: "🗑",
            onclick: () => {
              if (store.competitions.length <= 1) { toast("Musí zůstat aspoň jedna soutěž"); return; }
              if (confirm(`Opravdu smazat soutěž "${c.name}"? Tohle nejde vrátit zpět.`)) {
                store.deleteCompetition(c.id);
                renderList();
              }
            },
          }),
        ]),
      ]);
      listWrap.append(item);
    });
  }

  renderList();

  const addBtn = el("button", {
    class: "btn-primary", style: "width:100%",
    text: "+ Nová soutěž",
    onclick: () => {
      const name = prompt("Název nové soutěže:", "");
      if (name === null) return;
      store.createCompetition(name.trim() || "Nová soutěž");
      toast("Soutěž vytvořena ✔");
      navigate("home");
    },
  });

  view.append(
    el("p", { style: "color:var(--text-muted);font-size:13px", text: "Aplikace umí držet víc rozpracovaných/dokončených soutěží najednou. Klikni na soutěž pro přepnutí." }),
    listWrap,
    addBtn,
  );
  root.append(topbar, view);
}
