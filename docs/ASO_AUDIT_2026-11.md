# ShoeSharp: App Store listing audit (2026-11-21)

**This is a draft for your approval. Nothing has been entered in App Store Connect, submitted or sent.**
English (U.S.) only. The Spanish (Mexico) listing is not covered here (see "Follow-ups").

Live today (checked on apps.apple.com, US, 2026-11-21): version 1.0.2, name
`ShoeSharp: Blackjack Trainer`, subtitle `Learn Card Counting & Strategy`, category Card, Remove ads
$2.99, **no ratings shown** ("hasn't received enough ratings"). The keyword field is the one in
APP_STORE_LISTING.md (with `casino`, `vegas`, `odds`, `simulator`). The proposal in ASO.md
(2026-11-01) was **never shipped**: 1.0.2 went out with the old subtitle and keywords.

Traffic: 79 ad requests in 7 days means roughly 10 sessions a day. Search is not bringing installs
yet: ShoeSharp does not appear in the top 15 US results for `blackjack trainer` (see §1).

---

## 1. Competitor research (US App Store, 2026-11-21)

Method: the iTunes Search API (country=us), whose order is close to, but not exactly, the App Store
app's. Subtitles and prices come from each app's apps.apple.com page; screenshot headlines were read
from the first screenshots. Competitor names appear here for research only, never in our metadata.

