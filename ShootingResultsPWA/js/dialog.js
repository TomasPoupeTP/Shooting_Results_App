// Malý interaktivní výběrový dialog (bottom-sheet) - vrací Promise s hodnotou
// zvolené možnosti, nebo null když uživatel zavře/zruší.
import { el } from "./dom.js";
import { t } from "./i18n.js";

export function choiceDialog(title, options) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve(value);
    };
    const overlay = el("div", {
      class: "sheet-overlay",
      onclick: (e) => { if (e.target === overlay) finish(null); },
    });
    const sheet = el("div", { class: "sheet" }, [
      el("h2", { style: "color:var(--accent);font-size:18px;margin-bottom:12px", text: title }),
      ...options.map((opt) =>
        el("button", { class: "sheet-btn", onclick: () => finish(opt.value) }, opt.label)
      ),
      el("button", { class: "btn-ghost", style: "width:100%;margin-top:10px", text: t("Zrušit"), onclick: () => finish(null) }),
    ]);
    overlay.append(sheet);
    document.body.append(overlay);
  });
}
