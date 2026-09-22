// Položkové listy - papírové listy pro ruční zápis zásahů na střelnici,
// generované ze seznamu střelců (Los nebo Zápis) a z finalistů (Finále).
// Rozdělení do skupin/algoritmus rozestavění 1:1 podle shooting_results_app.py
// (_round_sizes/_build_slots), doplněné o nový "vyvážený" auto-režim.
import { store, num } from "./state.js";
import { el } from "./dom.js";
import { t } from "./i18n.js";
import { exportItemSheetsPdf } from "./pdf.js";
import { toast } from "./main.js";

const PAGE_ROWS = 6;

/** Vyvážené rozdělení: skupiny co nejrovnoměrnější, žádná víc než maxPer
 * (např. 15 lidí / max 6 -> [5,5,5] místo naivního [6,6,3]). */
function autoBalancedSizes(n, maxPer) {
  maxPer = Math.max(1, maxPer || 6);
  if (n <= 0) return [maxPer];
  const groups = Math.ceil(n / maxPer);
  const base = Math.floor(n / groups);
  const rem = n % groups;
  const sizes = [];
  for (let i = 0; i < groups; i++) sizes.push(base + (i < rem ? 1 : 0));
  return sizes;
}

/** Naivní rozdělení po pevném počtu - poslední skupina dostane zbytek. */
function fixedPerSizes(n, per) {
  per = Math.max(1, per || 6);
  const full = Math.floor(n / per);
  const rem = n % per;
  const sizes = Array(full).fill(per);
  if (rem) sizes.push(rem);
  if (!sizes.length) sizes.push(per);
  return sizes;
}

/** Vlastní rozpis (např. "6,6,5") - pokud součet nepokryje všechny, doplní skupiny navíc. */
function customSizes(n, text) {
  const sizes = [];
  String(text || "").replace(/;/g, ",").replace(/\s+/g, ",").split(",").forEach((tok) => {
    tok = tok.trim();
    if (/^\d+$/.test(tok) && parseInt(tok, 10) > 0) sizes.push(parseInt(tok, 10));
  });
  if (!sizes.length) sizes.push(6);
  let sum = sizes.reduce((a, b) => a + b, 0);
  while (sum < n) {
    const add = Math.min(6, n - sum) || 6;
    sizes.push(add);
    sum += add;
  }
  return sizes;
}

function computeSizes(n, mode, per, customText) {
  if (mode === "balanced") return autoBalancedSizes(n, per);
  if (mode === "per") return fixedPerSizes(n, per);
  return customSizes(n, customText);
}

function startNum(d) {
  const v = parseInt(String(d.start_num ?? "").trim(), 10);
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER;
}

/** Kategorie se přiřazuje až v Zápisu, takže Los (store.lotteryList) ji sám
 * o sobě nemá. Když se položkové listy generují z Losu, dohledá se kategorie
 * podle startovního čísla v aktuálním Zápisu (store.shootersData), pokud tam
 * už mezitím byla vyplněná. */
function categoryFor(d) {
  if (d.category) return d.category;
  const sn = String(d.start_num ?? "").trim();
  if (!sn) return "";
  const match = store.shootersData.find((s) => String(s.start_num ?? "").trim() === sn);
  return (match && match.category) || "";
}

/** Rozdělí střelce (dle startovního čísla) do skupin. Každá skupina má vždy
 * min. PAGE_ROWS míst - chybějící doplní prázdnými buňkami s pokračujícím
 * startovním číslem pro pozdější ruční dopsání náhradníků. */
function buildSlots(list, roundSizes, extraPages = 0) {
  const real = list.filter((d) => d.surname || d.name).slice().sort((a, b) => startNum(a) - startNum(b));
  const nums = real.map(startNum).filter((v) => v < Number.MAX_SAFE_INTEGER);
  let ec = nums.length ? Math.max(...nums) + 1 : real.length + 1;
  const makeEmpty = () => { const s = { start: String(ec), name: "", empty: true }; ec += 1; return s; };

  let ridx = 0;
  const rounds = [];
  for (const size of roundSizes) {
    const pr = Math.max(PAGE_ROWS, size);
    const block = [];
    for (let j = 0; j < pr; j++) {
      if (j < size && ridx < real.length) {
        const d = real[ridx++];
        block.push({ start: String(d.start_num ?? ridx), name: `${d.surname || ""} ${d.name || ""}`.trim(), category: categoryFor(d), empty: false });
      } else {
        block.push(makeEmpty());
      }
    }
    rounds.push(block);
  }
  for (let i = 0; i < extraPages; i++) {
    rounds.push(Array.from({ length: PAGE_ROWS }, () => makeEmpty()));
  }
  return rounds;
}

