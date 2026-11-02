# Next update: retention and learning

What to build after 1.0.0, in priority order. Every item is practice-only: no betting,
chips, money, prizes or casino-style rewards. Rewards stay XP, streaks and progress.

Sizes: **S** about a day, **M** a few days, **L** a week or more.
"New build" means it needs native code and a fresh EAS build (an OTA update can't ship it).

## Already done for 1.0.1 (on `claude/v101-polish-7ec402`)

- Reminder time picker (8 AM to 9 PM) in a new Settings › Reminders section.
- When notifications are blocked: Settings says so and links to the phone's Settings; denying the system prompt offers the same.
- Clearer streak and streak-freeze copy in English and Spanish (Spanish no longer uses "cobrar", "premio" or "congelador").
- VoiceOver labels for claimed goals, a ready reward and plural days.

## 1. One streak, not two — S

**Why:** the home screen has a daily goal streak and the Counting Academy has its own workout streak. Two flames with different numbers confuse people, and it's not obvious which one a reminder protects.
**Plan:** let an Academy workout count as a claimed goal for the day (or show the Academy count as "workouts this week" instead of a second streak).
**Review risk:** none.

## 2. Spaced review of your leaks — M

**Why:** the leaks screen already knows the exact hands each player misses. Bringing those hands back on a schedule (1, 3, 7 days) is the strongest learning technique there is and gives a concrete reason to open the app each day.
**Plan:** a daily "Review 10 hands" goal built from `engine/leaks.ts`, with a simple interval per spot.
**Review risk:** none.

## 3. Weekly summary screen — S

**Why:** a short "your week" card on Mondays (hands practiced, accuracy change, best deck time, streak) shows progress, which is what keeps learners going.
**Plan:** reuse the progress history; show it once on the first open of the week. Optional share image of the stats.
**Review risk:** low. Keep the share image to accuracy and practice stats; no amounts or anything that reads like winnings.

## 4. Smarter reminder text — S

**Why:** "Keep your 5-day streak" gets ignored after a week. Varying it with the player's real next step ("2 lessons left before the count drills", "your soft-hand accuracy is 82%") is more useful and less naggy.
**Plan:** pick the text from `nextStep()` and the top leak when the reminders are queued. Still at most one a day, still stops after two days without opening the app.
**Review risk:** low. Local notifications only, no marketing; wording stays practice-focused (Guideline 4.5.4).

## 5. Lesson checkpoints for returning players — S

**Why:** someone back after two weeks lands on the home screen with no streak and no idea where they were.
**Plan:** after 7+ days away, open with a 5-question warm-up from their last lesson and a "pick up where you left off" button.
**Review risk:** none.

## 6. Home screen widget (streak and today's goals) — L, new build

**Why:** a widget is a daily reminder that isn't a notification, and widgets are among the strongest retention levers on iOS.
**Plan:** a SwiftUI widget extension added through a config plugin (check the SDK 57 docs for Expo's current widget support first), reading a shared App Group value. Needs a new native build and an App Group entitlement.
**Review risk:** low. Show streak and goal progress only.

## 7. Practice milestones (badges) — M

**Why:** long-term goals beyond the daily three: "100 perfect decisions in a row", "count a deck in under 25 seconds", "all lessons in Spanish".
**Plan:** a badge list on the Me tab, earned from existing records. XP only.
**Review risk:** low if badges stay about skill. Avoid names like "high roller", "jackpot" or "VIP", and anything that looks like a casino comp or prize.

## 8. Accessibility and layout pass on iPad — S

**Why:** content is width-capped at 760 pt, which leaves wide empty sides on 13-inch iPads in landscape; the goals and progress tiles could sit in two columns there.
**Review risk:** none.

## Not doing

- Leaderboards with rewards, daily spin wheels, loot boxes, bonus currency, "free chips" or any purchasable advantage: these read as simulated gambling and were the cause of the earlier rejection.
- Push notifications from a server: the app is local-only by design (`plugins/withoutPushEntitlement.js`).

## Follow-up outside this list

- User-visible "casino" wording remains on the home screen ("You're casino-ready", "Casino-ready N%") and in the "Casino Conditions" test name. The `fallback/no-casino-wording` branch covers this if review asks.
