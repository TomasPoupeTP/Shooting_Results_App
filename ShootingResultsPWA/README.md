# Shooting Results – PWA (Progressive Web App)

Webová aplikace se **stejnou mechanikou jako desktop verze** (`shooting_results_app.py`),
ale běží přímo v prohlížeči (Safari na iPhonu/iPadu i kdekoliv jinde) - **bez
Xcode, bez Macu, bez sideloadingu**. Stačí otevřít odkaz a přes Safari
"Přidat na plochu" (Add to Home Screen), a chová se jako nativní aplikace
(vlastní ikona, bez adresního řádku, funguje i offline).

Design je od základu nový, mechanika (nastavení, los, zápis, řazení,
rozstřel, finále, top statistika, PDF export) odpovídá desktop verzi.

## Funkce (v1)

- **Nastavení** - název soutěže, disciplína (+ vlastní), max. skóre/položku,
  počet položek, kategorie, finále
- **Los** - přidávání střelců (příjmení, jméno, prefix), řazení dle čísel,
  Auto-Los (rozdělení do šestic tak, aby stejný prefix nebyl ve stejné
  šestici), tisk startovní listiny (PDF), přenos do zápisu
- **Zápis** - tabulka střelců × položek (skóre + "1. chyba"), živý součet,
  přidávání/ubírání střelců i položek
- **Výsledky** - řazení (celkem → poslední položka → poslední chyba,
  přesně podle desktop logiky), zvýraznění top 6, detekce shody a
  rozstřel, PDF export (po kategoriích, pokud jsou zapnuté)
- **Finále** - automatický výběr top 6 (+ shody), finálová položka,
  průběžný celkový součet, rozstřel finále, PDF export
- **Top Statistika** - střelci s alespoň jednou plnou položkou
- **Prezentace** - jednoduchá živá tabulka výsledků na velkou obrazovku

Zatím oproti desktopu chybí: položkové listy (prázdné skórovací listy pro
rozhodčí) a grafy v prezentaci - dá se doplnit později.

## Offline a data

- Aplikace je **PWA** - má manifest + service worker, po prvním načtení funguje
  i bez internetu (vč. generování PDF, které běží celé v prohlížeči).
- Data (soutěž, los, zápis, výsledky) se ukládají do **localStorage v
  telefonu/prohlížeči** - zůstanou tam i po zavření aplikace. Pro zálohu nebo
  přenos na jiné zařízení použij **Export JSON / Import JSON** v Nastavení.
- PDF export (los, výsledky, finále) běží čistě v prohlížeči (jsPDF +
  vendorovaný font DejaVu Sans kvůli české diakritice) - žádný server.

## Jak to vyzkoušet

### Nejrychlejší - GitHub Pages (žádná instalace)

Po pushnutí této branch se automaticky nasadí na GitHub Pages (viz
`.github/workflows/deploy-pwa.yml`) - **pokud má repozitář v Settings →
Pages nastavený zdroj "GitHub Actions"** (jednorázové nastavení, musí ho
udělat vlastník repa). Pak aplikace běží na `https://<uzivatel>.github.io/<repo>/`.

Na iPhonu: otevři tu adresu v **Safari** → tlačítko Sdílet → **Přidat na
plochu**.

### Lokálně (na počítači)

Potřebuješ jen jednoduchý statický server (kvůli ES modulům aplikace nejde
spustit přímo z `file://`):

```bash
cd ShootingResultsPWA
python3 -m http.server 8080
```

a otevřít `http://localhost:8080`.

## Struktura

```
ShootingResultsPWA/
  index.html
  manifest.webmanifest
  sw.js                      # service worker (offline cache)
  icons/                     # PWA ikony (vygenerované, styl desktop aplikace)
  css/style.css
  js/
    state.js                 # stav aplikace + řazení/rozstřel/finále logika (1:1 podle Pythonu)
    constants.js              # kategorie, disciplíny
    dom.js                     # drobný DOM helper
    pdf.js                      # export do PDF (jsPDF + AutoTable)
    main.js                      # router mezi záložkami
    views/
      home.js lottery.js entry.js results.js finale.js topstats.js presentation.js
  vendor/                    # jsPDF, AutoTable, font DejaVu Sans (vendorováno, funguje offline)
```
