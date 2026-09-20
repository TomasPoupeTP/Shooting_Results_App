// Jednoduché i18n - t(cs) vrátí anglický překlad, pokud je zapnutá angličtina
// a překlad existuje, jinak vrátí původní český text beze změny (bezpečný
// fallback, nic nikdy nespadne kvůli chybějícímu klíči).
import { store } from "./state.js";

const EN = {
  // Tabbar
  "Soutěž": "Competition",
  "Los": "Draw",
  "Zápis": "Scoring",
  "Výsledky": "Results",
  "Finále": "Final",
  "Více": "More",

  // Home / Soutěž
  "Shooting Results": "Shooting Results",
  "Shooting Results App": "Shooting Results App",
  "Název soutěže": "Competition name",
  "např. Krajský přebor 2026": "e.g. Regional Championship 2026",
  "Počet střelců": "Number of shooters",
  "Počet položek (kol)": "Number of rounds",
  "Disciplína": "Discipline",
  "+ Přidat vlastní…": "+ Add custom…",
  "Max. terčů v položce": "Max. targets per round",
  "Hlavní rozhodčí": "Chief referee",
  "Jméno": "Name",
  "Datum konání": "Event date",
  "Místo konání": "Venue",
  "např. Střelnice Brno": "e.g. Brno Shooting Range",
  "Finále": "Final",
  "Používat kategorie": "Use categories",
  "🎲 Los": "🎲 Draw",
  "✏️ Zápis": "✏️ Scoring",
  "🆕 Nová soutěž": "🆕 New competition",
  "⬇️ Exportovat JSON": "⬇️ Export JSON",
  "⬆️ Importovat JSON": "⬆️ Import JSON",
  "Vyplň nejdřív název soutěže": "Fill in the competition name first",
  "Nová soutěž vytvořena ✔": "New competition created ✔",
  "Soutěž načtena ✔": "Competition loaded ✔",
  "Víc soutěží najednou, vzhled a další nastavení najdeš v menu ☰ Více.":
    "You'll find multiple competitions, appearance and other settings in the ☰ More menu.",

  // Los (lottery)
  "Příjmení": "Surname",
  "Prefix (skupina)": "Prefix (group)",
  "+ Přidat": "+ Add",
  "Vyplň příjmení a jméno": "Fill in surname and name",
  "Seřadit dle čísel": "Sort by numbers",
  "🎲 Auto-Los": "🎲 Auto-draw",
  "🖨 Tisk listiny": "🖨 Print list",
  "✓ Použít v zápisu": "✓ Use in scoring",
  "Nejdřív přidej střelce": "Add shooters first",
  "Zatím žádní střelci. Přidej je výše.": "No shooters yet. Add them above.",
  "Start.č": "Start #",
  "Akce": "Action",
  "Nelze rozlosovat: nějaký prefix má víc střelců než je počet šestic. Uber je nebo přidej další účastníky.":
    "Cannot draw: some prefix has more shooters than the number of groups of six. Remove some or add more participants.",
  "střelců vloženo do zápisu": "shooters added to scoring",

  // Entry (Zápis)
  "Kategorie": "Categories",
  "+ Střelec": "+ Shooter",
  "− Střelec": "− Shooter",
  "+ Položka": "+ Round",
  "− Položka": "− Round",
  "💾 Uložit": "💾 Save",
  "🖥 Prezentace": "🖥 Presentation",
  "Seřadit →": "Sort →",
  "Součet": "Total",
  "Kat.": "Cat.",
  "Jak řadit výsledky?": "How should results be ranked?",
  "Celkově (jedno pořadí přes všechny kategorie)": "Overall (one ranking across all categories)",
  "Po kategoriích (samostatné pořadí a finále pro každou kategorii)": "By category (separate ranking and final for each category)",
  "Zrušit": "Cancel",

  // Results / Finale
  "🏆": "🏆", "🏅": "🏅",
  "← Zápis": "← Scoring",
  "← Výsledky": "← Results",
  "← Zpět": "← Back",
  "Vyhodnotit rozstřel": "Evaluate shoot-off",
  "Finále →": "Final →",
  "🖨 Tisk PDF": "🖨 Print PDF",
  "📊 Top Statistika": "📊 Top Stats",
  "Poř.": "Rank",
  "Rozstřel": "Shoot-off",
  "Top 6": "Top 6",
  "Shodné výsledky – nutný rozstřel": "Tied results - shoot-off needed",
  "Bez kategorie": "No category",
  "Zatím žádná data. Vyplň nejdřív Zápis.": "No data yet. Fill in Scoring first.",
  "Seřadit finále": "Sort final",
  "🎯 List finále": "🎯 Final sheet",
  "Fin.pol.": "Fin. round",
  "Celkem": "Total",
  "Zatím žádní finalisté. Nejdřív seřaď výsledky v Zápisu.": "No finalists yet. Sort the results in Scoring first.",

  // Top stats
  "📊 Top Statistika": "📊 Top Stats",
  "Zavřít ✕": "Close ✕",
  "Střelci s plnou položkou (maximum": "Shooters with a perfect round (maximum",
  ") - alespoň jednou": ") - at least once",
  "Celkem střelců s plnou položkou:": "Total shooters with a perfect round:",
  "Zatím žádný střelec nedosáhl plné položky.": "No shooter has achieved a perfect round yet.",
  "Plných pol.": "Perfect rounds",
  "Které položky": "Which rounds",

  // Menu
  "☰ Více": "☰ More",
  "Aktuální soutěž:": "Current competition:",
  "Přepnout / spravovat soutěže": "Switch / manage competitions",
  "Nastavení aplikace": "App settings",
  "Nápověda a o aplikaci": "Help and about",

  // Competitions
  "🔀 Soutěže": "🔀 Competitions",
  "Aplikace umí držet víc rozpracovaných/dokončených soutěží najednou. Klikni na soutěž pro přepnutí.":
    "The app can hold multiple in-progress/completed competitions at once. Click a competition to switch to it.",
  "aktivní": "active",
  "Naposledy upraveno:": "Last edited:",
  "Musí zůstat aspoň jedna soutěž": "At least one competition must remain",
  "Nový název soutěže:": "New competition name:",
  "Název nové soutěže:": "Name of the new competition:",
  "+ Nová soutěž": "+ New competition",
  "Přepnuto ✔": "Switched ✔",
  "Soutěž vytvořena ✔": "Competition created ✔",

  // App settings
  "⚙️ Nastavení aplikace": "⚙️ App settings",
  "Vzhled": "Appearance",
  "Podle systému telefonu": "Follow system",
  "Tmavý": "Dark",
  "Světlý": "Light",
  "Jazyk": "Language",
  "Čeština": "Czech",
  "Angličtina": "English",
  "Vlastní disciplíny": "Custom disciplines",
  "Název nové disciplíny": "New discipline name",
  "Zatím žádné vlastní disciplíny.": "No custom disciplines yet.",
  "Tahle disciplína už existuje": "This discipline already exists",
  "Vlastní kategorie": "Custom categories",
  "Název kategorie": "Category name",
  "Zkratka (1-3 znaky)": "Abbreviation (1-3 chars)",
  "Zatím žádné vlastní kategorie.": "No custom categories yet.",
  "zkratka:": "abbr.:",
  "Tahle kategorie už existuje": "This category already exists",
  "Kritéria řazení při shodě": "Tie-break criteria",
  "Položky procházet od 1. k poslední (místo od poslední k 1.)": "Go through rounds from 1st to last (instead of last to 1st)",
  "Celkový součet (vždy první)": "Total score (always first)",
  "Rozstřel (ruční zadání, pokud shoda přetrvá)": "Shoot-off (manual entry if a tie remains)",
  "Skóre položek": "Round scores",
  "Pozice první chyby (1.Ch.)": "First-miss position (1.Ch.)",
  "(vypnuto)": "(off)",
  "Aktuální postup řazení:": "Current ranking procedure:",
  "Výchozí hodnoty pro nové soutěže": "Defaults for new competitions",
  "Výchozí disciplína": "Default discipline",
  "Výchozí max. terčů/položku": "Default max. targets/round",
  "Výchozí jméno hlavního rozhodčího": "Default chief referee name",
  "Uložit výchozí hodnoty": "Save defaults",
  "Uloženo ✔": "Saved ✔",

  // Help
  "ℹ️ Nápověda": "ℹ️ Help",
  "🎯 Jak aplikaci používat": "🎯 How to use the app",
  "🏆 Jak funguje řazení a rozstřel": "🏆 How ranking and shoot-offs work",
  "💾 Ukládání dat": "💾 Data storage",
  "© Autorská práva": "© Copyright",
  "Verze: načítám…": "Version: loading…",
  "Verze:": "Version:",
  "Verze: vývojová (mimo nasazení z GitHub Pages)": "Version: development build (not deployed via GitHub Pages)",
  "Pořadí se počítá krok za krokem, dokud nenajde rozdíl mezi střelci:":
    "The ranking is calculated step by step until a difference between shooters is found:",
  "Aplikace barevně zvýrazní řádky, kde je shoda potřeba vyřešit rozstřelem (oranžově), a prvních 6 v pořadí (zeleně).":
    "The app highlights rows where a tie needs to be resolved by a shoot-off (orange), and the top 6 in the ranking (green).",
  "Pořadí kroků, jejich zapnutí i směr procházení položek si můžeš plně nastavit v":
    "You can fully configure the order of steps, whether they're enabled, and the direction rounds are gone through in",
  "(šipkami nahoru/dolů přeskládáš kroky, zaškrtávátkem je vypneš).":
    "(use the up/down arrows to reorder steps, the checkbox to turn them off).",
  "od 1. položky k poslední": "from 1st round to last",
  "od poslední položky k 1.": "from last round to 1st",
  "Celkový součet (vyšší vyhrává)": "Total score (higher wins)",

  // Menu (menu.js)
  "☰ Více": "☰ More",
  "Zavřít ✕": "Close ✕",
  "Aktuální soutěž:": "Current competition:",
  "(bez názvu)": "(unnamed)",
  "Přepnout / spravovat soutěže": "Switch / manage competitions",

  // Competitions (competitions.js)
  "Bez názvu": "Unnamed",
  "aktivní": "active",
  "Naposledy upraveno:": "Last edited:",
  "Nový název soutěže:": "New competition name:",
  "Opravdu smazat soutěž": "Really delete competition",
  "Tohle nejde vrátit zpět.": "This cannot be undone.",

  // Entry / topbar
  "terčů": "targets",

  // Home (missing)
  "Nepodařilo se načíst soubor: ": "Failed to load file: ",
  "Název vlastní disciplíny:": "Custom discipline name:",
  "Název vlastní kategorie:": "Custom category name:",

  // Lottery
  "Prefix": "Prefix",

  // Top stats (missing suffix key)
  ") - alespoň jednou": ") - at least once",

  // Presentation
  "🖥 Prezentace": "🖥 Presentation",
  "✕ Zavřít": "✕ Close",
  "Celkově": "Overall",
  "Po kategoriích": "By category",
  "Jak zobrazit prezentaci?": "How should the presentation be displayed?",
  "Po kategoriích (samostatné pořadí pro každou kategorii)": "By category (separate ranking for each category)",
  "Zatím žádné výsledky - vyplň Zápis.": "No results yet - fill in Scoring.",

  // Item sheets (položkové listy)
  "🎯 Položkové listy": "🎯 Score sheets",
  "🎯 Položkový list finále": "🎯 Final score sheet",
  "Střelců:": "Shooters:",
  "Položek na střelce:": "Rounds per shooter:",
  "Max. terčů:": "Max. targets:",
  "Automaticky vyvážené skupiny (doporučeno)": "Automatic balanced groups (recommended)",
  "Pevný počet na skupinu:": "Fixed number per group:",
  "Vlastní rozpis (např. 6,6,5):": "Custom split (e.g. 6,6,5):",
  "např. 6,6,5": "e.g. 6,6,5",
  "Prázdné skupiny navíc (stránky)": "Extra blank groups (pages)",
  "Skupiny (lidí):": "Groups (people):",
  "stran:": "pages:",
  "prázdných míst:": "empty slots:",
  "🖨 Generovat PDF": "🖨 Generate PDF",
  "Skupina": "Group",
  "PDF položkových listů vygenerováno ✔": "Score sheets PDF generated ✔",
  "Nejdřív musí být určeni finalisté.": "Finalists must be determined first.",
  "Finalistů:": "Finalists:",
  "samostatná skupina pro každou kategorii": "separate group for each category",
  "vždy jedna skupina": "always one group",
  "Počet terčů pro finále": "Number of targets for the final",
  "Druh zápisu finále:": "Final sheet layout:",
  "Od 1 – nejlepší na start č. 1": "From 1 – best shooter on start no. 1",
  "Od 6 – nejhorší ze šestice na start č. 1 (pozpátku)": "From 6 – worst of the group on start no. 1 (reversed)",
  "PDF položkového listu finále vygenerováno ✔": "Final score sheet PDF generated ✔",

  // Desktop app download (menu.js / desktop.js)
  "Desktop aplikace pro Win": "Desktop app for Windows",
  "🖥️ Desktop aplikace pro Windows": "🖥️ Desktop app for Windows",
  "Appka jde nainstalovat i jako samostatná desktopová (offline) aplikace pro Windows - žádný prohlížeč ani internet během používání není potřeba.":
    "The app can also be installed as a standalone desktop (offline) application for Windows - no browser or internet connection is needed while using it.",
  "Odkaz vždy vede na nejnovější sestavenou verzi (automaticky se aktualizuje při každém nasazení).":
    "The link always points to the latest built version (updated automatically with every deploy).",
  "⬇️ Stáhnout ShootingResults-Setup.exe": "⬇️ Download ShootingResults-Setup.exe",
  "Stránka verze na GitHubu": "Release page on GitHub",
  "Po stažení spusť instalátor a postupuj podle průvodce. Windows může u nepodepsané appky zobrazit upozornění \"Neznámý vydavatel\" - to je normální, stačí potvrdit spuštění.":
    "After downloading, run the installer and follow the wizard. Windows may show an \"Unknown publisher\" warning for an unsigned app - that's normal, just confirm you want to run it.",
};

export function t(cs) {
  if (store.app.language !== "en") return cs;
  return Object.prototype.hasOwnProperty.call(EN, cs) ? EN[cs] : cs;
}
