// Export do PDF (přímo v prohlížeči, offline) - jsPDF + AutoTable,
// s vendorovaným fontem DejaVu Sans kvůli české diakritice.
import { store, num } from "./state.js";
import { catShort } from "./constants.js";

const FONT = "DejaVuSans";

function newDoc(orientation = "portrait") {
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation });
  doc.addFileToVFS("DejaVuSans-normal.ttf", window.DEJAVU_SANS_NORMAL_B64);
  doc.addFont("DejaVuSans-normal.ttf", FONT, "normal");
  doc.addFileToVFS("DejaVuSans-bold.ttf", window.DEJAVU_SANS_BOLD_B64);
  doc.addFont("DejaVuSans-bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
  return doc;
}

function cs(v) {
  if (v === "" || v === undefined || v === null) return "";
  const n = num(v, NaN);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10000) / 10000);
}

function pdfHeader(doc, extra) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;
  doc.setFont(FONT, "bold"); doc.setFontSize(14);
  doc.text("Shooting Results App" + (extra ? `  –  ${extra}` : ""), pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text(store.competitionName || "(bez názvu)", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFont(FONT, "normal"); doc.setFontSize(9);
  const dateStr = store.eventDate
    ? new Date(store.eventDate + "T00:00:00").toLocaleDateString("cs-CZ")
    : new Date().toLocaleDateString("cs-CZ");
  const parts = [store.disciplineText(), `Max. ${store.maxScore} terčů/položku`, dateStr];
  if (store.venue) parts.push(store.venue);
  doc.text(parts.join("  •  "), pageWidth / 2, y, { align: "center" });
  return y + 6;
}

/** Podpisový řádek hlavního rozhodčího pod tabulkou (jen pokud je jméno vyplněné). */
function pdfSignature(doc, y) {
  if (!store.refereeName) return y;
  const pageHeight = doc.internal.pageSize.getHeight();
  const sigY = Math.min(y + 16, pageHeight - 14);
  doc.setFont(FONT, "normal"); doc.setFontSize(9); doc.setTextColor(0);
  doc.text(`Hlavní rozhodčí: ${store.refereeName}`, 12, sigY);
  doc.text("Podpis: ___________________________", 12, sigY + 8);
  return sigY + 8;
}

function resultsHead(ni) {
  const head = ["Poř.", "Příjmení", "Jméno", "Kat."];
  for (let i = 1; i <= ni; i++) head.push(`Pol. ${i}`);
  head.push("Součet", "Fin.pol.", "Celkem");
  return head;
}

function resultsRow(d, idx, ni) {
  const row = [String(idx + 1), d.surname || "", d.name || "", catShort(d.category || "")];
  for (let i = 1; i <= ni; i++) row.push(cs(d[`item${i}_score`]));
  const base = num(d.total, 0);
  const fs = d.finale_score ?? "";
  const full = base + num(fs, 0);
  row.push(cs(base), cs(fs), cs(full));
  return row;
}

function addResultsTable(doc, y, data, ni) {
  const head = resultsHead(ni);
  const body = data.map((d, i) => resultsRow(d, i, ni));
  doc.autoTable({
    startY: y,
    head: [head],
    body,
    styles: { font: FONT, fontSize: 8, halign: "center", valign: "middle", lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1.4 },
    headStyles: { font: FONT, fontStyle: "bold", fillColor: [10, 10, 10], textColor: [255, 255, 255], fontSize: 8.5 },
    alternateRowStyles: { fillColor: [242, 242, 242] },
    columnStyles: { 1: { halign: "left" }, 2: { halign: "left" } },
    margin: { left: 12, right: 12 },
    didParseCell(hook) {
      if (hook.section === "body" && hook.row.index < 6) {
        hook.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell(hook) {
      if (hook.section === "body" && hook.row.index === 5 && data.length > 6) {
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(hook.cell.x, hook.cell.y + hook.cell.height, hook.cell.x + hook.cell.width, hook.cell.y + hook.cell.height);
      }
    },
  });
  return doc.lastAutoTable.finalY;
}

function groupByCategory(data) {
  const cats = [...new Set(data.map((d) => d.category || ""))].sort();
  return cats.map((cat) => ({ cat, group: data.filter((d) => (d.category || "") === cat) })).filter((g) => g.group.length);
}

export function exportResultsPdf() {
  const doc = newDoc();
  let y = pdfHeader(doc, "Výsledky");
  const ni = store.numItems;
  if (store.useCategories && store.rankingMode === "byCategory") {
    for (const { cat, group } of groupByCategory(store.sortedResults)) {
      doc.setFont(FONT, "bold"); doc.setFontSize(10);
      doc.text(cat || "Bez kategorie", 12, y + 4);
      y = addResultsTable(doc, y + 7, group, ni) + 6;
    }
  } else {
    y = addResultsTable(doc, y, store.sortedResults, ni);
  }
  pdfSignature(doc, y);
  doc.save(pdfFileName("vysledky"));
}

export function exportFinalePdf() {
  const doc = newDoc();
  let y = pdfHeader(doc, "Finále – Celkové výsledky");
  const ni = store.numItems;

  const finalistKeys = new Set(store.finaleFinalists.map((d) => (d.surname || "") + (d.name || "")));
  const combined = store.finaleFinalists.map((d) => ({ ...d }));
  for (const d of store.sortedResults) {
    const key = (d.surname || "") + (d.name || "");
    if (!finalistKeys.has(key)) combined.push({ ...d, finale_score: "" });
  }

  if (store.useCategories && store.rankingMode === "byCategory") {
    for (const { cat, group } of groupByCategory(combined)) {
      doc.setFont(FONT, "bold"); doc.setFontSize(10);
      doc.text(cat || "Bez kategorie", 12, y + 4);
      y = addResultsTable(doc, y + 7, group, ni) + 6;
    }
  } else {
    y = addResultsTable(doc, y, combined, ni);
  }

  doc.setFont(FONT, "normal"); doc.setFontSize(7); doc.setTextColor(120);
  doc.text("* Fin.pol. = finálová položka;  Celkem = součet kvalifikace + finálová položka", 12, y + 6);
  pdfSignature(doc, y + 6);
  doc.save(pdfFileName("finale"));
}

export function exportLotteryPdf() {
  const doc = newDoc();
  let y = pdfHeader(doc, "Startovní listina");
  const body = store.lotteryList.map((d, i) => [String(i + 1), d.surname || "", d.name || "", ""]);
  doc.autoTable({
    startY: y,
    head: [["Poř. č.", "Příjmení", "Jméno", "Start. č."]],
    body,
    styles: { font: FONT, fontSize: 9, halign: "center", valign: "middle", lineColor: [160, 160, 160], lineWidth: 0.3, cellPadding: 1.6 },
    headStyles: { font: FONT, fontStyle: "bold", fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0] },
    columnStyles: { 1: { halign: "left" }, 2: { halign: "left" } },
    margin: { left: 15, right: 15 },
  });
  doc.save(pdfFileName("startovni_listina"));
}

// ── Položkové listy (score sheets pro ruční zápis na střelnici) ──────────
// A4 naležato, jedna skupina (šestice) = jedna strana, v ní jedna mini-
// tabulka na střelce: jmenovka, hlavička s očíslovanými terči a řádek na
// položku (kolo) pro ruční zápis zásahů - viz shooting_results_app.py.
const SHEET_ROW_H = { banner: 5.5, header: 4.0, item: 6.2 };

function drawShooterSheet(doc, startY, slot, ni, mx, colWidths, marginL, marginR) {
  const ncols = mx + 3;
  const banner = slot.empty
    ? `St. č. ${slot.start}   ·   ………………………………………………………`
    : `St. č. ${slot.start}   ·   ${slot.name}`;

  const body = [];
  body.push([{
    content: banner, colSpan: ncols,
    styles: { halign: "left", fontStyle: "bold", fontSize: 10, fillColor: [232, 232, 232], minCellHeight: SHEET_ROW_H.banner, cellPadding: { top: 1, right: 1, bottom: 1, left: 2 } },
  }]);

  const headerCells = [{ content: "Pol.", styles: { fontStyle: "bold" } }];
  for (let i = 1; i <= mx; i++) headerCells.push({ content: String(i) });
  headerCells.push({ content: "Za položku" }, { content: "Součet" });
  body.push(headerCells.map((c) => ({ ...c, styles: { ...(c.styles || {}), fillColor: [242, 242, 242], fontSize: 6.5, minCellHeight: SHEET_ROW_H.header } })));

  for (let it = 1; it <= ni; it++) {
    const row = [{ content: String(it), styles: { fontStyle: "bold", fontSize: 8, minCellHeight: SHEET_ROW_H.item } }];
    for (let b = 0; b < mx; b++) row.push({ content: "", styles: { minCellHeight: SHEET_ROW_H.item } });
    row.push({ content: "", styles: { minCellHeight: SHEET_ROW_H.item } }); // Za položku
    if (it === 1) row.push({ content: "", rowSpan: ni, styles: { minCellHeight: SHEET_ROW_H.item } }); // Součet (přes všechny položky)
    body.push(row);
  }

  const columnStyles = {};
  colWidths.forEach((w, i) => { columnStyles[i] = { cellWidth: w }; });

  doc.autoTable({
    startY,
    body,
    theme: "grid",
    styles: {
      font: FONT, fontSize: 6.5, halign: "center", valign: "middle",
      lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], cellPadding: 0.6,
    },
    columnStyles,
    margin: { left: marginL, right: marginR, top: 10, bottom: 8 },
  });

  return doc.lastAutoTable.finalY;
}

/** Vykreslí položkové listy - `rounds` je pole skupin, každá skupina pole
 * "slotů" ({start, name, empty}); jedna skupina = jedna strana A4 naležato. */
export function exportItemSheetsPdf(rounds, ni, mx, titleForRound, filenameKind) {
  const doc = newDoc("landscape");
  const marginL = 10, marginT = 10, marginR = 10;
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - marginL - marginR;
  const mxClamped = Math.max(1, Math.min(mx, 60));
  const idxW = 8, sumW = 14, totW = 15;
  const boxW = Math.max((usableW - idxW - sumW - totW) / mxClamped, 3);
  const colWidths = [idxW, ...Array(mxClamped).fill(boxW), sumW, totW];

  rounds.forEach((slots, ri) => {
    if (ri > 0) doc.addPage();
    let y = marginT;
    doc.setFont(FONT, "bold"); doc.setFontSize(14); doc.setTextColor(0);
    doc.text(titleForRound(ri + 1), marginL, y + 4);
    y += 9;
    slots.forEach((slot) => {
      y = drawShooterSheet(doc, y, slot, ni, mxClamped, colWidths, marginL, marginR) + 1.8;
    });
  });

  doc.save(pdfFileName(filenameKind));
}

function pdfFileName(kind) {
  const safe = (store.competitionName || "soutez").replace(/[^\p{L}\p{N}_-]+/gu, "_");
  const date = new Date().toISOString().slice(0, 10);
  return `${safe}_${kind}_${date}.pdf`;
}
