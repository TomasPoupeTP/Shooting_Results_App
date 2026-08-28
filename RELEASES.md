# Historie release verzí (desktop)

Aplikace je jednosouborový Python skript (`shooting_results_app.py`), který se
pomocí `build.bat` (PyInstaller) sestavuje do samostatného Windows `.exe`
(desktop verze, bez nutnosti instalace Pythonu na cílovém PC).

Tento soubor slouží jako jednoduchý log stavů kódu, které byly označené jako
hotová/vydaná desktop verze.

---

## v5 – desktop – 2026-08-28

- **Commit:** `d0f24f000c6759408620c0ca19876c50a0510b87`
- **Branch:** `release/v5`
- **Build:** `build.bat` → `dist/ShootingResultsApp.exe`

Obsah k tomuto datu:
- Prezentace po kategoriích + prefixy v losu s omezením šestic
- Prezentace s menu nastavení, grafy a zvýrazněním
- Položkové listy – generování PDF skórovacích listů (A4 naležato)
- Opravy: padding rund na 6, plynulejší smyčka prezentace, zkrácená hlavička
- Vlastní disciplína/kategorie, Top Statistika
- `build.bat` pro sestavení Windows `.exe` přes PyInstaller

> Pozn.: Formální GitHub Release (tag + přiložený `.exe`) se z tohoto sezení
> nepodařilo vytvořit – session má oprávnění pushovat pouze na branch
> `claude/git-connection-version-9teqhq`, vytvoření nového tagu na originu
> GitHub odmítl (HTTP 403). Pro plnohodnotný Release je potřeba buď:
> 1. Ručně vytvořit tag/Release v GitHub UI na commit výše, nebo
> 2. Spustit `build.bat` lokálně na Windows a `.exe` přiložit k Release ručně.
