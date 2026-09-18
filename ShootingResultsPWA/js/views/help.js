import { store } from "../state.js";
import { el } from "../dom.js";
import { navigate } from "../main.js";

function sortExplanationHtml() {
  const steps = store.describeSortConfig();
  const items = steps.map((s) => `<li>${s}</li>`).join("");
  return `
    <p>Pořadí se počítá krok za krokem, dokud nenajde rozdíl mezi střelci:</p>
    <ol>${items}</ol>
    <p>Aplikace barevně zvýrazní řádky, kde je shoda potřeba vyřešit rozstřelem (oranžově), a prvních 6 v pořadí (zeleně).</p>
    <p>Pořadí kroků, jejich zapnutí i směr procházení položek si můžeš plně nastavit v <strong>Nastavení aplikace</strong> (šipkami nahoru/dolů přeskládáš kroky, zaškrtávátkem je vypneš).</p>
  `;
}

async function fetchVersion() {
  try {
    const res = await fetch("version.json", { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

export function renderHelp(root) {
  const topbar = el("div", { class: "topbar" }, [
    el("h1", { text: "ℹ️ Nápověda" }),
    el("button", { class: "btn-ghost btn-sm", text: "← Zpět", onclick: () => navigate("home") }),
  ]);

  const view = el("div", { class: "view help-block" });

  const html = `
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

    <h3>© Autorská práva</h3>
    <p>Shooting Results - PWA verze.<br>© 2026 Tomáš Poupě. Všechna práva vyhrazena.</p>
    <p id="version-line" style="color:var(--text-muted);font-size:12px">Verze: načítám…</p>
  `;
  const content = el("div");
  content.innerHTML = html;

  view.append(content);
  root.append(topbar, view);

  fetchVersion().then((v) => {
    const line = content.querySelector("#version-line");
    if (!line) return;
    if (v && v.commit) {
      const date = v.date ? new Date(v.date).toLocaleDateString("cs-CZ") : "";
      line.textContent = `Verze: ${v.commit}${date ? " · " + date : ""}`;
    } else {
      line.textContent = "Verze: vývojová (mimo nasazení z GitHub Pages)";
    }
  });
}
