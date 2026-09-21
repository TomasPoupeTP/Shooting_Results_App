import { store } from "../state.js";
import { el } from "../dom.js";
import { navigate, isElectron } from "../main.js";
import { t } from "../i18n.js";

function sortExplanationHtml() {
  const steps = store.describeSortConfig(t);
  const items = steps.map((s) => `<li>${s}</li>`).join("");
  return `
    <p>${t("Pořadí se počítá krok za krokem, dokud nenajde rozdíl mezi střelci:")}</p>
    <ol>${items}</ol>
    <p>${t("Aplikace barevně zvýrazní řádky, kde je shoda potřeba vyřešit rozstřelem (oranžově), a prvních 6 v pořadí (zeleně).")}</p>
    <p>${t("Pořadí kroků, jejich zapnutí i směr procházení položek si můžeš plně nastavit v")} <strong>${t("Nastavení aplikace")}</strong> ${t("(šipkami nahoru/dolů přeskládáš kroky, zaškrtávátkem je vypneš).")}</p>
  `;
}

async function fetchVersion() {
  try {
    const res = await fetch("version.json", { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

function helpBodyHtml() {
  const isEn = store.app.language === "en";
  if (isEn) {
    return `
      <h3>🎯 How to use the app</h3>
      <ol>
        <li><strong>Competition</strong> - fill in the name, discipline, number of rounds, max. score/round and optionally enable Categories and Final.</li>
        <li><strong>Draw</strong> - add shooters (surname, name, optionally a prefix for grouping into sixes), then either sort manually or use <em>Auto-draw</em> (splits shooters into sixes so that two with the same prefix aren't together). The <em>Use in scoring</em> button transfers the list to Scoring.</li>
        <li><strong>Scoring</strong> - enter the score and first-miss position for each round. The total is calculated automatically. The <em>Presentation</em> button shows a live-updating ranking table on a big screen.</li>
        <li><strong>Results</strong> - the <em>Sort →</em> button on Scoring calculates the ranking. This is also where shoot-offs are resolved (see below) and PDFs are printed.</li>
        <li><strong>Final</strong> (if enabled) - automatically picks the top 6 (+ ties), you enter the final round, the app calculates the total of qualification + final.</li>
      </ol>

      <h3>🏆 How ranking and shoot-offs work</h3>
      <div id="sort-explanation">${sortExplanationHtml()}</div>

      <h3>💾 Data storage</h3>
      <p>The app has no server - everything is stored only on this phone/browser (localStorage). The app can hold multiple competitions at once (switch via the menu <em>More → Switch competitions</em>). To back up or transfer to another device, use <em>Export JSON</em> / <em>Import JSON</em> in the competition settings.</p>
      <p>The app also works <strong>offline</strong> (including PDF generation) thanks to a service worker - after the first load it can be used even without a signal.</p>
      ${isElectron ? `<p>The desktop app also automatically saves a timestamped backup (every few minutes, whenever something changes) to <code>Documents\\Shooting Results\\Zálohy</code> - the last 30 backups are kept.</p>` : ""}

      <h3>© Copyright</h3>
      <p>Shooting Results - PWA version.<br>© 2026 Tomáš Poupě. All rights reserved.</p>
      <p id="version-line" style="color:var(--text-muted);font-size:12px">${t("Verze: načítám…")}</p>
    `;
  }
  return `
    <h3>🎯 Jak aplikaci používat</h3>
    <ol>
      <li><strong>Soutěž</strong> - vyplň název, disciplínu, počet položek, max. skóre/položku a případně zapni Kategorie a Finále.</li>
      <li><strong>Los</strong> - přidej střelce (příjmení, jméno, případně prefix pro rozřazení do šestic), pak buď seřaď ručně, nebo použij <em>Auto-Los</em> (rozdělí střelce do šestic tak, aby dva se stejným prefixem nebyli spolu). Tlačítkem <em>Použít v zápisu</em> se seznam přenese do Zápisu.</li>
      <li><strong>Zápis</strong> - zapisuj skóre a pozici první chyby pro každou položku. Součet se počítá automaticky. Tlačítko <em>Prezentace</em> zobrazí živě aktualizovanou tabulku pořadí na velkou obrazovku.</li>
      <li><strong>Výsledky</strong> - tlačítko <em>Seřadit →</em> na Zápisu spočítá pořadí. Tady se řeší i rozstřel (viz níže) a tiskne PDF.</li>
      <li><strong>Finále</strong> (pokud je zapnuté) - automaticky vybere top 6 (+ shody), zadáš finálovou položku, aplikace spočítá celkový součet kvalifikace + finále.</li>
    </ol>

    <h3>🏆 Jak funguje řazení a rozstřel</h3>
    <div id="sort-explanation">${sortExplanationHtml()}</div>

    <h3>💾 Ukládání dat</h3>
    <p>Aplikace nemá server - všechno se ukládá jen v tomto telefonu/prohlížeči (localStorage). Aplikace umí držet víc soutěží najednou (přepínání v menu <em>Více → Přepnout soutěže</em>). Pro zálohu nebo přenos na jiné zařízení použij <em>Export JSON</em> / <em>Import JSON</em> v nastavení soutěže.</p>
    <p>Aplikace funguje i <strong>offline</strong> (včetně generování PDF) díky service workeru - po prvním načtení se dá používat i bez signálu.</p>
    ${isElectron ? `<p>Desktopová appka navíc automaticky (jednou za pár minut, kdykoliv se něco změní) ukládá časovanou zálohu do <code>Dokumenty\\Shooting Results\\Zálohy</code> - posledních 30 záloh zůstává zachováno.</p>` : ""}

    <h3>© Autorská práva</h3>
    <p>Shooting Results - PWA verze.<br>© 2026 Tomáš Poupě. Všechna práva vyhrazena.</p>
    <p id="version-line" style="color:var(--text-muted);font-size:12px">${t("Verze: načítám…")}</p>
  `;
}

export function renderHelp(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: t("ℹ️ Nápověda") }),
    el("button", { class: "btn-ghost btn-sm", text: t("← Zpět"), onclick: () => navigate("home") }),
  ]);

  const view = el("div", { class: "view help-block" });

  const content = el("div");
  content.innerHTML = helpBodyHtml();

  view.append(content);
  root.append(topbar, view);

  fetchVersion().then((v) => {
    const line = content.querySelector("#version-line");
    if (!line) return;
    if (v && v.commit) {
      const date = v.date ? new Date(v.date).toLocaleDateString("cs-CZ") : "";
      line.textContent = `${t("Verze:")} ${v.commit}${date ? " · " + date : ""}`;
    } else {
      line.textContent = t("Verze: vývojová (mimo nasazení z GitHub Pages)");
    }
  });
}
