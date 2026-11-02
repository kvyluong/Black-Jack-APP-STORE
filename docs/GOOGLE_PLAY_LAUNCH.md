# ShoeSharp: Google Play launch runbook

The Android counterpart of [APP_STORE_LAUNCH.md](APP_STORE_LAUNCH.md): from this repo to
ShoeSharp live on Google Play with ads and the same "Remove ads" purchase, as the same
**no-betting** app as iOS 1.0.0 (build 13): no chips, bets, bankroll or prizes anywhere.

**Who does what.** Every remaining step happens in Play Console or on the owner's
accounts, so each is marked:
- **🛑 OWNER**: payments, identity checks, legal agreements and the final rollout button.
- **👤 Play Console**: clicks and form answers in Play Console (or the EAS dashboard). The
  owner does these; every answer to type is written out below.
- **🤖 Repo**: done in this repo; nothing to do.

**Timing.** Ship Android right after Apple approves iOS 1.0.0 (13), so both stores start
from the same no-betting version. But new personal Play accounts can't publish to
everyone straight away: Google first requires a **closed test with at least 12 testers,
kept opted in for 14 days in a row** (step 5). Start that the day "Create app" unlocks,
even before Apple answers; it's the long pole.

---

## 0. Repo readiness (🤖 done 2026-11-01)
- [x] **Package** `com.kvyluong.shoesharp`; version `1.0.0`; `versionCode` is kept by EAS
  (`appVersionSource: remote`, `autoIncrement`): the last Android build was 2, the next is 3.
- [x] **Permissions** in the merged manifest: `INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`
  and `AD_ID` (AdMob), `com.android.vending.BILLING` (Remove ads), `POST_NOTIFICATIONS` and
  `RECEIVE_BOOT_COMPLETED` (the optional daily reminder; Android 13+ asks for it when the
  player turns the reminder on), `VIBRATE`, `MODIFY_AUDIO_SETTINGS`. `app.json`
  `android.blockedPermissions` strips the ones nothing uses: storage read/write (from
  expo-file-system), `SYSTEM_ALERT_WINDOW` (template default) and `RECORD_AUDIO`.
  No exact-alarm permission: reminders fall back to inexact alarms, so no Play
  exact-alarm declaration is needed.
- [x] **Config plugins:** `withoutPushEntitlement` and `withSceneLifecycle` only touch iOS
  files (entitlements, Info.plist, AppDelegate); on Android they do nothing.
  `expo-notifications` creates the "Daily reminders" channel before asking permission.
- [x] **Adaptive icon** (foreground, background, monochrome) and splash set in `app.json`.
- [x] **AdMob Android** app ID `ca-app-pub-2452034460168771~8351378637` and the Android
  interstitial unit in `extra.adUnits.android` (banner and rewarded units are no longer used).
- [x] **Remove ads** product ID `remove_ads` (`extra.iap.removeAds`). On Android the purchase
  is acknowledged as soon as it's delivered, pending payments don't unlock, and a purchase left
  unacknowledged (app closed mid-purchase) is acknowledged on next launch or Restore, so
  Google doesn't refund it after 3 days.
- [x] **`eas.json`**: `production` builds an `.aab` (`buildType: app-bundle`);
  `submit.production.android` uploads to the **internal** track as a **draft** (required
  until the app has been published once; switch `releaseStatus` to `completed` after launch).
- [x] **Store assets** checked against the no-betting build: phone, tablet and feature
  graphics show no chips or bets (step 6).

## 1. Play Console account
- [ ] **🛑 OWNER: Google Play Console** at https://play.google.com/console/signup
  - Account type **Personal** (a company needs a D-U-N-S number).
  - One-time **$25** fee, then identity verification with a government ID. Approval can take a few days.
  - Status (2026-10-18): account created and paid (personal, developer name "9in1shampoo", account ID 7923078639624714826). Still to do: **verify identity** (upload an ID), **verify an Android device** (sign in to the Play Console app on an Android phone), then **verify the contact phone**. "Create app" stays locked until these are done.
- [ ] **🛑 OWNER: Payments profile / merchant account**: Play Console → Settings → Payments profile. Needed to sell "Remove ads". It can reuse the Google payments profile AdMob created (same Google account).

