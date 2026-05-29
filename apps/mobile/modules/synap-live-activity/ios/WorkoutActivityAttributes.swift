import ActivityKit
import Foundation

// MARK: - Shared activity attributes
//
// This MUST stay byte-for-byte identical (type name + ContentState shape) to the
// copy in `targets/widget/index.swift`. ActivityKit matches a running Activity
// to its widget by the attributes type name and decodes the Codable ContentState,
// so identical structs interoperate across the app target (which starts the
// activity here) and the widget extension (which renders it).
struct WorkoutActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Whether the timer is currently paused.
    var paused: Bool
    /// Frozen elapsed seconds — only meaningful while `paused` is true.
    var elapsedSec: Int
    /// Unix epoch milliseconds when the timer started.
    var startedAtMs: Double
    var completed: Int
    var total: Int
  }

  /// Workout / day label, e.g. "Push Day".
  var title: String
}