function modeRow(radios, mode, value, labelText, controlEl, onSelect) {
  const input = el("input", {
    type: "radio", name: "itemsheet-mode", id: `ism-${value}`, checked: mode === value,
    onchange: () => onSelect(value),
  });
  radios[value] = input;
  const label = el("label", { for: `ism-${value}`, text: labelText });
  const children = [input, label];
  if (controlEl) children.push(controlEl);
  return el("div", { class: "row", style: "padding:6px 0" }, children);
}

/** Otevře dialog generování položkových listů pro daný seznam střelců
 * (store.lotteryList z Losu, nebo store.shootersData ze Zápisu). */
export function openItemSheetsDialog(list) {
  const n = (list || []).filter((d) => d.surname || d.name).length;
  if (!n) { toast(t("Nejdřív přidej střelce")); return; }

  const state = { mode: "balanced", per: 6, custom: "", reserve: 0 };
  const radios = {};

  const overlay = el("div", { class: "sheet-overlay", onclick: (e) => { if (e.target === overlay) overlay.remove(); } });
  const preview = el("p", { style: "color:var(--green);font-size:12px;margin-top:10px" });

  function currentSizes() { return computeSizes(n, state.mode, state.per, state.custom); }

  function updatePreview() {
    const sizes = currentSizes();
    const extra = Math.max(0, state.reserve || 0);
    const pages = sizes.length + extra;
    const empties = sizes.reduce((a, s) => a + Math.max(PAGE_ROWS, s) - s, 0) + extra * PAGE_ROWS;
    preview.textContent = `${t("Skupiny (lidí):")} ${sizes.join(", ")}   •   ${t("stran:")} ${pages}   •   ${t("prázdných míst:")} ${empties}`;
  }

  function selectMode(value) {
    state.mode = value;
    Object.entries(radios).forEach(([k, r]) => { r.checked = k === value; });
    updatePreview();
  }

  const perInput = el("input", {
    type: "number", min: "1", max: "6", value: state.per, style: "width:64px",
    oninput: (e) => { state.per = parseInt(e.target.value, 10) || 6; updatePreview(); },
    onfocus: () => selectMode("per"),
  });
  const customInput = el("input", {
    type: "text", placeholder: t("např. 6,6,5"), value: state.custom, style: "width:110px",
    oninput: (e) => { state.custom = e.target.value; updatePreview(); },
    onfocus: () => selectMode("custom"),
  });
  const reserveInput = el("input", {
    type: "number", min: "0", max: "10", value: state.reserve,
    oninput: (e) => { state.reserve = parseInt(e.target.value, 10) || 0; updatePreview(); },
  });

  const sheet = el("div", { class: "sheet" }, [
    el("div", { class: "row-between" }, [
      el("h2", { style: "color:var(--accent);font-size:18px", text: t("🎯 Položkové listy") }),
      el("button", { class: "btn-ghost btn-sm", text: t("Zavřít ✕"), onclick: () => overlay.remove() }),
    ]),
    el("p", {
      style: "color:var(--text-muted);font-size:13px;margin:2px 0 12px",
      text: `${t("Střelců:")} ${n}   •   ${t("Položek na střelce:")} ${store.numItems}   •   ${t("Max. terčů:")} ${store.maxScore}`,
    }),
    modeRow(radios, state.mode, "balanced", t("Automaticky vyvážené skupiny (doporučeno)"), null, selectMode),
    modeRow(radios, state.mode, "per", t("Pevný počet na skupinu:"), perInput, selectMode),
    modeRow(radios, state.mode, "custom", t("Vlastní rozpis (např. 6,6,5):"), customInput, selectMode),
    el("div", { class: "field", style: "margin-top:8px" }, [
      el("label", { text: t("Prázdné skupiny navíc (stránky)") }),
      reserveInput,
    ]),
    preview,
    el("div", { class: "btn-row", style: "margin-top:14px" }, [
      el("button", {
        class: "btn-primary", text: t("🖨 Generovat PDF"),
        onclick: () => {
          const sizes = currentSizes();
          const rounds = buildSlots(list, sizes, Math.max(0, state.reserve || 0));
          overlay.remove();
          exportItemSheetsPdf(
            rounds, store.numItems, store.maxScore,
            (r) => `${t("Skupina")} ${r} – ${store.competitionName || t("Soutěž")}`,
            "polozkove_listy"
          );
          toast(t("PDF položkových listů vygenerováno ✔"));
        },
      }),
      el("button", { class: "btn-ghost", text: t("Zrušit"), onclick: () => overlay.remove() }),
    ]),
  ]);

  updatePreview();
  overlay.append(sheet);
  document.body.append(overlay);
}

