import ActivityKit
import ExpoModulesCore

struct StartActivityArgs: Record {
  @Field var title: String = "Workout"
  @Field var startedAtMs: Double = 0
  @Field var completed: Int = 0
  @Field var total: Int = 0
}

struct UpdateActivityArgs: Record {
  @Field var paused: Bool = false
  @Field var elapsedSec: Int = 0
  @Field var completed: Int = 0
  @Field var total: Int = 0
}

public class SynapLiveActivityModule: Module {
  // Held as `Any?` because the concrete `Activity<…>` type is gated to iOS 16.2+
  // and stored properties cannot carry an availability annotation.
  private var currentActivity: Any?
  private var startedAtMs: Double = 0

  public func definition() -> ModuleDefinition {
    Name("SynapLiveActivity")

    AsyncFunction("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("startWorkoutActivity") { (args: StartActivityArgs) in
      guard #available(iOS 16.2, *) else { return }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

      // Clear any stale activity from a previous session first.
      self.endInternal()

      self.startedAtMs = args.startedAtMs > 0 ? args.startedAtMs : Date().timeIntervalSince1970 * 1000
      let attributes = WorkoutActivityAttributes(title: args.title)
      let state = WorkoutActivityAttributes.ContentState(
        paused: false,
        elapsedSec: 0,
        startedAtMs: self.startedAtMs,
        completed: args.completed,
        total: args.total
      )

      do {
        let activity = try Activity<WorkoutActivityAttributes>.request(
          attributes: attributes,
          content: ActivityContent(state: state, staleDate: nil),
          pushType: nil
        )
        self.currentActivity = activity
      } catch {
        // Non-fatal — the in-app timer remains the source of truth.
      }
    }

    AsyncFunction("updateWorkoutActivity") { (args: UpdateActivityArgs) in
      guard #available(iOS 16.2, *) else { return }
      guard let activity = self.currentActivity as? Activity<WorkoutActivityAttributes> else { return }

      let state = WorkoutActivityAttributes.ContentState(
        paused: args.paused,
        elapsedSec: args.elapsedSec,
        startedAtMs: self.startedAtMs,
        completed: args.completed,
        total: args.total
      )
      Task {
        await activity.update(ActivityContent(state: state, staleDate: nil))
      }
    }

    AsyncFunction("endWorkoutActivity") {
      guard #available(iOS 16.2, *) else { return }
      self.endInternal()
    }
  }

  @available(iOS 16.2, *)
  private func endInternal() {
    guard let activity = self.currentActivity as? Activity<WorkoutActivityAttributes> else { return }
    Task {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    self.currentActivity = nil
  }
}
