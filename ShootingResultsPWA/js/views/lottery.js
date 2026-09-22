import { store } from "../state.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";
import { exportLotteryPdf } from "../pdf.js";
import { t } from "../i18n.js";
import { openItemSheetsDialog } from "../itemsheets.js";
import { openBibNumbersDialog } from "../bibnumbers.js";

export function renderLottery(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: `📋 ${store.competitionName || t("Soutěž")} – ${t("Los")}` }),
    el("button", { class: "btn-ghost btn-sm", text: t("← Zpět"), onclick: () => navigate("home") }),
  ]);

  const view = el("div", { class: "view" });

  const surnameInput = el("input", { type: "text", placeholder: t("Příjmení") });
  const nameInput = el("input", { type: "text", placeholder: t("Jméno") });
  const prefixInput = el("input", { type: "text", placeholder: t("Prefix (skupina)") });

  const addForm = el("div", { class: "card" }, [
    el("div", { class: "row" }, [surnameInput, nameInput, prefixInput]),
    el("div", { class: "btn-row", style: "margin-top:10px" }, [
      el("button", {
        class: "btn-primary", text: t("+ Přidat"),
        onclick: () => {
          const sn = surnameInput.value.trim(), nm = nameInput.value.trim();
          if (!sn || !nm) { toast("Vyplň příjmení a jméno"); return; }
          store.addLotteryShooter(sn, nm, prefixInput.value.trim());
          surnameInput.value = ""; nameInput.value = ""; prefixInput.value = "";
          renderList();
          surnameInput.focus();
        },
      }),
    ]),
  ]);

  const listWrap = el("div", { class: "table-wrap" });
  const controls = el("div", { class: "btn-row" }, [
    el("button", {
      class: "btn-ghost", text: t("Seřadit dle čísel"),
      onclick: () => { store.sortLotteryByStartNum(); renderList(); },
    }),
    el("button", {
      class: "btn-ghost", text: t("🎲 Auto-Los"),
      onclick: () => {
        if (!store.lotteryList.length) { toast("Nejdřív přidej střelce"); return; }
        const ok = store.autoLos(6);
        if (!ok) {
          alert(t("Nelze rozlosovat: nějaký prefix má víc střelců než je počet šestic. Uber je nebo přidej další účastníky."));
          return;
        }
        renderList();
      },
    }),
    el("button", {
      class: "btn-ghost", text: t("🖨 Tisk listiny"),
      onclick: () => {
        if (!store.lotteryList.length) { toast("Nejdřív přidej střelce"); return; }
        exportLotteryPdf();
      },
    }),
    el("button", {
      class: "btn-primary", text: t("✓ Použít v zápisu"),
      onclick: () => {
        if (!store.lotteryList.length) { toast("Nejdřív přidej střelce"); return; }
        const n = store.applyLotteryToEntry();
        toast(`${n} ${t("střelců vloženo do zápisu")}`);
        store.unlockTab("entry");
        navigate("entry");
      },
    }),
    el("button", {
      class: "btn-ghost", text: t("🎯 Položkové listy"),
      onclick: () => {
        if (!store.lotteryList.length) { toast("Nejdřív přidej střelce"); return; }
        openItemSheetsDialog(store.lotteryList);
      },
    }),
    el("button", {
      class: "btn-ghost", text: t("🎽 Startovní čísla"),
      onclick: () => openBibNumbersDialog(store.lotteryList),
    }),
  ]);

  function renderList() {
    clear(listWrap);
    if (!store.lotteryList.length) {
      listWrap.append(el("div", { class: "empty-state", text: t("Zatím žádní střelci. Přidej je výše.") }));
      return;
    }
    const table = el("table");
    table.append(el("thead", {}, el("tr", {}, [
      el("th", { text: t("Start.č") }), el("th", { text: t("Příjmení") }), el("th", { text: t("Jméno") }),
      el("th", { text: t("Prefix") }), el("th", { text: "" }),
    ])));
    const tbody = el("tbody");
    store.lotteryList.forEach((d, i) => {
      const snInput = el("input", {
        type: "number", value: d.start_num, style: "width:56px",
        onchange: (e) => { d.start_num = parseInt(e.target.value || "0", 10) || 0; store.save(); },
      });
      const pxInput = el("input", {
        type: "text", value: d.prefix || "", style: "width:70px",
        onchange: (e) => { d.prefix = e.target.value.trim(); store.save(); },
      });
      tbody.append(el("tr", {}, [
        el("td", {}, snInput),
        el("td", { class: "left", text: d.surname }),
        el("td", { class: "left muted", text: d.name }),
        el("td", {}, pxInput),
        el("td", {}, el("button", {
          class: "btn-icon btn-ghost", text: "✕",
          onclick: () => { store.removeLotteryShooter(i); renderList(); },
        })),
      ]));
    });
    table.append(tbody);
    listWrap.append(table);
  }

  renderList();

  view.append(addForm, controls, listWrap);
  root.append(topbar, view);
}
