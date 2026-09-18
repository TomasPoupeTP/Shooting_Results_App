import { store } from "../state.js";
import { el } from "../dom.js";
import { navigate } from "../main.js";

function sortExplanation() {
  const dir = store.app.sortReverseDirection
    ? "od 1. položky směrem k poslední"
    : "od poslední položky směrem k 1. (výchozí nastavení)";
  const faultLine = store.app.sortUseFault
    ? "<li>Pokud mají shodné i skóre položky, rozhoduje pozice <strong>první chyby</strong> v té položce (sloupec „1.Ch.“) - čím později chyba přišla, tím lépe.</li>"
    : "<li>Pozice první chyby se při řazení nezohledňuje (vypnuto v Nastavení appky) - bere se v potaz jen skóre položek.</li>";

  return `
    <p>Pořadí se počítá takto, dokud nenajde rozdíl:</p>
    <ol>
      <li>Vyšší <strong>celkový součet</strong> vyhrává.</li>
      <li>Při shodě součtu se porovnávají jednotlivé položky ${dir}.</li>
      ${faultLine}
      <li>Pokud shoda přetrvá i po porovnání všech položek, je potřeba <strong>rozstřel</strong> - zadej počet zásahů z rozstřelu do sloupce „Rozstřel“ na Výsledcích (nebo „Rozstřel“ ve Finále) a klikni na „Vyhodnotit rozstřel“. Appka pak srovnané střelce podle rozstřelu přeřadí (vyšší číslo = lepší).</li>
    </ol>
    <p>Appka barevně zvýrazní řádky, kde je shoda potřeba vyřešit rozstřelem (oranžově), a prvních 6 v pořadí (zeleně).</p>
    <p>Tohle chování (směr porovnávání položek, zohlednění chyby) si můžeš upravit v <strong>Nastavení appky</strong>.</p>
  `;
}

export function renderHelp(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: "ℹ️ Nápověda" }),
    el("button", { class: "btn-ghost btn-sm", text: "← Zpět", onclick: () => navigate("home") }),
  ]);

  const view = el("div", { class: "view help-block" });

  const html = `
    <h3>🎯 Jak appku používat</h3>
    <ol>
      <li><strong>Soutěž</strong> - vyplň název, disciplínu, počet položek, max. skóre/položku a případně zapni Kategorie a Finále.</li>
      <li><strong>Los</strong> - přidej střelce (příjmení, jméno, případně prefix pro rozřazení do šestic), pak buď seřaď ručně, nebo použij <em>Auto-Los</em> (rozdělí střelce do šestic tak, aby dva se stejným prefixem nebyli spolu). Tlačítkem <em>Použít v zápisu</em> se seznam přenese do Zápisu.</li>
      <li><strong>Zápis</strong> - zapisuj skóre a pozici první chyby pro každou položku. Součet se počítá automaticky. Tlačítko <em>Prezentace</em> zobrazí živě aktualizovanou tabulku pořadí na velkou obrazovku.</li>
      <li><strong>Výsledky</strong> - tlačítko <em>Seřadit →</em> na Zápisu spočítá pořadí. Tady se řeší i rozstřel (viz níže) a tiskne PDF.</li>
      <li><strong>Finále</strong> (pokud je zapnuté) - automaticky vybere top 6 (+ shody), zadáš finálovou položku, appka spočítá celkový součet kvalifikace + finále.</li>
    </ol>

    <h3>🏆 Jak funguje řazení a rozstřel</h3>
    <div id="sort-explanation">${sortExplanation()}</div>

    <h3>💾 Ukládání dat</h3>
    <p>Appka nemá server - všechno se ukládá jen v tomto telefonu/prohlížeči (localStorage). Appka umí držet víc soutěží najednou (přepínání v menu <em>Více → Přepnout soutěže</em>). Pro zálohu nebo přenos na jiné zařízení použij <em>Export JSON</em> / <em>Import JSON</em> v nastavení soutěže.</p>
    <p>Appka funguje i <strong>offline</strong> (včetně generování PDF) díky service workeru - po prvním načtení se dá používat i bez signálu.</p>

    <h3>© Autorská práva</h3>
    <p>Shooting Results App - PWA verze.<br>© 2026 Tomáš Poupě. Všechna práva vyhrazena.</p>
  `;
  const content = el("div");
  content.innerHTML = html;

  view.append(content);
  root.append(topbar, view);
}
