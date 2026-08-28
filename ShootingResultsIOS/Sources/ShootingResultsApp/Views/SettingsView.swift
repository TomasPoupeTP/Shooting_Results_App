import SwiftUI

/// Obdoba "Domů" obrazovky z desktop appky - nastavení závodu.
struct SettingsView: View {
    @EnvironmentObject var store: CompetitionStore

    var body: some View {
        NavigationStack {
            Form {
                Section("Závod") {
                    TextField("Název závodu", text: $store.settings.name)
                }

                Section("Disciplína") {
                    Picker("Disciplína", selection: $store.settings.discipline) {
                        ForEach(Discipline.allCases) { d in
                            Text(d.rawValue).tag(d)
                        }
                    }
                    if store.settings.discipline == .vlastni {
                        TextField("Vlastní disciplína", text: $store.settings.customDiscipline)
                    }
                }

                Section("Parametry") {
                    Stepper("Max. skóre na kolo: \(store.settings.maxScorePerRound)",
                            value: $store.settings.maxScorePerRound, in: 1...200)
                    Stepper("Počet kol: \(store.settings.numRounds)",
                            value: $store.settings.numRounds, in: 1...20)
                    Toggle("Používat kategorie", isOn: $store.settings.useCategories)
                    Toggle("Finále", isOn: $store.settings.hasFinale)
                }

                Section {
                    Button {
                        store.save()
                    } label: {
                        Label("Uložit závod", systemImage: "square.and.arrow.down")
                    }
                    .bold()

                    Button(role: .destructive) {
                        store.newCompetition()
                    } label: {
                        Label("Nový závod (smazat vše)", systemImage: "trash")
                    }
                }
            }
            .navigationTitle("Nastavení")
            .scrollContentBackground(.hidden)
            .background(Theme.bgDark)
        }
    }
}
