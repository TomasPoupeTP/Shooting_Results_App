import { store, num } from "../state.js";
import { CATEGORIES } from "../constants.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";

export function renderEntry(root) {
  store.ensureEntryRows();
  const ni = store.numItems;

  const topbar = el("div", { class: "topbar" }, [
    el("div", {}, [
      el("h1", { text: `🎯 ${store.competitionName || "Soutěž"}` }),
      el("div", { class: "sub", text: `${store.disciplineText()} • Max: ${store.maxScore} terčů` }),
    ]),
    el("div", { class: "actions" }, [
      el("button", { class: "btn-ghost btn-sm", text: "← Zpět", onclick: () => navigate("home") }),
    ]),
  ]);

  const catToggle = el("div", { class: "checkbox-row" }, [
    el("input", {
      type: "checkbox", id: "chk-entry-cats", checked: store.useCategories,
      onchange: (e) => { store.useCategories = e.target.checked; store.save(); renderTable(); },
    }),
    el("label", { for: "chk-entry-cats", text: "Kategorie" }),
  ]);

  const controls = el("div", { class: "btn-row" }, [
    el("button", { class: "btn-ghost btn-sm", text: "+ Střelec", onclick: () => { store.addShooterRow(); renderTable(); } }),
    el("button", { class: "btn-ghost btn-sm", text: "− Střelec", onclick: () => { store.removeShooterRow(); renderTable(); } }),
    el("button", { class: "btn-ghost btn-sm", text: "+ Položka", onclick: () => { store.addItemColumn(); clear(root); renderEntry(root); } }),
    el("button", { class: "btn-ghost btn-sm", text: "− Položka", onclick: () => { store.removeItemColumn(); clear(root); renderEntry(root); } }),
    el("button", { class: "btn-success btn-sm", text: "💾 Uložit", onclick: () => { store.save(); toast(); } }),
    el("button", { class: "btn-ghost btn-sm", text: "🖥 Prezentace", onclick: () => startPresentation() }),
    el("button", {
      class: "btn-primary btn-sm", text: "Seřadit →",
      onclick: () => { store.goToSorted(); navigate("results"); },
    }),
  ]);

  const tableWrap = el("div", { class: "table-wrap" });

  function renderTable() {
    clear(tableWrap);
    const table = el("table");
    const headRow = el("tr", {}, [
      el("th", { text: "#" }), el("th", { text: "Příjmení" }), el("th", { text: "Jméno" }),
      el("th", { text: "Start.č" }), el("th", { text: "Kat." }),
    ]);
    for (let i = 1; i <= ni; i++) {
      headRow.append(el("th", { text: `Pol.${i}` }), el("th", { text: `1.Ch.${i}` }));
    }
    headRow.append(el("th", { text: "Součet" }));
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
        onchange: (e) => { row.category = e.target.value; store.save(); },
      }, CATEGORIES.map((c) => el("option", { value: c, selected: c === (row.category || ""), text: c || "—" })));
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
    const t = store.recalcRowTotal(row);
    return Number.isInteger(t) ? String(t) : String(t);
  }

  renderTable();

  const view = el("div", { class: "view" }, [catToggle, controls, tableWrap]);
  root.append(topbar, view);
}

function startPresentation() {
  import("./presentation.js").then((m) => m.openPresentation());
}
