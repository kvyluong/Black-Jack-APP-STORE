# ShoeSharp

**Blackjack & Card Counting Trainer.** (Formerly "Blackjack Coach": renamed because several apps already use "Blackjack Coach"-style names.)

A mobile blackjack trainer for iOS and Android that teaches new players to play perfect basic strategy and count cards (Hi-Lo). Ad-supported with Google AdMob. Play money only.

Built with [Expo](https://expo.dev) (React Native + TypeScript), so one codebase ships to both app stores.

## Features

- **Road to the Casino**: a casino-ready score built from the benchmarks serious counters use (99%+ basic strategy over your last 200 decisions, a full deck counted exactly in under 30 seconds, true count conversion, every count play learned, deck estimation within half a deck, a passed casino-conditions test, all lessons), each with progress, why it matters and a practice button, plus the next step to work on.
- **Daily goals and progress charts**: three goals a day with chip and XP rewards and a streak; charts of accuracy, hands, best deck time and test grades over time.
- **Casino Conditions test**: one full shoe with no hints or count on screen, chatty players, a faster dealer and a discard tray; decks-left questions during the shoe, then the running and true count at the end, and a report card grading play, count, bets and deck estimates.
- **Count Plays trainer**: the Illustrious 18, Fab 4 and insurance as flash cards with spaced review ("play it" and "name the index"), answers straight from the coach's own logic (including H17 index changes).
- **Bankroll simulator**: bet spread, rules and bankroll in; edge, average bet, win per hour, swings, N0, risk of ruin and the bankroll for 5% / 1% risk out. True-count frequencies come from simulated shoes; the advantage and variance figures were checked against the app's own engine.
- **Counting systems**: Hi-Lo, KO, Hi-Opt I and Omega II across the table count, Academy, drills and card tags (lessons and count plays stay Hi-Lo). Computer card counters at the table always count Hi-Lo.
- **Hand signals**: tap the felt to hit, swipe sideways to stand, like a real casino (Settings).
- **Deck estimation drill**: read a discard tray and judge the decks left.
- **Tablets**: screens become a centered column on iPads and wide browser windows.
- **Guided first hands**: on first launch, a coach walks new players through two scripted practice hands: standing on 17 against a weak dealer 6, then hitting 8 against a 9. Only the right button is enabled, and every step matches basic strategy (a unit test checks this). It ends with a first look at counting: the cards from both hands with their Hi-Lo tags and the running count. It can be skipped at any time and replayed from Settings.
- **Your leaks**: every decision at the table and in the strategy drill is sorted into a type (hard 11 or less, stiff 12–16, hard 17+, soft hands, pairs, insurance). After 5 decisions of a type you see your accuracy for it, weakest first, plus the exact spots you miss most (e.g. "Soft 18 vs 9: best play Hit"). "Drill my weakest spot" opens a strategy drill that deals only that kind of hand.
- **Accessibility**: count tags always pair a shape with the number (▲ +1, ● 0, ▼ −1), so they never rely on color alone. A color-blind mode in Settings swaps green/red for blue/orange throughout. Seats at the table read out as one sentence to screen readers (player, style, bet, cards, result).
- **Lessons**: 10 short lessons from the rules to true count and index plays, each ending in a quiz.
- **Chip progression**: you start with 1,000 chips, and your stack carries over between sessions. Five tables with rising limits (Main Floor $5–$100, Downtown $25–$500, The Strip $100–$2,000, High Limit Room $500–$10,000, Private Salon $2,500–$50,000) unlock permanently the first time your chips reach 2.5K, 10K, 50K and 250K. Bets are built from a casino chip tray. XP from hands played and correct decisions raises your level (Rookie → Regular → Card Sharp → Counter → Advantage Player → Legend). If you can't cover a table's minimum you're offered a cheaper table, and if you go broke you get a free refill to 1,000. Chips can't be bought or cashed out, which keeps the app clear of the stores' social-casino rules.
- **Haptics**: a light tap as each of your cards lands (other players' cards stay quiet), a soft tap when the hole card flips, and patterns for wins, big wins, blackjacks and busts. Chip taps and bonus chips buzz too. Toggle in Settings; the HTML build vibrates on Android browsers.
- **Bonus chips from rewarded ads**: an optional "Watch an ad: +500 chips" button at the table and in the Casino Floor lobby. Chips are granted only when the ad reports it was watched to the end, up to 5 times a day (resets at local midnight). The bonus is 20 minimum bets at your best unlocked table (500 at the start, up to 50,000 at the Private Salon). In development builds without the ad SDK (Expo Go, web) a labeled test ad stands in; the HTML build shows a 5-second preview.
- **A real casino table**: seven seats with computer players who sit down and leave between rounds (broke, bored, or up and cashing out). Before each deal you choose to play one hand or two, right in the betting panel (also in Settings). Cards are dealt around the table in casino order, seat 1 ("first base") on the right, and every player's cards count toward the running count. Each player has a style shown under their name: plays by the book, counts cards (watch their bets rise with the count), plays hunches, never busts, copies the dealer, or high roller. When someone plays against basic strategy, their speech bubble flags it ("Stand ✗ book: Hit").
- **Practice table**: a full blackjack game (splits, doubles, surrender, insurance, multi-deck shoe with penetration) with a coach that:
  - highlights the best play before you act (optional)
  - explains mistakes in plain English after you act
  - shows running count, decks remaining and true count, with a suggested bet
  - can quiz you on the running count between hands
  - can switch to count-based advice (Hi-Lo index plays, insurance at +3)
- **Counting Academy**: five ways to learn the Hi-Lo count, one per way people like to learn, each built on a technique with research behind it:
  - *See it, Color Count* (visual): cards glow green/gray/red (blue/gray/orange in color-blind mode) beside a count meter; the hints fade out over five levels.
  - *Hear it, Sound Count* (listening): a tag sound per card plus the count spoken aloud at early levels, ending eyes-free.
  - *Do it, Tag Tap* (hands-on): tap −1/0/+1 on each card against a shrinking clock (retrieval practice).
  - *Chunk it, Pair Cancel*: call the total of pairs, then groups of three and four, the way fast counters work.
  - *Read it, Count Story* (reading): a written round at the table; later levels reveal it one line at a time.

  Players pick how they like to learn, which only sets the order: matching lessons to a "learning style" isn't supported by research, but mixing methods helps everyone. So a **daily workout** mixes three modes, favors the ones due for review (reviews spread out to 1, 2, 4, 7 and 14 days as you improve) and keeps a day streak. Scoring 90%+ levels a mode up; all rounds earn XP.
- **Drills**: basic strategy flash cards, running count (adjustable speed, 1 or 2 cards at a time), true count conversion.
- **Deal animations and sound effects**: cards slide out of the shoe one at a time in casino order, the hole card flips over, and chip, card, shuffle and win/lose sounds play in time. Totals, results and buttons wait until the cards land so nothing is spoiled. Sound can be turned off in Settings and follows the iPhone silent switch; animations turn off when the phone's Reduce Motion setting is on.
- **Game feel** (inspired by Balatro): cards land with a bounce and sway gently while idle; wins pop up as big tilted text with a burst of chips, and the bankroll counts up with ticking; blackjacks, big wins and busts shake the table; a streak badge grows with every correct play and the chime climbs in pitch. In the browser, cards also tilt toward your mouse and the felt slowly swirls. Effects can be turned off in Settings ("Big effects") and respect Reduce Motion.
- **Strategy chart**: generated from the same engine as the coach, so it always matches your table rules.
- **Configurable rules**: 1/2/6/8 decks, S17/H17, DAS, late surrender, 3:2 or 6:5.
- **Remove ads**: a one-time in-app purchase (expo-iap, App Store and Google Play) that turns off the banner and the between-hand ads. The local price comes from the store; purchases restore automatically on a new phone, and there's a Restore button (Apple requires one). Optional bonus-chip videos stay, since players choose to watch those. Development builds without a store simulate the purchase.
- **English and Spanish**: everything, including the lessons, coach explanations, Academy stories and spoken counts, is in both languages. The app follows the phone's language, or players pick one in Settings.
- **Ads**: an anchored adaptive banner, plus an interstitial shown only between hands (at most every 10 hands and every 3 minutes). GDPR/UMP consent and a privacy-options entry in Settings.

## Test it in a browser (Windows, Mac, anything)

`html/shoesharp.html` is the whole app in one file, built from the same code as the phone app. Download it and double-click it: no install, no server. Progress saves in your browser. Ads and the Remove ads purchase are phone-only, so they don't appear.

Desktop extras: keyboard shortcuts at the table (H hit, S stand, D double, P split, R surrender, Enter to deal / next hand).

Rebuild it after changing the app:

```bash
npm run build:web
```

This runs `expo export --platform web` and folds the result into one file (`scripts/build-web.mjs`): sounds and images are inlined, and the current screen is kept in the address bar's `#` part (e.g. `shoesharp.html#/tables`) because browsers don't let a file opened from disk change its path. The same file works as the website demo.

## Website

`website/` is the marketing site: a landing page and a privacy policy, in English (`index.html`, `privacy.html`) and Spanish (`es/`), plus `app-ads.txt`. It has no external fonts, scripts or cookies. `npm run build:site` assembles it into `site-dist/` together with the playable browser version as `play.html`. It warns about any `REPLACE_WITH_…` placeholders still to fill in (`--strict` makes that an error).

The **Website** GitHub Actions workflow publishes it to GitHub Pages on every push to the default branch. One-time setup: in the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The site is then at `https://kvyluong.github.io/Black-Jack-APP-STORE/`, which is also `extra.website` in `app.json` (the app's Settings links to the privacy policy there). If you use a custom domain, update `extra.website`.

## Automatic checks

The **Checks** workflow runs on every push and pull request: lint, typecheck, unit tests, and a web build.

## Project layout

```
src/
  app/            Screens (Expo Router: each file is a route)
  engine/         Pure game logic: cards, hands, rules, basic strategy, Hi-Lo, game state machine, drills
  engine/__tests__  Unit tests, including a 20,000-hand basic strategy simulation
  content/        Lesson text and quizzes
  components/     Cards, hands, buttons and layout
  audio/          Sound effect playback (expo-audio)
  components/table/  Pieces of the table screen (felt, betting panel, turn controls, count quiz)
  ads/            AdMob setup, banner, interstitial frequency cap (web stub for previews)
  purchases/      The Remove ads in-app purchase (expo-iap; web stub)
  i18n/           Language setting and localized() text helper (English / Spanish)
  state/          Saved settings, bankroll and progress (AsyncStorage)
locales/          Localized app name for the stores
website/          Landing page, privacy policy (EN/ES) and app-ads.txt
.github/workflows Checks (lint, types, tests, web build) and the website deploy
scripts/          build-web.mjs builds html/shoesharp.html from the app;
                  make-sounds.py synthesizes assets/sounds/*.wav (no licensed audio)
html/             The built single-file HTML app
```

The engine has no React dependencies, so it is easy to test and reuse.

## Development

```bash
npm install
npm test            # engine unit tests
npm run typecheck
npm run lint
npx expo start      # dev server
```

- **Expo Go** runs the app but without ads (Expo Go can't load the AdMob native module, and the app skips ads automatically there).
- **With ads**, use a development build: `npx expo run:android` / `npx expo run:ios`, or `npx eas-cli@latest build --profile development`.
- `npx expo start --web` gives a quick browser preview (no ads).

Development builds always use Google's test ad units.

## Before you publish

1. **Pick your app ID.** Replace `com.REPLACE_ME.shoesharp` in `app.json` (`ios.bundleIdentifier` and `android.package`).
2. **Remove ads product.** In App Store Connect and the Google Play Console, create a non-consumable in-app product with the ID `remove_ads` (or change `extra.iap.removeAds` in `app.json`), and set its price ($2.99–$4.99 is typical). Test with a sandbox account (iOS) or a license tester (Android) on a development build.
3. **AdMob.** Create an AdMob account, add an iOS app and an Android app, and create a banner and an interstitial unit for each.
   - Put the **app IDs** in `app.json` under the `react-native-google-mobile-ads` plugin (`androidAppId`, `iosAppId`). They are currently Google's sample IDs.
   - Put the **ad unit IDs** (banner, interstitial and rewarded for each platform) in `app.json` under `extra.adUnits`. Release builds show no ads until these are filled in.
   - In AdMob, set up a GDPR consent message (Privacy & messaging) and, for iOS, an IDFA explainer message so the ATT prompt shows.
   - Publish an `app-ads.txt` on your developer website.
4. **Art.** Replace the placeholder icons and splash image in `assets/`.
5. **Website and privacy policy.** Turn on GitHub Pages (see Website above). In `website/privacy.html` and `website/es/privacidad.html`, fill in your name, contact email and the date, and have the policy reviewed (it's a draft, not legal advice). Use the privacy policy URL in both store listings. Fill in Google Play's Data safety form and Apple's App Privacy labels to match (advertising data, device ID, diagnostics, purchases).
   - **app-ads.txt:** put your AdMob publisher ID in `website/app-ads.txt`. AdMob only reads it at the root of a domain (`https://yourdomain.com/app-ads.txt`), not under `/Black-Jack-APP-STORE/`, so you need a custom domain on Pages (or a `kvyluong.github.io` user site) and that domain as the developer website in both stores.
6. **Build and submit** with EAS:
   ```bash
   npx eas-cli@latest build --platform all --profile production
   npx eas-cli@latest submit --platform all
   ```
   You need an Apple Developer account ($99/year) and a Google Play developer account ($25 one-time).
7. **Spanish store listings.** Add a Spanish description and screenshots in both stores so Spanish-speaking players find the app.

## App store policy notes

- **Age rating.** Simulated gambling (including blackjack trainers with play money) gets a mature rating on both stores. Answer the Apple age-rating and Google Play IARC questionnaires honestly ("simulated gambling: frequent").
- **Keep chips worthless.** Don't sell chips or let players cash out or win prizes. Selling virtual currency for a casino-style game puts it in a stricter category (Google Play "social casino" rules, region restrictions). A paid **Remove ads** purchase is fine.
- **Don't target children.** Leave the app out of Google's Families program and Apple's Kids category.
- **Ad placement.** Interstitials only appear between hands, never in the middle of a decision, which keeps them inside AdMob's placement policy.

## Ideas for next steps

- Daily practice streaks and achievements
- More counting systems (KO, Hi-Opt I) and a full Illustrious 18 / Fab 4 trainer
- Bet-spread and bankroll simulator
