import SwiftUI

/// Obdoba "Los" obrazovky z desktop appky - přidávání střelců a losování
/// startovních čísel.
struct LotteryView: View {
    @EnvironmentObject var store: CompetitionStore
    @State private var newName = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    TextField("Jméno střelce", text: $newName)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit(addShooter)

                    Button {
                        addShooter()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                    .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding()

                List {
                    ForEach($store.shooters) { $shooter in
                        HStack {
                            Text("\(shooter.startNumber)")
                                .font(.system(.body, design: .monospaced))
                                .foregroundStyle(Theme.accent)
                                .frame(width: 32, alignment: .trailing)

                            TextField("Jméno", text: $shooter.name)

                            if store.settings.useCategories {
                                Picker("", selection: $shooter.category) {
                                    ForEach(CATEGORIES, id: \.self) { c in
                                        Text(c.isEmpty ? "—" : catShort(c)).tag(c)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(width: 70)
                            }
                        }
                    }
                    .onDelete { store.removeShooter(at: $0) }
                }
                .listStyle(.plain)

                Button {
                    store.shuffleStartNumbers()
                } label: {
                    Label("Losovat startovní čísla", systemImage: "shuffle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.accent)
                .padding()
            }
            .navigationTitle("Los (\(store.shooters.count))")
            .background(Theme.bgDark)
        }
    }

    private func addShooter() {
        let trimmed = newName.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        store.addShooter()
        if let last = store.shooters.indices.last {
            store.shooters[last].name = trimmed
        }
        newName = ""
    }
}
