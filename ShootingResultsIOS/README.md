# Shooting Results – iOS (v0)

Nová, samostatná iOS/iPadOS appka (SwiftUI) se stejnou základní mechanikou jako
desktop verze (`shooting_results_app.py`):

**Nastavení → Los → Zápis → Výsledky**

Design je od základu nový (SwiftUI, ne převod Tkinter obrazovek), mechanika
(kategorie, disciplíny, max. skóre, počet kol, losování startovních čísel,
zápis skóre po kolech, průběžné pořadí se zvýrazněním top 6) odpovídá
desktop verzi. Zaměřeno primárně na iPhone, layout je ale připravený i pro iPad
(`TARGETED_DEVICE_FAMILY = 1,2`).

Toto je **v0** – úmyslně jednoduché. Zatím chybí (oproti desktopu):
prezentační smyčka na velkou obrazovku, generování PDF (los / položkové listy
/ výsledky), finále + rozstřel, Top Statistika s grafy. Přidáme postupně.

## Co je potřeba k otevření/sestavení (jen na macOS)

Tohle repo neobsahuje `.xcodeproj` napřímo (binární/XML Xcode projekt se
snadno poškodí ruční úpravou mimo Xcode). Místo toho je tu `project.yml`
pro nástroj **XcodeGen**, který z něj vygeneruje čistý `.xcodeproj`.

1. Nainstaluj Xcode (App Store) a XcodeGen:
   ```bash
   brew install xcodegen
   ```
2. V tomto adresáři (`ShootingResultsIOS/`) spusť:
   ```bash
   xcodegen generate
   ```
   Vznikne `ShootingResultsIOS.xcodeproj`.
3. Otevři `ShootingResultsIOS.xcodeproj` v Xcode.
4. Zvol simulátor iPhone (nebo připojený iPhone/iPad) a Run (⌘R).

## Struktura

```
ShootingResultsIOS/
  project.yml                     # definice projektu pro XcodeGen
  Sources/ShootingResultsApp/
    ShootingResultsApp.swift      # vstupní bod appky
    Theme/Theme.swift             # barevná paleta (navazuje na desktop)
    Models/
      Shooter.swift               # střelec, kategorie
      CompetitionSettings.swift   # nastavení závodu, disciplíny
    Store/
      CompetitionStore.swift      # stav appky + ukládání (JSON v Documents)
    Views/
      RootTabView.swift           # záložky: Nastavení / Los / Zápis / Výsledky
      SettingsView.swift
      LotteryView.swift
      EntryView.swift
      ResultsView.swift
```

## Perzistence

Data se ukládají jako `competition.json` do složky Documents appky (tlačítko
„Uložit“ v Nastavení i v Zápisu). Zatím jeden rozpracovaný závod najednou –
víc uložených závodů, export/import a sdílení souborů doplníme později.
