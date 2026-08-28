import Foundation

/// Disciplíny - stejné jako v desktop verzi (DISCIPLINES + "Vlastní…").
enum Discipline: String, CaseIterable, Codable, Identifiable, Hashable {
    case americkyTrap    = "Americký TRAP"
    case univerzalniTrap = "Univerzální TRAP"
    case skeet           = "SKEET"
    case special         = "Speciál"
    case vlastni         = "Vlastní…"

    var id: String { rawValue }
}

struct CompetitionSettings: Codable, Equatable {
    var name: String = ""
    var discipline: Discipline = .americkyTrap
    var customDiscipline: String = ""
    var maxScorePerRound: Int = 25
    var numRounds: Int = 3
    var useCategories: Bool = false
    var hasFinale: Bool = false

    /// Text disciplíny k zobrazení (bere v potaz vlastní disciplínu).
    var disciplineText: String {
        if discipline == .vlastni {
            return customDiscipline.isEmpty ? "Vlastní" : customDiscipline
        }
        return discipline.rawValue
    }
}