## 2. AdMob (Android)
- [x] AdMob → Apps → Add app → **Android**, "not listed yet" (app ID `ca-app-pub-2452034460168771~8351378637`).
- [x] Ad units created, IDs in `app.json` (`androidAppId` and `extra.adUnits.android`). Since the no-betting rebuild only the interstitial is used (banner and rewarded removed).
- [ ] **👤 AdMob** → Privacy & messaging: add the **Android** ShoeSharp app to the "ShoeSharp GDPR consent" message (Your apps → edit → tick it, with the same privacy policy URL) and publish. The IDFA explainer is iOS-only.
- [x] `app-ads.txt` already covers Android: it lists the publisher ID, not an app.

## 3. Create the app in Play Console
- [ ] **👤 Play Console → Create app**: name `ShoeSharp: Blackjack Trainer`, default language English (United States), **Game**, **Free**.
- [ ] **🛑 OWNER:** accept the declarations (Developer Program Policies, US export laws).
- [ ] **👤 Play Console:** add the **Spanish (Latin America) – es-419** translation for the listing (step 6).

## 4. Build, first upload, service account
The 2026-10-18 build (1.0.0, versionCode 2) is **out of date**: it still has betting and
lacks the daily reminder. Don't upload it.
- [ ] **New production build** (uses 1 EAS build; ask before running):
  `npx eas-cli@latest build --platform android --profile production` → 1.0.0 (versionCode 3), an `.aab`. EAS creates and keeps the upload key.
- [ ] **👤 Play Console: first upload by hand.** Google's API can't create an app's very first
  release, so `eas submit` fails until one build has been uploaded in the Console: download the
  `.aab` from the EAS build page, then Testing → Internal testing → Create release → upload it.
- [ ] **👤 Google service account key** so later builds go up with `eas submit`: follow https://github.com/expo/fyi/blob/main/creating-google-service-account.md, then upload the JSON in the EAS dashboard → Credentials → Android → `com.kvyluong.shoesharp` → Google service account key. **🛑 OWNER:** grant the account access in Play Console → Users and permissions. Keep the JSON out of the repo.
- [ ] Later builds: `npx eas-cli@latest submit --platform android --latest` (internal track, draft; promote in the Console).

## 4b. Emulator check on the Mac (done 2026-10-18, before the no-betting rebuild)
EAS `preview` build (APK) on an Android 15 Pixel 8 emulator: splash, icon, level picker, home, Casino Floor and the table all worked, and the tab bar cleared the gesture bar. Not covered: purchases (needs Play), ads ("no fill", code 3, until the app is live and linked in AdMob, step 10), and the EU consent form (step 2). Re-check the no-betting build on the closed test (step 5) rather than spending another EAS build on an APK.

To run it again: `$ANDROID_HOME/emulator/emulator -avd ShoeSharp_Pixel`, with `ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`, then install a `preview` APK with `adb install -r`.

## 5. Closed test (start early: 12 testers × 14 days)
- [ ] **👤 Play Console** → Testing → **Closed testing** → create a track, add the build, and a tester list (Google Group or email list) with **at least 12** people. Tell them to accept the opt-in link **and keep the app installed**; anyone who opts out resets their 14 days.
- [ ] Note the start date here: ____ . Earliest production application: start + 14 days.
- [ ] Testers check what the iPhone checklist checks (APP_STORE_LAUNCH.md step 7): consent form (EU/UK), level picker, interstitial ads only (no banners, no reward videos, no chips or bets anywhere), Remove ads purchase (licence testers buy for free) and restore, the daily reminder (Android 13+ permission prompt, then a notification the next day), sound, vibration, Spanish.
- [ ] **👤 Play Console:** add the testers' Gmail addresses under Settings → **License testing**, so their test purchases aren't charged.

## 6. Store listing (👤 Play Console → Grow → Store presence → Main store listing)
Play has no keyword field: it indexes the title, short and full description. No word in
the listing describes betting, chips or prizes, and Play's metadata rules are met (no
"free", "best" or "#1" in the title, no emoji or ALL-CAPS gimmicks in the name).

| Field (limit) | English (en-US) | Spanish (es-419) |
|---|---|---|
| App name (30) | `ShoeSharp: Blackjack Trainer` (28) | `ShoeSharp: Blackjack y Conteo` (29) |
| Short description (80) | `Learn blackjack basic strategy and card counting, with a coach at every hand.` (77) | `Aprende estrategia básica de blackjack y a contar cartas, con un coach al lado.` (79) |
| Full description (4000) | below (1559) | below (1667) |

Adapted from [APP_STORE_LISTING.md](APP_STORE_LISTING.md): "iPhone and iPad" → "Phones and
tablets", and the closing line says there is nothing to win or lose instead of naming
betting and chips.

