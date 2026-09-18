import { store } from "../state.js";
import { allDisciplines, ADD_CUSTOM } from "../constants.js";
import { el } from "../dom.js";
import { navigate, toast } from "../main.js";
import { t } from "../i18n.js";

export function renderHome(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: "🎯 " + (store.competitionName || t("Shooting Results")) }),
  ]);

  const view = el("div", { class: "view" });

  const nameField = el("div", { class: "field" }, [
    el("label", { text: t("Název soutěže") }),
    el("input", {
      type: "text", value: store.competitionName, placeholder: t("např. Krajský přebor 2026"),
      oninput: (e) => { store.competitionName = e.target.value; },
      onblur: () => store.save(),
    }),
  ]);

  const numShootersField = el("div", { class: "field" }, [
    el("label", { text: t("Počet střelců") }),
    el("input", {
      type: "number", min: "1", max: "300", value: store.numShooters,
      oninput: (e) => { store.numShooters = Math.max(1, parseInt(e.target.value || "1", 10)); },
      onblur: () => { store.ensureEntryRows(); store.save(); },
    }),
  ]);

  const numItemsField = el("div", { class: "field" }, [
    el("label", { text: t("Počet položek (kol)") }),
    el("input", {
      type: "number", min: "1", max: "30", value: store.numItems,
      oninput: (e) => { store.numItems = Math.max(1, parseInt(e.target.value || "1", 10)); },
      onblur: () => { store.ensureEntryRows(); store.save(); },
    }),
  ]);

  function buildDiscSelect() {
    return el("select", {
      onchange: (e) => {
        if (e.target.value === ADD_CUSTOM) {
          const name = prompt(t("Název vlastní disciplíny:"), "");
          if (name && name.trim()) {
            store.addCustomDiscipline(name.trim());
            store.discipline = name.trim();
          }
          disciplineField.replaceChild(buildDiscSelect(), disciplineField.lastChild);
          store.save();
          return;
        }
        store.discipline = e.target.value;
        store.save();
      },
    }, [
      ...allDisciplines().map((d) => el("option", { value: d, selected: d === store.discipline, text: d })),
      el("option", { value: ADD_CUSTOM, text: t("+ Přidat vlastní…") }),
    ]);
  }

  const disciplineField = el("div", { class: "field" }, [
    el("label", { text: t("Disciplína") }),
    buildDiscSelect(),
  ]);

  const maxScoreField = el("div", { class: "field" }, [
    el("label", { text: t("Max. terčů v položce") }),
    el("input", {
      type: "number", min: "1", max: "999", value: store.maxScore,
      oninput: (e) => { store.maxScore = parseInt(e.target.value || "0", 10) || 0; },
      onblur: () => store.save(),
    }),
  ]);

  const refereeField = el("div", { class: "field" }, [
    el("label", { text: t("Hlavní rozhodčí") }),
    el("input", {
      type: "text", value: store.refereeName, placeholder: t("Jméno"),
      oninput: (e) => { store.refereeName = e.target.value; },
      onblur: () => store.save(),
    }),
  ]);

  const dateField = el("div", { class: "field" }, [
    el("label", { text: t("Datum konání") }),
    el("input", {
      type: "date", value: store.eventDate,
      onchange: (e) => { store.eventDate = e.target.value; store.save(); },
    }),
  ]);

  const venueField = el("div", { class: "field" }, [
    el("label", { text: t("Místo konání") }),
    el("input", {
      type: "text", value: store.venue, placeholder: t("např. Střelnice Brno"),
      oninput: (e) => { store.venue = e.target.value; },
      onblur: () => store.save(),
    }),
  ]);

  const optionsField = el("div", { class: "card" }, [
    el("div", { class: "checkbox-row" }, [
      el("input", {
        type: "checkbox", id: "chk-finale", checked: store.hasFinale,
        onchange: (e) => { store.hasFinale = e.target.checked; store.save(); },
      }),
      el("label", { for: "chk-finale", text: t("Finále") }),
    ]),
    el("div", { class: "checkbox-row", style: "margin-top:8px" }, [
      el("input", {
        type: "checkbox", id: "chk-cats", checked: store.useCategories,
        onchange: (e) => { store.useCategories = e.target.checked; store.save(); },
      }),
      el("label", { for: "chk-cats", text: t("Používat kategorie") }),
    ]),
  ]);

  const actions = el("div", { class: "btn-row" }, [
    el("button", {
      class: "btn-primary", text: t("🎲 Los"),
      onclick: () => {
        if (!store.competitionName.trim()) { toast("Vyplň nejdřív název soutěže"); return; }
        store.unlockTab("lottery");
        navigate("lottery");
      },
    }),
    el("button", {
      class: "btn-primary", text: t("✏️ Zápis"),
      onclick: () => {
        if (!store.competitionName.trim()) { toast("Vyplň nejdřív název soutěže"); return; }
        store.ensureEntryRows();
        store.unlockTab("entry");
        navigate("entry");
      },
    }),
    el("button", {
      class: "btn-danger", text: t("🆕 Nová soutěž"),
      onclick: () => {
        store.createCompetition("Nová soutěž");
        toast("Nová soutěž vytvořena ✔");
        navigate("home");
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
      navigate("home");
    } catch (e) { alert(t("Nepodařilo se načíst soubor: ") + e.message); }
  });

  const ioActions = el("div", { class: "btn-row" }, [
    el("button", {
      class: "btn-ghost", text: t("⬇️ Exportovat JSON"),
      onclick: () => {
        const blob = new Blob([store.exportJSON()], { type: "application/json" });
        const a = el("a", { href: URL.createObjectURL(blob), download: `${(store.competitionName || "soutez").replace(/[^\p{L}\p{N}_-]+/gu, "_")}.json` });
        document.body.appendChild(a); a.click(); a.remove();
      },
    }),
    el("button", { class: "btn-ghost", text: t("⬆️ Importovat JSON"), onclick: () => importInput.click() }),
    importInput,
  ]);

  view.append(
    el("div", { class: "card" }, [nameField, numShootersField, numItemsField, disciplineField, maxScoreField, refereeField, dateField, venueField]),
    optionsField,
    actions,
    ioActions,
    el("p", { class: "sub", style: "text-align:center;color:var(--text-muted);font-size:11px;margin-top:8px", text: t("Víc soutěží najednou, vzhled a další nastavení najdeš v menu ☰ Více.") }),
  );

  root.append(topbar, view);
}
