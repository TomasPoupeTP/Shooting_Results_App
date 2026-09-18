import { store } from "../state.js";
import { el } from "../dom.js";
import { navigate } from "../main.js";
import { t } from "../i18n.js";

export function openMenu() {
  const overlay = el("div", {
    class: "sheet-overlay",
    onclick: (e) => { if (e.target === overlay) overlay.remove(); },
  });

  const go = (view) => { overlay.remove(); navigate(view); };

  const sheet = el("div", { class: "sheet" }, [
    el("div", { class: "row-between" }, [
      el("h2", { style: "color:var(--accent);font-size:18px", text: t("☰ Více") }),
      el("button", { class: "btn-ghost btn-sm", text: t("Zavřít ✕"), onclick: () => overlay.remove() }),
    ]),
    el("p", { style: "color:var(--text-muted);font-size:13px;margin:2px 0 14px", text: `${t("Aktuální soutěž:")} ${store.competitionName || t("(bez názvu)")}` }),
    el("button", { class: "sheet-btn", onclick: () => go("competitions") }, [
      el("span", { class: "icon", text: "🔀" }),
      el("span", {}, `${t("Přepnout / spravovat soutěže")} (${store.competitions.length})`),
    ]),
    el("button", { class: "sheet-btn", onclick: () => go("appsettings") }, [
      el("span", { class: "icon", text: "⚙️" }),
      el("span", {}, t("Nastavení aplikace")),
    ]),
    el("button", { class: "sheet-btn", onclick: () => go("help") }, [
      el("span", { class: "icon", text: "ℹ️" }),
      el("span", {}, t("Nápověda a o aplikaci")),
    ]),
  ]);

  overlay.append(sheet);
  document.body.append(overlay);
}
