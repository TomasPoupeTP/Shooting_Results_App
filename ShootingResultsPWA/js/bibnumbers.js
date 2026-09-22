// Generátor startovních čísel na záda - pro každého střelce jedna strana A4
// s velkým číslem uprostřed, volitelně doplněná o jméno, kategorii, název
// soutěže, disciplínu, datum a střelnici (zaškrtávátka). PDF se stáhne rovnou
// (bez dalšího potvrzování) po kliknutí na "Generovat", stejně jako ostatní
// PDF exporty v appce.
import { store } from "./state.js";
import { el } from "./dom.js";
import { t } from "./i18n.js";
import { exportBibNumbersPdf } from "./pdf.js";
import { toast } from "./main.js";

const FIELD_DEFS = [
  ["name", "Jméno a příjmení", true],
  ["category", "Kategorie střelce", true],
  ["competition", "Název soutěže", true],
  ["discipline", "Disciplína", false],
  ["date", "Datum", true],
  ["venue", "Střelnice", true],
];

export function openBibNumbersDialog(list) {
  const shooters = (list || []).filter((d) => d.surname || d.name);
  if (!shooters.length) { toast(t("Nejdřív přidej střelce")); return; }

  const opts = {};
  FIELD_DEFS.forEach(([key, , def]) => { opts[key] = def; });

  const overlay = el("div", { class: "sheet-overlay", onclick: (e) => { if (e.target === overlay) overlay.remove(); } });

  const previewTop = el("div", { class: "bib-preview-top" });
  const previewNum = el("div", { class: "bib-preview-num" });
  const previewBottom = el("div", { class: "bib-preview-bottom" });
  const previewBox = el("div", { class: "bib-preview" }, [previewTop, previewNum, previewBottom]);

  function updatePreview() {
    const d0 = shooters[0];
    previewNum.textContent = String(d0.start_num ?? "").trim() || "?";

    const topLines = [];
    if (opts.competition && store.competitionName) topLines.push(store.competitionName);
    const meta = [];
    if (opts.discipline && store.disciplineText()) meta.push(store.disciplineText());
    if (opts.date) {
      meta.push(store.eventDate ? new Date(store.eventDate + "T00:00:00").toLocaleDateString("cs-CZ") : new Date().toLocaleDateString("cs-CZ"));
    }
    if (opts.venue && store.venue) meta.push(store.venue);
    if (meta.length) topLines.push(meta.join(" • "));
    previewTop.textContent = topLines.join(" — ");

    const bottomLines = [];
    if (opts.name) {
      const fullName = `${d0.surname || ""} ${d0.name || ""}`.trim();
      if (fullName) bottomLines.push(fullName);
    }
    if (opts.category && d0.category) bottomLines.push(d0.category);
    previewBottom.textContent = bottomLines.join(" • ");
  }

  const checkboxRows = FIELD_DEFS.map(([key, label]) => {
    const input = el("input", {
      type: "checkbox", id: `bib-${key}`, checked: opts[key],
      onchange: (e) => { opts[key] = e.target.checked; updatePreview(); },
    });
    return el("div", { class: "checkbox-row" }, [input, el("label", { for: `bib-${key}`, text: t(label) })]);
  });

  const sheet = el("div", { class: "sheet" }, [
    el("div", { class: "row-between" }, [
      el("h2", { style: "color:var(--accent);font-size:18px", text: t("🎽 Startovní čísla") }),
      el("button", { class: "btn-ghost btn-sm", text: t("Zavřít ✕"), onclick: () => overlay.remove() }),
    ]),
    el("p", { style: "color:var(--text-muted);font-size:13px;margin:2px 0 12px", text: `${t("Střelců:")} ${shooters.length}` }),
    previewBox,
    el("p", { style: "color:var(--text-muted);font-size:12px;margin:10px 0 4px", text: t("Co ještě přidat k číslu:") }),
    ...checkboxRows,
    el("div", { class: "btn-row", style: "margin-top:14px" }, [
      el("button", {
        class: "btn-primary", text: t("🖨 Generovat a stáhnout PDF"),
        onclick: () => {
          overlay.remove();
          exportBibNumbersPdf(shooters, opts);
          toast(t("PDF startovních čísel vygenerováno ✔"));
        },
      }),
      el("button", { class: "btn-ghost", text: t("Zrušit"), onclick: () => overlay.remove() }),
    ]),
  ]);

  updatePreview();
  overlay.append(sheet);
  document.body.append(overlay);
}
