import Foundation

/// Kategorie - stejné jako v desktop verzi (CATEGORIES / CAT_SHORT).
let CATEGORIES: [String] = ["", "Senior", "Veterán", "Junior", "Žena", "Člen", "Host"]
let CAT_SHORT: [String: String] = [
    "Senior": "S", "Veterán": "V", "Junior": "J",
    "Žena": "Ž", "Člen": "Č", "Host": "H", "": ""
]

func catShort(_ cat: String) -> String { CAT_SHORT[cat] ?? cat }

struct Shooter: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var startNumber: Int
    var name: String = ""
    var prefix: String = ""        // skupina/oddíl - použije se při losu
    var category: String = ""      // "" = kategorie se nepoužívá
    var scores: [Int?] = []        // skóre po kolech, nil = zatím nezapsáno

    var total: Int {
        scores.compactMap { $0 }.reduce(0, +)
    }

    var roundsFilled: Int {
        scores.compactMap { $0 }.count
    }
}
