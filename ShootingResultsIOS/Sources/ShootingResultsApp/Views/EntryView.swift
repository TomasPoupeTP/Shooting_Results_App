import SwiftUI

/// Obdoba "Zápis" obrazovky z desktop appky - zápis skóre po kolech
/// pro každého střelce. Na iPhonu řešeno jako seznam řádků s vodorovně
/// scrollovatelnými poli pro jednotlivá kola (místo velké tabulky).
struct EntryView: View {
    @EnvironmentObject var store: CompetitionStore

    var body: some View {
        NavigationStack {
            List {
                ForEach($store.shooters) { $shooter in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("#\(shooter.startNumber)")
                                .foregroundStyle(Theme.textMuted)
                            Text(shooter.name.isEmpty ? "Bez jména" : shooter.name)
                                .bold()
                            Spacer()
                            Text("\(shooter.total)")
                                .bold()
                                .foregroundStyle(Theme.accent)
                        }

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(shooter.scores.indices, id: \.self) { i in
                                    ScoreField(
                                        value: Binding(
                                            get: { shooter.scores[i] },
                                            set: { shooter.scores[i] = $0 }
                                        ),
                                        maxScore: store.settings.maxScorePerRound
                                    )
                                }
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Zápis výsledků")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Uložit") { store.save() }
                }
            }
        }
    }
}

/// Jedno políčko pro zápis skóre v jednom kole (numerická klávesnice, omezené na 0...maxScore).
private struct ScoreField: View {
    @Binding var value: Int?
    let maxScore: Int

    var body: some View {
        TextField("–", text: Binding(
            get: { value.map(String.init) ?? "" },
            set: { newVal in
                if newVal.isEmpty {
                    value = nil
                } else if let n = Int(newVal) {
                    value = min(max(n, 0), maxScore)
                }
            }
        ))
        .keyboardType(.numberPad)
        .multilineTextAlignment(.center)
        .frame(width: 44, height: 36)
        .background(Theme.bgInput)
        .foregroundStyle(Theme.textPrimary)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.border))
    }
}