### Full description (en-US)
```
Learn to play perfect blackjack and count cards like a pro, with a coach at your side.

Everything is free: no paywall, no subscription, no account.

ShoeSharp takes you from your first hand to counting a six-deck shoe under real casino conditions. Start at your level: brand new, already know how to play, or already counting.

PLAY PERFECT BASIC STRATEGY
• A full seven-seat casino table with players who come and go
• Ask the coach for the best play anytime, and see why you were wrong
• Strategy chart that follows your table rules (decks, soft 17, surrender)
• "Your Leaks" finds the decisions you miss most and drills them

LEARN TO COUNT CARDS
• Nine short lessons: from the rules to the Hi-Lo count and the true count
• Counting Academy: learn the count by seeing, hearing, tapping or chunking cards
• Running count, true count and deck estimation drills
• Four counting systems: Hi-Lo, KO, Hi-Opt I and Omega II
• The Illustrious 18 and Fab 4 count plays as flash cards with spaced review

GET CASINO-READY
• Casino Conditions test: a full shoe, faster dealer, chatty players, no help on screen
• Casino-ready score that shows exactly what to practice next
• Progress charts, daily goals and streaks
• Practice casino hand signals: tap to hit, swipe to stand

MADE FOR YOU
• English and Spanish
• Phones and tablets
• No account needed: your progress stays on your device
• Every feature free: ads keep it that way, and one optional purchase removes them

For entertainment and education only. There is nothing to win or lose: every hand is practice.
```

### Descripción completa (es-419)
```
Aprende a jugar blackjack perfecto y a contar cartas como un profesional, con un coach a tu lado.

Todo es gratis: sin muro de pago, sin suscripción y sin cuenta.

ShoeSharp te lleva desde tu primera mano hasta contar un zapato de seis barajas en condiciones reales de casino. Empieza a tu nivel: si eres nuevo, si ya sabes jugar o si ya cuentas cartas.

JUEGA CON ESTRATEGIA BÁSICA PERFECTA
• Una mesa de casino de siete asientos con jugadores que llegan y se van
• Pregúntale al coach la mejor jugada cuando quieras y entiende por qué fallaste
• Tabla de estrategia que sigue las reglas de tu mesa (barajas, 17 blando, rendición)
• "Tus fugas" encuentra las decisiones que más fallas y las entrena

APRENDE A CONTAR CARTAS
• Nueve lecciones cortas: de las reglas al conteo Hi-Lo y el conteo real
• Academia de conteo: aprende viendo, escuchando, tocando o agrupando cartas
• Ejercicios de conteo continuo, conteo real y estimación de barajas
• Cuatro sistemas de conteo: Hi-Lo, KO, Hi-Opt I y Omega II
• Las Ilustres 18 y las Fab 4 en tarjetas con repaso espaciado

PREPÁRATE PARA EL CASINO
• Examen en condiciones de casino: un zapato completo, crupier rápido y sin ayudas
• Puntaje para el casino que te dice exactamente qué practicar
• Gráficas de progreso, metas diarias y rachas
• Practica las señas de mano del casino: toca para pedir, desliza para plantarte

HECHO PARA TI
• Español e inglés
• Teléfonos y tabletas
• Sin cuenta: tu progreso se guarda en tu dispositivo
• Todas las funciones gratis: los anuncios lo mantienen así y una compra opcional los quita

Solo para entretenimiento y aprendizaje. No hay nada que ganar ni perder: cada mano es práctica.
```

### Graphics (all checked 2026-11-01 against the no-betting build)
- [ ] **App icon** 512×512 PNG: `store-assets/play/icon-512.png`.
- [ ] **Feature graphic** 1024×500, no alpha: `store-assets/play/feature-graphic-en.png` / `-es.png` (icon and title only, no chips).
- [ ] **Phone screenshots** 1080×1920 (9:16): `store-assets/play/phone/en-US` and `es-419`, 01–06 in order.
- [ ] **Tablet screenshots** 1440×2560 (9:16, Play's large-screen rule): `store-assets/play/tablet/en-US` and `es-419`, 01–06, for both the 7-inch and 10-inch slots. (The iPad frames are 3:4 and don't qualify.)
- [ ] **Preview video: skip for launch.** `store-assets/video/trailer-16x9-*.mp4` (and the iOS previews) were cut before the no-betting rebuild and show chip counts and "$30" bets. Re-shoot with `scripts/store-video/` on the current build first; Play then takes it as a YouTube link (public or unlisted, ads off).
- [ ] **👤 Store settings:** app category **Card**; tags **Card**, **Educational** (and **Single player** if offered). Don't pick "Casino" tags: they steer Play towards treating it as a gambling app. Contact email, website `https://kvyluong.github.io/Black-Jack-APP-STORE/`.

