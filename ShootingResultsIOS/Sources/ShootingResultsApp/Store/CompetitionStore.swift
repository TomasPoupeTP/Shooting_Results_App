import Foundation
import Combine

/// Perzistentní tvar dat - ukládá se jako JSON do Documents (obdoba
/// ukládání JSON/CSV v desktop verzi, jen zjednodušené na jeden soubor).
struct CompetitionData: Codable {
    var settings: CompetitionSettings
    var shooters: [Shooter]
}

/// Centrální stav appky - nastavení závodu, seznam střelců, los a výsledky.
/// Mechanika kopíruje desktop verzi (shooting_results_app.py):
/// Nastavení -> Los -> Zápis -> Výsledky.
final class CompetitionStore: ObservableObject {
    @Published var settings = CompetitionSettings() {
        didSet { syncRoundsCount() }
    }
    @Published var shooters: [Shooter] = []

    private var fileURL: URL {
        FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("competition.json")
    }

    init() { load() }

    // MARK: - Perzistence

    func save() {
        let data = CompetitionData(settings: settings, shooters: shooters)
        do {
            let encoded = try JSONEncoder().encode(data)
            try encoded.write(to: fileURL, options: .atomic)
        } catch {
            print("Uložení selhalo: \(error)")
        }
    }

    func load() {
        guard let raw = try? Data(contentsOf: fileURL),
              let data = try? JSONDecoder().decode(CompetitionData.self, from: raw)
        else { return }
        settings = data.settings
        shooters = data.shooters
    }

    func newCompetition() {
        settings = CompetitionSettings()
        shooters = []
    }

    // MARK: - Los (přidávání střelců, losování startovních čísel)

    func addShooter() {
        let next = (shooters.map { $0.startNumber }.max() ?? 0) + 1
        shooters.append(Shooter(startNumber: next, scores: Array(repeating: nil, count: settings.numRounds)))
    }

    func removeShooter(at offsets: IndexSet) {
        shooters.remove(atOffsets: offsets)
    }

    func shuffleStartNumbers() {
        guard !shooters.isEmpty else { return }
        var numbers = Array(1...shooters.count)
        numbers.shuffle()
        for i in shooters.indices { shooters[i].startNumber = numbers[i] }
        shooters.sort { $0.startNumber < $1.startNumber }
    }

    /// Po změně počtu kol v nastavení dorovná délku pole scores u všech střelců.
    private func syncRoundsCount() {
        for i in shooters.indices {
            var s = shooters[i].scores
            if s.count < settings.numRounds {
                s += Array(repeating: nil, count: settings.numRounds - s.count)
            } else if s.count > settings.numRounds {
                s = Array(s.prefix(settings.numRounds))
            }
            if s != shooters[i].scores { shooters[i].scores = s }
        }
    }

    // MARK: - Výsledky / statistika

    var sortedShooters: [Shooter] {
        shooters.sorted {
            if $0.total != $1.total { return $0.total > $1.total }
            return $0.startNumber < $1.startNumber
        }
    }

    func bestRoundScore(_ round: Int) -> Int? {
        shooters.compactMap { round < $0.scores.count ? $0.scores[round] : nil }.max()
    }
}
