# Blackjack Coach

A mobile blackjack trainer for iOS and Android that teaches new players to play perfect basic strategy and count cards (Hi-Lo). Ad-supported with Google AdMob. Play money only.

Built with [Expo](https://expo.dev) (React Native + TypeScript), so one codebase ships to both app stores.

## Features

- **Lessons**: 10 short lessons from the rules to true count and index plays, each ending in a quiz.
- **Practice table**: a full blackjack game (splits, doubles, surrender, insurance, multi-deck shoe with penetration) with a coach that:
  - highlights the best play before you act (optional)
  - explains mistakes in plain English after you act
  - shows running count, decks remaining and true count, with a suggested bet
  - can quiz you on the running count between hands
  - can switch to count-based advice (Hi-Lo index plays, insurance at +3)
- **Drills**: basic strategy flash cards, running count (adjustable speed, 1 or 2 cards at a time), true count conversion.
- **Deal animations and sound effects**: cards slide out of the shoe one at a time in casino order, the hole card flips over, and chip, card, shuffle and win/lose sounds play in time. Totals, results and buttons wait until the cards land so nothing is spoiled. Sound can be turned off in Settings and follows the iPhone silent switch; animations turn off when the phone's Reduce Motion setting is on.
- **Strategy chart**: generated from the same engine as the coach, so it always matches your table rules.
- **Configurable rules**: 1/2/6/8 decks, S17/H17, DAS, late surrender, 3:2 or 6:5.
- **Ads**: an anchored adaptive banner, plus an interstitial shown only between hands (at most every 10 hands and every 3 minutes). GDPR/UMP consent and a privacy-options entry in Settings.

## Test it in a browser (Windows, Mac, anything)

`html/blackjack-coach.html` is the whole app in one file. Download it and double-click it: no install, no server. It has every lesson, the practice table, drills, chart and settings, and saves progress in your browser. Ads appear as labelled placeholders (a banner strip, and an interstitial preview every 10 hands / 3 minutes) so you can judge how they feel.

Desktop extras: keyboard shortcuts at the table and in the strategy drill (H hit, S stand, D double, P split, R surrender, Enter to deal / next hand).

It is built from the same `src/engine` and `src/content` code as the phone app, so advice and rules always match. After changing either, rebuild it with:

```bash
npm run build:html
```

## Project layout

```
src/
  app/            Screens (Expo Router: each file is a route)
  engine/         Pure game logic: cards, hands, rules, basic strategy, Hi-Lo, game state machine, drills
  engine/__tests__  Unit tests, including a 20,000-hand basic strategy simulation
  content/        Lesson text and quizzes
  components/     Cards, hands, buttons and layout
  audio/          Sound effect playback (expo-audio)
  ads/            AdMob setup, banner, interstitial frequency cap (web stub for previews)
  state/          Saved settings, bankroll and progress (AsyncStorage)
web-html/         UI for the single-file HTML build (reuses src/engine and src/content)
scripts/          build-html.mjs bundles web-html into html/blackjack-coach.html;
                  make-sounds.py synthesizes assets/sounds/*.wav (no licensed audio)
html/             The built single-file HTML app
```

The engine has no React dependencies, so it is easy to test and reuse.

## Development

```bash
npm install
npm test            # engine unit tests
npm run typecheck
npx expo start      # dev server
```

- **Expo Go** runs the app but without ads (Expo Go can't load the AdMob native module, and the app skips ads automatically there).
- **With ads**, use a development build: `npx expo run:android` / `npx expo run:ios`, or `npx eas-cli@latest build --profile development`.
- `npx expo start --web` gives a quick browser preview (no ads).

Development builds always use Google's test ad units.

## Before you publish

1. **Pick your app ID.** Replace `com.REPLACE_ME.blackjackcoach` in `app.json` (`ios.bundleIdentifier` and `android.package`).
2. **AdMob.** Create an AdMob account, add an iOS app and an Android app, and create a banner and an interstitial unit for each.
   - Put the **app IDs** in `app.json` under the `react-native-google-mobile-ads` plugin (`androidAppId`, `iosAppId`). They are currently Google's sample IDs.
   - Put the **ad unit IDs** in `app.json` under `extra.adUnits`. Release builds show no ads until these are filled in.
   - In AdMob, set up a GDPR consent message (Privacy & messaging) and, for iOS, an IDFA explainer message so the ATT prompt shows.
   - Publish an `app-ads.txt` on your developer website.
3. **Art.** Replace the placeholder icons and splash image in `assets/`.
4. **Privacy policy.** Both stores require a privacy policy URL, and AdMob collects device identifiers. Fill in Google Play's Data safety form and Apple's App Privacy labels to match (advertising data, device ID, diagnostics).
5. **Build and submit** with EAS:
   ```bash
   npx eas-cli@latest build --platform all --profile production
   npx eas-cli@latest submit --platform all
   ```
   You need an Apple Developer account ($99/year) and a Google Play developer account ($25 one-time).

## App store policy notes

- **Age rating.** Simulated gambling (including blackjack trainers with play money) gets a mature rating on both stores. Answer the Apple age-rating and Google Play IARC questionnaires honestly ("simulated gambling: frequent").
- **Keep chips worthless.** Don't sell chips or let players cash out or win prizes. Selling virtual currency for a casino-style game puts it in a stricter category (Google Play "social casino" rules, region restrictions). A paid **Remove ads** purchase is fine.
- **Don't target children.** Leave the app out of Google's Families program and Apple's Kids category.
- **Ad placement.** Interstitials only appear between hands, never in the middle of a decision, which keeps them inside AdMob's placement policy.

## Ideas for next steps

- "Remove ads" in-app purchase
- Haptics
- Daily practice streaks and achievements
- More counting systems (KO, Hi-Opt I) and a full Illustrious 18 / Fab 4 trainer
- Bet-spread and bankroll simulator