/** Ze seznamu finalistů (jedné skupiny) postaví 6 slotů, případně obrácené pořadí. */
function finaleGroupSlots(finalists, order) {
  let list = finalists;
  if (order === "od6") list = [...list].reverse();
  const slots = list.map((d, i) => ({
    start: String(i + 1),
    name: `${d.surname || ""} ${d.name || ""}`.trim(),
    category: d.category || "",
    qualification: num(d.total, 0),
    empty: false,
  }));
  while (slots.length < 6) slots.push({ start: String(slots.length + 1), name: "", empty: true });
  return slots;
}

/** Otevře dialog generování položkového listu finále. V režimu řazení "po
 * kategoriích" vygeneruje samostatnou skupinu (stranu) pro finalisty KAŽDÉ
 * kategorie - stejně jako se finále samostatně počítá per kategorii. */
export function openFinaleSheetDialog() {
  if (!store.finaleFinalists.length) { toast(t("Nejdřív musí být určeni finalisté.")); return; }
  const byCategory = store.useCategories && store.rankingMode === "byCategory";

  const state = { targets: store.maxScore, order: "od1" };

  const overlay = el("div", { class: "sheet-overlay", onclick: (e) => { if (e.target === overlay) overlay.remove(); } });

  const targetsInput = el("input", {
    type: "number", min: "1", max: "60", value: state.targets, style: "width:70px",
    oninput: (e) => { state.targets = parseInt(e.target.value, 10) || 1; },
  });

  const orderRadios = ["od1", "od6"].map((val) =>
    el("div", { class: "radio-row" }, [
      el("input", {
        type: "radio", name: "finale-sheet-order", id: `fso-${val}`, checked: state.order === val,
        onchange: () => { state.order = val; },
      }),
      el("label", {
        for: `fso-${val}`,
        text: val === "od1" ? t("Od 1 – nejlepší na start č. 1") : t("Od 6 – nejhorší ze šestice na start č. 1 (pozpátku)"),
      }),
    ])
  );

  const sheet = el("div", { class: "sheet" }, [
    el("div", { class: "row-between" }, [
      el("h2", { style: "color:var(--accent);font-size:18px", text: t("🎯 Položkový list finále") }),
      el("button", { class: "btn-ghost btn-sm", text: t("Zavřít ✕"), onclick: () => overlay.remove() }),
    ]),
    el("p", {
      style: "color:var(--text-muted);font-size:13px;margin:2px 0 12px",
      text: byCategory
        ? `${t("Finalistů:")} ${store.finaleFinalists.length}   •   ${t("samostatná skupina pro každou kategorii")}`
        : `${t("Finalistů:")} ${store.finaleFinalists.length}   •   ${t("vždy jedna skupina")}`,
    }),
    el("div", { class: "field" }, [
      el("label", { text: t("Počet terčů pro finále") }),
      targetsInput,
    ]),
    el("p", { style: "color:var(--text-muted);font-size:13px;margin:10px 0 2px", text: t("Druh zápisu finále:") }),
    ...orderRadios,
    el("div", { class: "btn-row", style: "margin-top:14px" }, [
      el("button", {
        class: "btn-primary", text: t("🖨 Generovat PDF"),
        onclick: () => {
          const targets = Math.max(1, Math.min(state.targets || 1, 60));
          overlay.remove();
          if (byCategory) {
            const groups = store.resultGroups(store.finaleFinalists);
            const rounds = groups.map((g) => finaleGroupSlots(g.items, state.order));
            const titles = groups.map((g) => g.category || t("Bez kategorie"));
            exportItemSheetsPdf(
              rounds, 1, targets,
              (r) => `${t("Finále")} – ${titles[r - 1]} – ${store.competitionName || t("Soutěž")}`,
              "finale_list"
            );
          } else {
            const slots = finaleGroupSlots(store.finaleFinalists, state.order);
            exportItemSheetsPdf(
              [slots], 1, targets,
              () => `${t("Finále")} – ${store.competitionName || t("Soutěž")}`,
              "finale_list"
            );
          }
          toast(t("PDF položkového listu finále vygenerováno ✔"));
        },
      }),
      el("button", { class: "btn-ghost", text: t("Zrušit"), onclick: () => overlay.remove() }),
    ]),
  ]);

  overlay.append(sheet);
  document.body.append(overlay);
}
