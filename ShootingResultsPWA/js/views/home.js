import { store } from "../state.js";
import { DISCIPLINES, CUSTOM_DISC } from "../constants.js";
import { el } from "../dom.js";
import { navigate, toast } from "../main.js";

export function renderHome(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: "🎯 SHOOTING RESULTS APP" }),
  ]);

  const view = el("div", { class: "view" });

  const nameField = el("div", { class: "field" }, [
    el("label", { text: "Název soutěže" }),
    el("input", {
      type: "text", value: store.competitionName, placeholder: "např. Krajský přebor 2026",
      oninput: (e) => { store.competitionName = e.target.value; },
      onblur: () => store.save(),
    }),
  ]);

  const numShootersField = el("div", { class: "field" }, [
    el("label", { text: "Počet střelců" }),
    el("input", {
      type: "number", min: "1", max: "300", value: store.numShooters,
      oninput: (e) => { store.numShooters = Math.max(1, parseInt(e.target.value || "1", 10)); },
      onblur: () => { store.ensureEntryRows(); store.save(); },
    }),
  ]);

  const numItemsField = el("div", { class: "field" }, [
    el("label", { text: "Počet položek (kol)" }),
    el("input", {
      type: "number", min: "1", max: "30", value: store.numItems,
      oninput: (e) => { store.numItems = Math.max(1, parseInt(e.target.value || "1", 10)); },
      onblur: () => { store.ensureEntryRows(); store.save(); },
    }),
  ]);

  const discSelect = el("select", {
    onchange: (e) => { store.discipline = e.target.value; renderHome(root); store.save(); },
  }, [...DISCIPLINES, CUSTOM_DISC].map((d) =>
    el("option", { value: d, selected: d === store.discipline, text: d })));

  const disciplineField = el("div", { class: "field" }, [
    el("label", { text: "Disciplína" }),
    discSelect,
    store.discipline === CUSTOM_DISC ? el("input", {
      type: "text", placeholder: "Vlastní disciplína", value: store.customDiscipline,
      style: "margin-top:6px",
      oninput: (e) => { store.customDiscipline = e.target.value; },
      onblur: () => store.save(),
    }) : null,
  ]);

  const maxScoreField = el("div", { class: "field" }, [
    el("label", { text: "Max. terčů v položce" }),
    el("input", {
      type: "number", min: "1", max: "999", value: store.maxScore,
      oninput: (e) => { store.maxScore = parseInt(e.target.value || "0", 10) || 0; },
      onblur: () => store.save(),
    }),
  ]);

  const optionsField = el("div", { class: "card" }, [
    el("div", { class: "checkbox-row" }, [
      el("input", {
        type: "checkbox", id: "chk-finale", checked: store.hasFinale,
        onchange: (e) => { store.hasFinale = e.target.checked; store.save(); },
      }),
      el("label", { for: "chk-finale", text: "Finále" }),
    ]),
    el("div", { class: "checkbox-row", style: "margin-top:8px" }, [
      el("input", {
        type: "checkbox", id: "chk-cats", checked: store.useCategories,
        onchange: (e) => { store.useCategories = e.target.checked; store.save(); },
      }),
      el("label", { for: "chk-cats", text: "Používat kategorie" }),
    ]),
  ]);

  const actions = el("div", { class: "btn-row" }, [
    el("button", {
      class: "btn-primary", text: "🎲 Los",
      onclick: () => {
        if (!store.competitionName.trim()) { toast("Vyplň nejdřív název soutěže"); return; }
        navigate("lottery");
      },
    }),
    el("button", {
      class: "btn-primary", text: "✏️ Zápis",
      onclick: () => {
        if (!store.competitionName.trim()) { toast("Vyplň nejdřív název soutěže"); return; }
        store.ensureEntryRows();
        navigate("entry");
      },
    }),
    el("button", {
      class: "btn-danger", text: "🗑 Nová soutěž",
      onclick: () => {
        if (confirm("Opravdu smazat aktuální soutěž a začít znovu?")) store.newCompetition();
        renderHome(root);
      },
    }),
  ]);

  const importInput = el("input", { type: "file", accept: "application/json", style: "display:none" });
  importInput.addEventListener("change", async () => {
    const f = importInput.files[0];
    if (!f) return;
    try {
      store.importJSON(await f.text());
      toast("Soutěž načtena ✔");
      renderHome(root);
    } catch (e) { alert("Nepodařilo se načíst soubor: " + e.message); }
  });

  const ioActions = el("div", { class: "btn-row" }, [
    el("button", {
      class: "btn-ghost", text: "⬇️ Exportovat JSON",
      onclick: () => {
        const blob = new Blob([store.exportJSON()], { type: "application/json" });
        const a = el("a", { href: URL.createObjectURL(blob), download: `${(store.competitionName || "soutez").replace(/[^\p{L}\p{N}_-]+/gu, "_")}.json` });
        document.body.appendChild(a); a.click(); a.remove();
      },
    }),
    el("button", { class: "btn-ghost", text: "⬆️ Importovat JSON", onclick: () => importInput.click() }),
    importInput,
  ]);

  view.append(
    el("div", { class: "card" }, [nameField, numShootersField, numItemsField, disciplineField, maxScoreField]),
    optionsField,
    actions,
    ioActions,
    el("p", { class: "sub", style: "text-align:center;color:var(--text-muted);font-size:11px;margin-top:8px", text: "Data se ukládají v tomto prohlížeči (localStorage). Pro zálohu použij Export JSON." }),
  );

  root.append(topbar, view);
}
