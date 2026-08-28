import SwiftUI

/// Barevná paleta - vychází z desktop verze aplikace (shooting_results_app.py),
/// aby obě verze působily jako jedna rodina, i když UI je čistě nové (SwiftUI).
enum Theme {
    static let bgDark      = Color(hex: "0D1117")
    static let bgCard      = Color(hex: "161B22")
    static let bgInput     = Color(hex: "1C2128")
    static let bgHover     = Color(hex: "21262D")
    static let accent      = Color(hex: "E8A317")
    static let accentDark  = Color(hex: "B8820F")
    static let textPrimary = Color(hex: "F0F6FC")
    static let textMuted   = Color(hex: "8B949E")
    static let border      = Color(hex: "30363D")
    static let green       = Color(hex: "3FB950")
    static let red         = Color(hex: "F85149")
    static let gold        = Color(hex: "FFD700")
}

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        s = s.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        Scanner(string: s).scanHexInt64(&rgb)
        let r = Double((rgb & 0xFF0000) >> 16) / 255
        let g = Double((rgb & 0x00FF00) >> 8) / 255
        let b = Double(rgb & 0x0000FF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
