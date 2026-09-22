import { store, Store } from "../state.js";
import { DISCIPLINES, CATEGORIES, allDisciplines } from "../constants.js";
import { el, clear } from "../dom.js";
import { navigate, toast } from "../main.js";
import { t } from "../i18n.js";

export function renderAppSettings(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: t("⚙️ Nastavení aplikace") }),
    el("button", { class: "btn-ghost btn-sm", text: t("← Zpět"), onclick: () => navigate("home") }),
  ]);

  const view = el("div", { class: "view" });

  // ── Vzhled ────────────────────────────────────────────────────────────
  const themeCard = el("div", { class: "card" });
  const themeOptions = [
    ["system", "Podle systému telefonu"],
    ["dark", "Tmavý"],
    ["light", "Světlý"],
  ];
  themeCard.append(
    ...themeOptions.map(([val, label]) =>
      el("div", { class: "radio-row" }, [
        el("input", {
          type: "radio", name: "theme", id: `theme-${val}`, checked: store.app.theme === val,
          onchange: () => { store.setTheme(val); },
        }),
        el("label", { for: `theme-${val}`, text: t(label) }),
      ])
    )
  );

  // ── Jazyk ──────────────────────────────────────────────────────────────
  const langCard = el("div", { class: "card" });
  const langOptions = [
    ["cs", "Čeština"],
    ["en", "Angličtina"],
  ];
  langCard.append(
    ...langOptions.map(([val, label]) =>
      el("div", { class: "radio-row" }, [
        el("input", {
          type: "radio", name: "language", id: `lang-${val}`, checked: (store.app.language || "cs") === val,
          onchange: () => { store.app.language = val; store.save(); navigate("appsettings"); },
        }),
        el("label", { for: `lang-${val}`, text: t(label) }),
      ])
    )
  );

  // ── Vlastní disciplíny ───────────────────────────────────────────────
  const discInput = el("input", { type: "text", placeholder: t("Název nové disciplíny") });
  const discListWrap = el("div", {});
  function renderDiscList() {
    clear(discListWrap);
    if (!store.app.customDisciplines.length) {
      discListWrap.append(el("p", { style: "color:var(--text-muted);font-size:13px", text: t("Zatím žádné vlastní disciplíny.") }));
      return;
    }
    store.app.customDisciplines.forEach((name) => {
      discListWrap.append(el("div", { class: "list-item" }, [
        el("div", { class: "main title", text: name }),
        el("button", {
          class: "btn-ghost btn-sm", text: "🗑",
          onclick: () => { store.removeCustomDiscipline(name); renderDiscList(); },
        }),
      ]));
    });
  }
  renderDiscList();

  const discCard = el("div", { class: "card" }, [
    el("div", { class: "row" }, [
      discInput,
      el("button", {
        class: "btn-primary btn-sm", text: t("+ Přidat"),
        onclick: () => {
          const v = discInput.value.trim();
          if (!v) return;
          if (DISCIPLINES.includes(v) || store.app.customDisciplines.includes(v)) {
            toast("Tahle disciplína už existuje"); return;
          }
          store.addCustomDiscipline(v);
          discInput.value = "";
          renderDiscList();
        },
      }),
    ]),
    discListWrap,
  ]);

  // ── Vestavěné disciplíny (jdou jen skrýt z výběru, ne smazat natvrdo) ──
  const builtinDiscListWrap = el("div", {});
  function renderBuiltinDiscList() {
    clear(builtinDiscListWrap);
    DISCIPLINES.forEach((name) => {
      const hidden = store.app.hiddenDisciplines.includes(name);
      builtinDiscListWrap.append(el("div", { class: "list-item", style: hidden ? "opacity:.5" : "" }, [
        el("div", { class: "main title", text: name }),
        hidden
          ? el("button", {
              class: "btn-ghost btn-sm", text: t("↺ Obnovit"),
              onclick: () => { store.unhideDiscipline(name); renderBuiltinDiscList(); },
            })
          : el("button", {
              class: "btn-ghost btn-sm", text: "🗑",
              onclick: () => { store.hideDiscipline(name); renderBuiltinDiscList(); },
            }),
      ]));
    });
  }
  renderBuiltinDiscList();
  const builtinDiscCard = el("div", { class: "card" }, [
    el("p", { style: "color:var(--text-muted);font-size:12px;margin-bottom:4px", text: t("Skryté se nenabízí ve výběru disciplíny - kdykoliv je můžeš vrátit zpět.") }),
    builtinDiscListWrap,
  ]);

  // ── Vlastní kategorie ────────────────────────────────────────────────
  const catNameInput = el("input", { type: "text", placeholder: t("Název kategorie") });
  const catShortInput = el("input", { type: "text", placeholder: t("Zkratka (1-3 znaky)"), style: "width:110px" });
  const catListWrap = el("div", {});
  function renderCatList() {
    clear(catListWrap);
    if (!store.app.customCategories.length) {
      catListWrap.append(el("p", { style: "color:var(--text-muted);font-size:13px", text: t("Zatím žádné vlastní kategorie.") }));
      return;
    }
    store.app.customCategories.forEach((c) => {
      catListWrap.append(el("div", { class: "list-item" }, [
        el("div", { class: "main" }, [
          el("span", { class: "title", text: c.name }),
          el("span", { class: "sub", text: `${t("zkratka:")} ${c.short}` }),
        ]),
        el("button", {
          class: "btn-ghost btn-sm", text: "🗑",
          onclick: () => { store.removeCustomCategory(c.name); renderCatList(); },
        }),
      ]));
    });
  }
  renderCatList();

  const catCard = el("div", { class: "card" }, [
    el("div", { class: "row" }, [
      catNameInput, catShortInput,
      el("button", {
        class: "btn-primary btn-sm", text: t("+ Přidat"),
        onclick: () => {
          const v = catNameInput.value.trim();
          if (!v) return;
          const ok = store.addCustomCategory(v, catShortInput.value.trim());
          if (!ok) { toast("Tahle kategorie už existuje"); return; }
          catNameInput.value = ""; catShortInput.value = "";
          renderCatList();
        },
      }),
    ]),
    catListWrap,
  ]);

  // ── Vestavěné kategorie (jdou jen skrýt z výběru, ne smazat natvrdo) ───
  const builtinCatListWrap = el("div", {});
  function renderBuiltinCatList() {
    clear(builtinCatListWrap);
    CATEGORIES.filter((c) => c).forEach((name) => {
      const hidden = store.app.hiddenCategories.includes(name);
      builtinCatListWrap.append(el("div", { class: "list-item", style: hidden ? "opacity:.5" : "" }, [
        el("div", { class: "main title", text: name }),
        hidden
          ? el("button", {
              class: "btn-ghost btn-sm", text: t("↺ Obnovit"),
              onclick: () => { store.unhideCategory(name); renderBuiltinCatList(); },
            })
          : el("button", {
              class: "btn-ghost btn-sm", text: "🗑",
              onclick: () => { store.hideCategory(name); renderBuiltinCatList(); },
            }),
      ]));
    });
  }
  renderBuiltinCatList();
  const builtinCatCard = el("div", { class: "card" }, [
    el("p", { style: "color:var(--text-muted);font-size:12px;margin-bottom:4px", text: t("Skryté se nenabízí ve výběru kategorie - kdykoliv je můžeš vrátit zpět.") }),
    builtinCatListWrap,
  ]);

  // ── Kritéria řazení při shodě - interaktivní "flow" bloků ────────────
  // Uživatel může pořadí bloků měnit šipkami nahoru/dolů a jednotlivé
  // bloky vypínat. Celkový součet a Rozstřel jsou pevné (vždy první/poslední
  // krok), mezi nimi je pořadí a zapnutí bloků plně na uživateli.
  const sortDirRow = el("div", { class: "radio-row" }, [
    el("input", {
      type: "checkbox", id: "sort-reverse", checked: store.app.sortReverseDirection,
      onchange: (e) => { store.setSortDirection(e.target.checked); renderFlow(); },
    }),
    el("label", { for: "sort-reverse", text: t("Položky procházet od 1. k poslední (místo od poslední k 1.)") }),
  ]);

  const flowWrap = el("div", {});
  const sortPreview = el("p", { style: "color:var(--text-muted);font-size:12px;margin-top:10px" });

  function flowBlock(text, { locked = false } = {}) {
    return el("div", {
      class: "list-item", style: locked ? "opacity:.6" : "",
    }, [
      el("div", { class: "main title", text: (locked ? "🔒 " : "↕️ ") + text }),
    ]);
  }

  function renderFlow() {
    clear(flowWrap);
    flowWrap.append(flowBlock(t("Celkový součet (vždy první)"), { locked: true }));

    store.app.sortBlocks.forEach((b, idx) => {
      const row = el("div", { class: "list-item" }, [
        el("div", { class: "checkbox-row", style: "flex:1" }, [
          el("input", {
            type: "checkbox", checked: b.enabled,
            onchange: (e) => { store.toggleSortBlock(b.key, e.target.checked); renderFlow(); },
          }),
          el("label", { text: "↕️ " + t(Store.blockLabel(b.key)) + (b.enabled ? "" : " " + t("(vypnuto)")) }),
        ]),
        el("div", { class: "btn-row" }, [
          el("button", {
            class: "btn-ghost btn-sm", text: "↑", disabled: idx === 0,
            onclick: () => { store.moveSortBlock(b.key, -1); renderFlow(); },
          }),
          el("button", {
            class: "btn-ghost btn-sm", text: "↓", disabled: idx === store.app.sortBlocks.length - 1,
            onclick: () => { store.moveSortBlock(b.key, 1); renderFlow(); },
          }),
        ]),
      ]);
      flowWrap.append(row);
    });

    flowWrap.append(flowBlock(t("Rozstřel (ruční zadání, pokud shoda přetrvá)"), { locked: true }));

    sortPreview.innerHTML = t("Aktuální postup řazení:") + "<br>" +
      store.describeSortConfig(t).map((s, i) => `${i + 1}. ${s}`).join("<br>");
  }
  renderFlow();

  const sortCard = el("div", { class: "card" }, [sortDirRow, flowWrap, sortPreview]);

  // ── Výchozí hodnoty pro nové soutěže ─────────────────────────────────
  const defDiscInput = el("select", {}, allDisciplines(store.app.defaultDiscipline).map((d) =>
    el("option", { value: d, selected: d === store.app.defaultDiscipline, text: d })));
  const defMaxInput = el("input", { type: "number", value: store.app.defaultMaxScore, min: "1" });
  const defRefInput = el("input", { type: "text", value: store.app.defaultRefereeName, placeholder: t("Jméno hlavního rozhodčího") });

  const defaultsCard = el("div", { class: "card" }, [
    el("div", { class: "field" }, [
      el("label", { text: t("Výchozí disciplína") }),
      defDiscInput,
    ]),
    el("div", { class: "field" }, [
      el("label", { text: t("Výchozí max. terčů/položku") }),
      defMaxInput,
    ]),
    el("div", { class: "field" }, [
      el("label", { text: t("Výchozí jméno hlavního rozhodčího") }),
      defRefInput,
    ]),
    el("button", {
      class: "btn-primary btn-sm", text: t("Uložit výchozí hodnoty"),
      onclick: () => {
        store.app.defaultDiscipline = defDiscInput.value.trim() || store.app.defaultDiscipline;
        store.app.defaultMaxScore = parseInt(defMaxInput.value || "25", 10) || 25;
        store.app.defaultRefereeName = defRefInput.value.trim();
        store.save();
        toast("Uloženo ✔");
      },
    }),
  ]);

  view.append(
    el("div", { class: "section-title", text: t("Vzhled") }), themeCard,
    el("div", { class: "section-title", text: t("Jazyk") }), langCard,
    el("div", { class: "section-title", text: t("Vlastní disciplíny") }), discCard,
    el("div", { class: "section-title", text: t("Vestavěné disciplíny") }), builtinDiscCard,
    el("div", { class: "section-title", text: t("Vlastní kategorie") }), catCard,
    el("div", { class: "section-title", text: t("Vestavěné kategorie") }), builtinCatCard,
    el("div", { class: "section-title", text: t("Kritéria řazení při shodě") }), sortCard,
    el("div", { class: "section-title", text: t("Výchozí hodnoty pro nové soutěže") }), defaultsCard,
  );
  root.append(topbar, view);
}
