import { el } from "../dom.js";
import { navigate } from "../main.js";
import { t } from "../i18n.js";

const RELEASE_URL = "https://github.com/TomasPoupeTP/Shooting_Results_App/releases/tag/desktop-latest";
const DOWNLOAD_URL = "https://github.com/TomasPoupeTP/Shooting_Results_App/releases/latest/download/ShootingResults-Setup.exe";

export function renderDesktop(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: t("🖥️ Desktop aplikace pro Windows") }),
    el("button", { class: "btn-ghost btn-sm", text: t("← Zpět"), onclick: () => navigate("home") }),
  ]);

  const view = el("div", { class: "view" });

  view.append(
    el("div", { class: "card" }, [
      el("p", { style: "margin:0 0 10px", text: t("Appka jde nainstalovat i jako samostatná desktopová (offline) aplikace pro Windows - žádný prohlížeč ani internet během používání není potřeba.") }),
      el("p", { style: "color:var(--text-muted);font-size:13px;margin:0", text: t("Odkaz vždy vede na nejnovější sestavenou verzi (automaticky se aktualizuje při každém nasazení).") }),
    ]),
    el("div", { class: "btn-row" }, [
      el("a", {
        href: DOWNLOAD_URL, target: "_blank", rel: "noopener",
        class: "btn-primary", style: "text-decoration:none;display:inline-flex;align-items:center;justify-content:center",
        text: t("⬇️ Stáhnout ShootingResults-Setup.exe"),
      }),
      el("a", {
        href: RELEASE_URL, target: "_blank", rel: "noopener",
        class: "btn-ghost", style: "text-decoration:none;display:inline-flex;align-items:center;justify-content:center",
        text: t("Stránka verze na GitHubu"),
      }),
    ]),
    el("p", { class: "sub", style: "color:var(--text-muted);font-size:12px", text: t("Po stažení spusť instalátor a postupuj podle průvodce. Windows může u nepodepsané appky zobrazit upozornění \"Neznámý vydavatel\" - to je normální, stačí potvrdit spuštění.") }),
  );

  root.append(topbar, view);
}