To rebuild the graphics: `scripts/store-screenshots/README.md` (`node compose.mjs ../../store-assets/screenshots tablet` composes just the tablet set).

## 7. App content (👤 Play Console → Policy → App content)
- [ ] **Privacy policy:** `https://kvyluong.github.io/Black-Jack-APP-STORE/privacy.html`
- [ ] **Ads:** Yes, the app contains ads.
- [ ] **App access:** All functionality is available without special access (no login).
- [ ] **Content rating (IARC questionnaire)**, category **Game**. Answers:
  | Question | Answer |
  |---|---|
  | Violence, blood, fear, sexuality, nudity, crude humor, profanity | No |
  | Controlled substances (drugs, alcohol, tobacco) | No |
  | **Simulated gambling** | **No**: there are no chips, bets, bankroll, payouts or prizes; it teaches strategy and counting, and every hand is practice |
  | Real-money gambling, or rewards with real-world value | No |
  | References to gambling / a casino card game shown (if asked as its own question) | Yes: it depicts blackjack and talks about casinos |
  | Users can interact or exchange content (chat, UGC) | No |
  | Shares the user's location with other users | No |
  | Purchases of digital goods | Yes (Remove ads) |
  | Unrestricted internet / web browser | No |

  Expect roughly ESRB Everyone 10+ / PEGI 12 or so; take whatever comes out of the answers.
- [ ] **Target audience:** **18 and over** only (it teaches a casino game and card counting). Not designed for children, which keeps it out of the Families program. This is a choice, not forced by simulated gambling (there is none).
- [ ] **Data safety** (everything below is collected by the Google Mobile Ads SDK; the app has no accounts, keeps progress on the device, and reminders are local notifications):

  | Data type | Collected | Shared | Purpose | Optional? |
  |---|---|---|---|---|
  | Device or other IDs (advertising ID) | Yes | Yes | Advertising or marketing; Analytics | Users can reset or delete the ad ID |
  | App activity → App interactions | Yes | Yes | Advertising or marketing; Analytics | Required |
  | App info and performance → Crash logs, Diagnostics | Yes | Yes | Analytics | Required |
  | Location → Approximate location (from IP) | Yes | Yes | Advertising or marketing | Required |

  Not collected: personal info, financial info (Google Play handles the purchase), messages, photos, audio, files, contacts, calendar, health, web history. Data is encrypted in transit: **Yes**. Deletion: no account data is stored; progress stays on the device and uninstalling deletes it. If a URL is asked for: `https://kvyluong.github.io/Black-Jack-APP-STORE/privacy.html#delete`. Check against Google's "Data disclosure for Google Mobile Ads SDK" before submitting.
- [ ] **Advertising ID:** Yes, used for **Advertising or marketing** (the AdMob SDK adds `AD_ID`).
- [ ] **Government apps / financial features / health / news:** No.

## 8. In-app product (👤 Play Console)
Play only lets you create products after a build with billing has been uploaded (step 4).
- [ ] Monetize → Products → **One-time products** (formerly "In-app products") → Create: product ID **`remove_ads`** (must match `extra.iap.removeAds`), name "Remove ads" / "Quitar anuncios", description as in APP_STORE_CONNECT.md §6, price **USD 2.99**. **Activate** it.

## 9. Production
- [ ] **👤 Play Console:** when the closed test has run 14 days with 12+ testers, Dashboard → **Apply for production** (answer the questions about the test honestly). Google usually replies within about a week.
- [ ] **🛑 OWNER:** Production → Create release → the latest build → roll out. Review usually takes a few days.

## 10. After launch
- [ ] **👤 AdMob** → the Android app → **App settings → link to the Google Play listing**, so ads serve at full rate.
- [ ] 🤖 Add a **Get it on Google Play** badge next to the App Store link on the website.
- [ ] 🤖 In `eas.json`, set `submit.production.android.releaseStatus` to `completed` (drafts are only needed before the first publish).
- [ ] Updates: same as iOS: `npx eas-cli@latest update` for JS-only fixes; new builds through `eas build` + `eas submit`.
