import SwiftUI

@main
struct ShootingResultsIOSApp: App {
    @StateObject private var store = CompetitionStore()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
        }
    }
}
