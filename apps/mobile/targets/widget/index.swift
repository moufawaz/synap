import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Shared activity attributes
//
// This MUST stay byte-for-byte identical (type name + ContentState shape) to the
// copy in `modules/synap-live-activity/ios/WorkoutActivityAttributes.swift`.
// ActivityKit matches a running Activity to its widget by the attributes type
// name and decodes the Codable ContentState, so identical structs interoperate
// across the app target (which starts the activity) and this widget target
// (which renders it).
struct WorkoutActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Whether the timer is currently paused.
    var paused: Bool
    /// Frozen elapsed seconds — only meaningful while `paused` is true.
    var elapsedSec: Int
    /// Unix epoch seconds when the timer started (running view computes elapsed from this).
    var startedAtMs: Double
    var completed: Int
    var total: Int
  }

  /// Workout / day label, e.g. "Push Day".
  var title: String
}

// MARK: - Formatting helpers

private func elapsedString(_ seconds: Int) -> String {
  let s = max(0, seconds)
  let h = s / 3600
  let m = (s % 3600) / 60
  let sec = s % 60
  if h > 0 {
    return String(format: "%d:%02d:%02d", h, m, sec)
  }
  return String(format: "%02d:%02d", m, sec)
}

@available(iOS 16.2, *)
private func startDate(_ state: WorkoutActivityAttributes.ContentState) -> Date {
  Date(timeIntervalSince1970: state.startedAtMs / 1000.0)
}

// A live, self-ticking timer label (running) or a frozen one (paused).
@available(iOS 16.2, *)
private struct TimerLabel: View {
  let state: WorkoutActivityAttributes.ContentState
  var font: Font = .title2
  var color: Color = .white

  var body: some View {
    Group {
      if state.paused {
        Text(elapsedString(state.elapsedSec))
      } else {
        // The system updates this every second with no push from the app.
        Text(startDate(state), style: .timer)
      }
    }
    .font(font.monospacedDigit())
    .fontWeight(.bold)
    .foregroundColor(color)
  }
}

private let accent = Color("$accent")

// MARK: - Lock Screen / banner view

@available(iOS 16.2, *)
struct WorkoutLockScreenView: View {
  let context: ActivityViewContext<WorkoutActivityAttributes>

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: context.state.paused ? "pause.circle.fill" : "bolt.fill")
        .font(.title)
        .foregroundColor(accent)
      VStack(alignment: .leading, spacing: 2) {
        Text(context.attributes.title)
          .font(.headline)
          .foregroundColor(.white)
          .lineLimit(1)
        Text("\(context.state.completed)/\(context.state.total) exercises")
          .font(.caption)
          .foregroundColor(.gray)
      }
      Spacer()
      TimerLabel(state: context.state, font: .title, color: .white)
    }
    .padding()
    .activityBackgroundTint(Color.black.opacity(0.85))
    .activitySystemActionForegroundColor(accent)
  }
}

// MARK: - Live Activity widget

@available(iOS 16.2, *)
struct WorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
      WorkoutLockScreenView(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded presentation
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text(context.attributes.title).font(.caption).foregroundColor(.white).lineLimit(1)
          } icon: {
            Image(systemName: "bolt.fill").foregroundColor(accent)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          TimerLabel(state: context.state, font: .title3, color: .white)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text("\(context.state.completed)/\(context.state.total) exercises\(context.state.paused ? " · paused" : "")")
            .font(.caption2)
            .foregroundColor(.gray)
        }
      } compactLeading: {
        Image(systemName: context.state.paused ? "pause.fill" : "bolt.fill")
          .foregroundColor(accent)
      } compactTrailing: {
        TimerLabel(state: context.state, font: .caption, color: .white)
      } minimal: {
        Image(systemName: "bolt.fill").foregroundColor(accent)
      }
      .widgetURL(URL(string: "synap://train"))
    }
  }
}

// MARK: - Widget bundle

@main
struct SynapWidgetBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.2, *) {
      WorkoutLiveActivity()
    }
  }
}
