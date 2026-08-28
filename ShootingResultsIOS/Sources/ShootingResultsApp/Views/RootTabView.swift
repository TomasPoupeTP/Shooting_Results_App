import SwiftUI

/// Hlavní navigace v0 - stejný tok jako desktop appka:
/// Nastavení -> Los -> Zápis -> Výsledky, jen jako záložky (jednodušší na iPhonu).
struct RootTabView: View {
    var body: some View {
        TabView {
            SettingsView()
                .tabItem { Label("Nastavení", systemImage: "gearshape") }

            LotteryView()
                .tabItem { Label("Los", systemImage: "shuffle") }

            EntryView()
                .tabItem { Label("Zápis", systemImage: "pencil.and.list.clipboard") }

            ResultsView()
                .tabItem { Label("Výsledky", systemImage: "trophy") }
        }
        .tint(Theme.accent)
    }
}
