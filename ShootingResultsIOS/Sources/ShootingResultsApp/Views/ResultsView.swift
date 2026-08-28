import SwiftUI

/// Obdoba "Seřazení" + "Top Statistika" z desktop appky - průběžné pořadí
/// (top 6 zvýrazněno stejně jako v desktopu) a základní statistika.
struct ResultsView: View {
    @EnvironmentObject var store: CompetitionStore

    var body: some View {
        NavigationStack {
            List {
                if let leader = store.sortedShooters.first, leader.total > 0 {
                    Section("Statistika") {
                        StatRow(label: "Vede", value: "\(displayName(leader)) – \(leader.total)")
                        if let best = bestRoundInfo() {
                            StatRow(label: "Nejlepší kolo", value: best)
                        }
                    }
                }

                Section("Pořadí") {
                    ForEach(Array(store.sortedShooters.enumerated()), id: \.element.id) { idx, shooter in
                        HStack {
                            Text("\(idx + 1).")
                                .frame(width: 28, alignment: .trailing)
                                .foregroundStyle(idx < 6 ? Theme.accent : Theme.textMuted)
                                .bold(idx < 6)

                            VStack(alignment: .leading) {
                                Text(displayName(shooter))
                                    .bold(idx < 6)
                                if store.settings.useCategories, !shooter.category.isEmpty {
                                    Text(shooter.category)
                                        .font(.caption)
                                        .foregroundStyle(Theme.textMuted)
                                }
                            }

                            Spacer()
                            Text("\(shooter.total)")
                                .bold()
                        }
                        .listRowBackground(idx < 6 ? Theme.accent.opacity(0.12) : Color.clear)
                    }
                }
            }
            .navigationTitle("Výsledky")
        }
    }

    private func displayName(_ s: Shooter) -> String {
        s.name.isEmpty ? "Bez jména" : s.name
    }

    private func bestRoundInfo() -> String? {
        let rounds = store.settings.numRounds
        var bestVal = -1
        var bestRound = -1
        for r in 0..<rounds {
            if let v = store.bestRoundScore(r), v > bestVal {
                bestVal = v
                bestRound = r
            }
        }
        guard bestRound >= 0 else { return nil }
        return "\(bestVal) (kolo \(bestRound + 1))"
    }
}

private struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label).foregroundStyle(Theme.textMuted)
            Spacer()
            Text(value).bold()
        }
    }
}