| Search | Top results (ratings) | What it tells us |
|---|---|---|
| `blackjack trainer` | 1 Blackjack 21: Strategy Trainer (5.7K) · 2 Blackjack Trainer 101 (7.0K) · 3 a casino game (336K) · 4 Blackjack Drill Trainer (1) · 5 Blackjack & Card Counting Pro (10.2K, $4.99) · 6 Blackjack Guru (4.0K) · 7 Blackjack Strategy Trainer 21 (3) · 8 BJA Blackjack Trainer (878) · 10 Blackjack Wiz (1.5K) · … ShoeSharp not in top 15 | Head term; the top 10 is held by apps with thousands of ratings. Keep it in the name, but the quick wins are elsewhere. |
| `basic strategy` | 1 Blackjack Trainer 101 · 2 Blackjack 21 · then **Basic Strategy Blackjack (0), Basic Strategy: Blackjack (5)**, Card Counting Pro, a casino game, Blackjack 21 - Basic Strategy (0), Blackjack Basic Strategy Practice (14) | Places 3–10 have 0–14 ratings: winnable if the exact phrase is in the subtitle. |
| `blackjack strategy` | Blackjack 21 · Trainer 101 · Blackjack Strategy Practice (424) · Strategy Book (0) · two casino games · Strategy Academy (8) · Strategy: 21 Trainer (122) | Same: weak tail after the top 3. |
| `card counting` | 1 Card Counting Coach (111) · 2 Card Counting Pro (10.2K) · 3 Blackjack 21 · 4 21 Trainer (20) · 5 HiLo Card Counting (2) · 6 Card Counter Coach (0) · 7 Expert Card Counting (6) · 9 Card Counting Academy (12) · 10 Count: Blackjack Card Counting (0) | Weak: most results have under 120 ratings. Already reachable through name + subtitle. |
| `card counter` | Card Counting Coach (111) · Blackjack Counting (50) · Card Counter (113) · Expert Card Counting (6) · Card Counter Lite (57) · Card Counting Pro · Card Counter Coach (0) · Blackjack Lab: Card Counter (3) | Weak. Needs `counter` in the keyword field (Apple doesn't reliably stem counting → counter). |
| `blackjack practice` | Blackjack 21 · Trainer 101 · a casino game · Bankroll: Blackjack Practice (8) · Practice Game (7) · a casino game · Practice Blackjack (0) · Basic Strategy Practice (14) | Weak tail; `practice` stays in keywords. |

Subtitles and pricing of the apps we are up against:

| App | Subtitle | Money |
|---|---|---|
| Blackjack 21: Strategy Trainer | "Train Real Casino Situations" | Subscription $7.99/mo, $23.90–24.99/yr, $49.99 lifetime, plus $1.99 unlocks |
| Blackjack Trainer 101 | "Learn Basic Strategy" | $2.99 Pro upgrade (custom mode, error stats) |
| Blackjack Guru | "Card Counting & Basic Strategy" | Weekly $6.99–9.99, annual $44.99–89.99, lifetime $119.99 |
| Blackjack Wiz: Card Counting | "BJ trainer and strategy" | Subscriptions $8.99/wk to $89.99/yr |
| Blackjack & Card Counting Pro | "Learn to Beat Blackjack" | $4.99 paid app, promises casino winnings |
| Card Counting Coach | "Learn the steps to count cards" | Systems sold as $0.99–9.99 unlocks |

Screenshot messages (first frames):
- Blackjack 21: "Stop Guessing. Start Winning" (big cards + giant STAND/HIT buttons), then "Get Instant
  Feedback" (CORRECT banner with the reason). We can't copy the "winning" claim, but the layout is
  the lesson: **a hand and the verdict, readable at thumbnail size.**
- Blackjack Guru: "Blackjack Trainer" over a level-path map, then "Master Basic Strategy · No
  knowledge needed" over the table.

What this means for ShoeSharp:
1. **Every strong competitor charges a subscription** ($45–$120 a year). "Every feature is free,
   no subscription" is our sharpest message. It belongs in promotional text and description line 2
   (Apple ignores "free" as a keyword, and a price claim in screenshots is a 2.3.7 risk).
2. `basic strategy`, `card counter`, `card counting` and `blackjack practice` have weak results
   after the top 2–3. That is where a new app with no ratings can rank first.
3. The words `casino`, `vegas` and `odds` pull casino-game searchers (they bounce, which hurts
   conversion) and invite a reviewer to reopen the 2.3.6 simulated-gambling question.

---

## 2. Name, subtitle, keywords (needs a new version)

| Field | Proposed | Length |
|---|---|---|
| **Name** | `ShoeSharp: Blackjack Trainer` (keep) | 28/30 |
| **Subtitle** | `Basic Strategy & Card Counting` | 30/30 |
| **Keywords** | `21,hi-lo,hilo,counter,count,true,running,deviation,chart,drill,practice,coach,learn,quiz,deck,lesson` | 100/100 |

Indexed words in name + subtitle: shoesharp, blackjack, trainer, basic, strategy, card, counting.
None of them is repeated in the keyword field. No spaces, no plurals of singulars, no brands, no
"free", no "app", no category name, no gambling words.

**Name: keep.** `blackjack trainer` is the exact head term and the brand is on the icon and
screenshots. Renaming would cost recognition for no ranking gain.

**Subtitle: `Basic Strategy & Card Counting`.** It puts the exact phrase `basic strategy` in an
indexed field for the first time (today `basic` sits alone in the keyword field). With the name it
also matches `blackjack basic strategy`, `blackjack strategy`, `blackjack card counting` and
`card counting trainer`. "Learn" moves to the keyword field, so `learn blackjack` and `learn card
counting` still match. It leads with "Basic Strategy" because that is the bigger beginner query and
its results are weak after the top two. (Blackjack Guru uses the same four words in the other order;
these are generic terms, not a brand, so there is no conflict.)

**Keywords, one by one:**

| Keyword | Intent it reaches | Competition / why |
|---|---|---|
| `21` | "21 trainer", "blackjack 21", "21 strategy" | Very common query; numbers are cheap (2 chars). |
| `hi-lo` | "hi-lo count", "hi lo card counting" | The system the app teaches by default. Low competition (top result has 2 ratings). |
| `hilo` | "hilo", "hilo card counting" typed as one word | Covers the one-word spelling in case Apple doesn't join "hi-lo". First word to swap out if the search terms report shows it brings nothing. |
| `counter` | "card counter", "blackjack counter" | Weak results (all under 120 ratings). Apple doesn't reliably stem counting → counter. |
| `count` | "count cards", "running count", "true count" | Combines with `running` and `true`. |
| `true` | "true count", "true count trainer" | The True Count drill exists. Near-zero competition. |
| `running` | "running count", "running count drill" | The Running Count drill exists. Was cut from the ASO.md proposal for space; it is worth more than `shoe`. |
| `deviation` | "blackjack deviations", "count deviations" | The Count Plays flash cards (Illustrious 18 and Fab 4). Small but very qualified audience; few apps cover it free. |
| `chart` | "blackjack chart", "basic strategy chart" | Strategy Chart that follows your table rules. People search for a chart and want to learn it. |
| `drill` | "blackjack drill", "card counting drill" | Matches the app's drills; weak results. |
| `practice` | "blackjack practice", "practice card counting" | Weak tail after the top 2. |
| `coach` | "blackjack coach", "card counting coach" | The coach grades every decision. The one strong competitor here has 111 ratings. |
| `learn` | "learn blackjack", "learn card counting", "learn basic strategy" | Moved here from the subtitle. Beginner intent, which is our audience. |
| `quiz` | "blackjack quiz", "basic strategy quiz" | Lessons end in quizzes and the Strategy drill is a quiz. Low competition. |
| `deck` | "6 deck", "deck estimation", "deck counting" | Deck Estimation drill. Cheap (4 chars). |
| `lesson` | "blackjack lessons", "card counting lessons" | Nine lessons exist. Singular covers the plural. |

**Removed and why:** `casino`, `vegas`, `odds` (casino-game and betting intent; 2.3.6 review risk);
`basic` (now in the subtitle); `simulator` (pulls people who want a casino game); `shoe`, `dealer`,
`hand` (weak intent; "shoe" is mostly footwear searches).

---

## 3. Promotional text (can change today, no new version)

```
Every lesson, drill and exam is free: no paywall, no subscription, no account. Master basic strategy, learn the Hi-Lo count and keep a daily streak going.
```
154/170. Why: it is the first text under the screenshots, and the top competitors all charge a
subscription. It also drops the live text's "casino test" wording. All three claims are true today:
no purchase unlocks content, there is no account, and daily goals keep a streak.

## 4. Description: first three lines

```
Make the right blackjack play every hand, and learn to count cards, with a coach that explains why.

Every lesson, drill and exam is free: no paywall, no subscription, no account.

Nine short lessons take you from the rules to the Hi-Lo true count, then a full six-deck shoe exam with no help on screen.
```
Leads with the benefit (better decisions), then the differentiator (free), then the path. No promise
of winning money, no casino names. The rest of the current description can stay; when the version
is next edited, rename "Casino-ready score" to "Readiness score" in the body to match the
no-casino-wording direction in ASO.md (the in-app names "Casino Conditions" and "Road to the Casino"
are still real feature names in 1.0.2, so quoting them is accurate).

---

## 5. Screenshot plan (first 3 frames)

### What is wrong with the current first three
1. **Frame 1 ("Count cards like a pro", Counting Academy hub)** is a text-heavy menu: learning-style
   chips, a workout list and an exercise card. There is no card, no decision and no feedback on
   screen. In search results (about a third of the width) it reads as a wall of small text, while the
   competitors next to it show big cards and big Hit/Stand buttons. It also shows features that a
   brand-new player can't open until lesson "Why counting" is done.
2. **Frame 2 ("A coach at every decision", Main Floor)** shows the table *before* the answer. The
   coach's input is one small line ("Seat 4 · Coach: Hit"); the reason, which is the product's
   value, is not visible. Lots of empty felt between the hand and the buttons.
3. **Frame 3 ("Pass the casino test", Casino Conditions)** is the instructions page, not a result:
   five bullets of rules plus a checklist. The caption uses "casino", which ASO.md recommended
   dropping from all metadata after the 2.3.6 rejection.
4. Across all three: the core loop (a hand, your choice, the coach's verdict and reason) never
   appears in one frame, so the listing doesn't show what a session feels like.

### New first three

| # | Headline (4–6 words, outcome first) | Screen to show |
|---|---|---|
| 1 | **Make the right play, every hand** | Practice table right after a mistake with Settings → "Explain mistakes" on: a hard 16 vs a dealer 10, the feedback banner reading "Best play: …" with its one-line reason, the action buttons visible. Crop so the cards and banner fill the frame. |
| 2 | **Keep the count in your head** | Running Count drill at the moment it asks for the count (cards just flashed, number pad up), or the answer screen showing "Correct" and the Hi-Lo tags. Use a level where cards are large. |
| 3 | **Prove it on a full shoe** | The exam's **report card** after a passed shoe (score, running and true count, decision %), not the rules page. If the `fallback/no-casino-wording` branch has merged by then, the screen title reads "Full Shoe Test". |

Keep frames 4–6 (Your Leaks, readiness score, level picker) with captions free of "casino".
Re-shoot the iPad 13" set the same way (iPad is supported, so it is required). Put no price or
"free" claim in the screenshots; it lives in promotional text. Same felt-and-gold caption style.

---

## 6. In-App Event

| Field | Draft | Length |
|---|---|---|
| Event name | `7-Day Blackjack Streak` | 22/30 |
| Short description | `Claim a daily goal 7 days in a row` | 34/50 |
| Long description | `A few minutes of lessons, hands or drills a day. Claim a goal 7 days running; clear all goals to bank a streak freeze.` | 118/120 |
| Badge (event type) | **Challenge** | |
| Event dates | Start **2027-01-01 00:00**, end **2027-01-14 23:59** (local time). Two weeks, so someone who joins on day 7 can still finish. | |
| Publish (promotion) start | 2026-12-18 (Apple allows up to 14 days before the start) | |
| Purpose | Attract new users and re-engage lapsed ones | |
| Deep link | None: open the app normally. A deep link would skip first-run onboarding for new users. | |
| Event card image | 1920×1080 (16:9), felt-green background, a streak flame and seven day dots with the 7th lit gold, a fan of cards. No text, no chips, no casino art. | |
| Event details image | 1080×1920 (9:16) version of the same scene, or the Home screen's goals card with a 7-day streak. | |

Why this is true today: every day the app picks three daily goals for each player (lessons, hands,
drills or the Academy workout). Claiming the day's first goal extends the streak, and claiming all
three banks a streak freeze that covers one missed day (src/engine/progress.ts). Goals are available
from the first day; counting goals only appear once counting is unlocked, so the event works for
beginners too. New Year is when people start a skill habit. The event needs App Review, so submit it
by about 2026-12-11.

---

## 7. "Promote your app" (Featuring Nomination) draft

App Store Connect → Featuring → Nominations. Type: **App Enhancements** (or "New content" for the
event). About 140 words:

```
ShoeSharp is a blackjack trainer that teaches a real skill with no wagering at all: no chips, no bets, no prizes. Every hand is practice, and a coach grades each decision and explains the right play in one line.

What's unique: players go from the rules to Hi-Lo card counting through nine short lessons, a Counting Academy that teaches the count by sight, sound, touch or chunking, flash cards with spaced review for count-based plays, and a final full-shoe exam with no help on screen. Everything is free, with no subscription and no account; one optional purchase removes ads.

Audience: adults who enjoy card games, mental math and memory training, in English or Spanish, on iPhone and iPad.

Why now: the new year is when people pick up a new skill. Three daily goals and a streak make ShoeSharp a five-minute daily habit.
```

---

## 8. Release (for your approval)

- Name, subtitle and keywords change only with a new version. Ship them as **1.0.3**, the next build
  number after build 15 (EAS autoIncrement), together with the next code change or as a
  metadata-plus-rebuild version.
- **Manual release**, no phased release needed (phased release only staggers automatic updates;
  the metadata goes live for everyone at release anyway).
- What's New (draft): `Clearer store listing and small fixes. Thanks for practicing with ShoeSharp!`
  Replace with real notes if 1.0.3 carries code changes.
- Promotional text (§3) can be pasted now without a version.
- Compliance: no age-rating, privacy-label or IAP change. Keywords no longer contain gambling terms,
  which helps 2.3.6 and 5.3.4.

## 9. Measure (4–6 weeks after release)

App Store Connect → App Analytics → Acquisition → Source Type → App Store Search, and impressions per
term in a free Apple Ads account. Swap any keyword with no impressions. Next candidates: `illustrious`,
`tutor`, `index`, `shoe`.

## Follow-ups (not done here)
- **Ratings are the biggest gap.** "Not enough ratings" next to competitors with 5–10K ratings
  hurts conversion more than any text. The in-app review prompt exists; don't add more prompts and
  never reward a rating.
- The Spanish (Mexico) listing is also indexed in the US. Its keywords should not repeat English
  words (for example `hi-lo` appears in both); review it separately.
- Keyword-linked custom product pages (from ASO.md §2) are still a good next step once the main
  page converts.
