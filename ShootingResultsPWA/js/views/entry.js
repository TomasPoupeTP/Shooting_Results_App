import { store, num } from "../state.js";
import { allCategories, ADD_CUSTOM } from "../constants.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";
import { t } from "../i18n.js";
import { choiceDialog } from "../dialog.js";
import { openItemSheetsDialog } from "../itemsheets.js";

export function renderEntry(root) {
  store.ensureEntryRows();
  const ni = store.numItems;

  const topbar = el("div", { class: "topbar" }, [
    el("div", {}, [
      el("h1", { text: `🎯 ${store.competitionName || t("Soutěž")}` }),
      el("div", { class: "sub", text: `${store.disciplineText()} • Max: ${store.maxScore} ${t("terčů")}` }),
    ]),
    el("div", { class: "actions" }, [
      el("button", { class: "btn-ghost btn-sm", text: t("← Zpět"), onclick: () => navigate("home") }),
    ]),
  ]);

  const catToggle = el("div", { class: "checkbox-row" }, [
    el("input", {
      type: "checkbox", id: "chk-entry-cats", checked: store.useCategories,
      onchange: (e) => { store.useCategories = e.target.checked; store.save(); renderTable(); },
    }),
    el("label", { for: "chk-entry-cats", text: t("Kategorie") }),
  ]);

  const controls = el("div", { class: "btn-row" }, [
    el("button", { class: "btn-ghost btn-sm", text: t("+ Střelec"), onclick: () => { store.addShooterRow(); renderTable(); } }),
    el("button", { class: "btn-ghost btn-sm", text: t("− Střelec"), onclick: () => { store.removeShooterRow(); renderTable(); } }),
    el("button", { class: "btn-ghost btn-sm", text: t("+ Položka"), onclick: () => { store.addItemColumn(); clear(root); renderEntry(root); } }),
    el("button", { class: "btn-ghost btn-sm", text: t("− Položka"), onclick: () => { store.removeItemColumn(); clear(root); renderEntry(root); } }),
    el("button", { class: "btn-success btn-sm", text: t("💾 Uložit"), onclick: () => { store.save(); toast(); } }),
    el("button", { class: "btn-ghost btn-sm", text: t("🖥 Prezentace"), onclick: () => startPresentation() }),
    el("button", { class: "btn-ghost btn-sm", text: t("🎯 Položkové listy"), onclick: () => openItemSheetsDialog(store.shootersData) }),
    el("button", {
      class: "btn-primary btn-sm", text: t("Seřadit →"),
      onclick: async () => {
        if (store.useCategories) {
          const overallMark = store.rankingMode === "overall" ? "✓ " : "";
          const byCatMark = store.rankingMode === "byCategory" ? "✓ " : "";
          const mode = await choiceDialog(t("Jak řadit výsledky?"), [
            { label: overallMark + t("Celkově (jedno pořadí přes všechny kategorie)"), value: "overall" },
            { label: byCatMark + t("Po kategoriích (samostatné pořadí a finále pro každou kategorii)"), value: "byCategory" },
          ]);
          if (!mode) return;
          store.rankingMode = mode;
        }
        store.goToSorted();
        store.unlockTab("results");
        navigate("results");
      },
    }),
  ]);

  const tableWrap = el("div", { class: "table-wrap" });

  function renderTable() {
    clear(tableWrap);
    const table = el("table");
    const headRow = el("tr", {}, [
      el("th", { text: "#" }), el("th", { text: t("Příjmení") }), el("th", { text: t("Jméno") }),
      el("th", { text: t("Start.č") }), el("th", { text: t("Kat.") }),
    ]);
    for (let i = 1; i <= ni; i++) {
      headRow.append(el("th", { text: `Pol.${i}` }), el("th", { text: `1.Ch.${i}` }));
    }
    headRow.append(el("th", { text: t("Součet") }));
    table.append(el("thead", {}, headRow));

    const tbody = el("tbody");
    store.shootersData.forEach((row, r) => {
      const tr = el("tr");
      tr.append(el("td", { class: "muted", text: String(r + 1) }));

      const surnameInput = el("input", {
        type: "text", value: row.surname || "",
        oninput: (e) => { row.surname = e.target.value; },
        onblur: () => store.save(),
      });
      tr.append(el("td", { class: "left" }, surnameInput));

      const nameInput = el("input", {
        type: "text", value: row.name || "",
        oninput: (e) => { row.name = e.target.value; },
        onblur: () => store.save(),
      });
      tr.append(el("td", { class: "left" }, nameInput));

      const snInput = el("input", {
        type: "text", value: row.start_num ?? "", style: "width:48px;color:var(--gold);font-weight:700",
        oninput: (e) => { row.start_num = e.target.value; },
        onblur: () => store.save(),
      });
      tr.append(el("td", {}, snInput));

      const catSelect = el("select", {
        onchange: (e) => {
          if (e.target.value === ADD_CUSTOM) {
            const name = prompt(t("Název vlastní kategorie:"), "");
            if (name && name.trim()) {
              store.addCustomCategory(name.trim());
              row.category = name.trim();
            }
            store.save();
            renderTable();
            return;
          }
          row.category = e.target.value; store.save();
        },
      }, [
        el("option", { value: "", selected: !row.category, text: "—" }),
        ...allCategories().map((c) => el("option", { value: c, selected: c === (row.category || ""), text: c })),
        el("option", { value: ADD_CUSTOM, text: t("+ Přidat vlastní…") }),
      ]);
      tr.append(el("td", {}, catSelect));

      const sumCell = el("td", { class: "gold", text: fmtTotal(row) });

      for (let i = 1; i <= ni; i++) {
        const scoreKey = `item${i}_score`, faultKey = `item${i}_fault`;
        const scoreInput = el("input", {
          type: "number", value: row[scoreKey] ?? "", style: "width:52px",
          oninput: (e) => {
            row[scoreKey] = e.target.value;
            const v = num(e.target.value, NaN);
            scoreInput.style.borderColor = (Number.isFinite(v) && v > store.maxScore) ? "var(--red)" : "";
            sumCell.textContent = fmtTotal(row);
          },
          onblur: () => store.save(),
        });
        const faultInput = el("input", {
          type: "number", value: row[faultKey] ?? "", style: "width:60px",
          oninput: (e) => { row[faultKey] = e.target.value; },
          onblur: () => store.save(),
        });
        tr.append(el("td", {}, scoreInput), el("td", { class: "muted" }, faultInput));
      }

      tr.append(sumCell);
      tbody.append(tr);
    });
    table.append(tbody);
    tableWrap.append(table);
  }

  function fmtTotal(row) {
    const total = store.recalcRowTotal(row);
    return String(total);
  }

  renderTable();

  const view = el("div", { class: "view" }, [catToggle, controls, tableWrap]);
  root.append(topbar, view);
}

function startPresentation() {
  import("./presentation.js").then((m) => m.openPresentation());
}
