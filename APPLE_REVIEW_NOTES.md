# SYNAP App Review Notes

Use this for App Store Connect review information.

## Sign-In Information

- Sign-in required: Yes
- Username: `apple-review@synapfit.app`
- Password: provide the generated password directly in App Store Connect. Do not commit it to git.

## Review Account State

The review account is pre-seeded with:

- Confirmed email login
- Fitness profile
- Baseline measurement
- Active nutrition plan
- Active workout plan

This lets reviewers test the main app without needing to wait for full plan generation.

## Suggested Notes For Reviewer

SYNAP is an AI fitness coaching app. Reviewers can sign in with the provided account and test Ion AI chat, nutrition logging, food photo scanning, workout tracking, measurement logging, InBody photo analysis, progress sharing, Apple Health connection, Arabic/English switching, and light/dark mode.

Apple Health is optional. If HealthKit permission is denied, the app continues to work using manually logged measurements and workouts.

Camera access is used only for food photo scanning and InBody/photo analysis.

## Permissions Explanation

- Camera: scan food packaging, analyze InBody/progress photos.
- Photo Library: upload/select progress, food, or form photos.
- Health: read steps, active energy, body weight, body fat percentage, and resting heart rate so Ion can personalize coaching.

## Post-Review

Rotate the review account password after App Review is complete.
