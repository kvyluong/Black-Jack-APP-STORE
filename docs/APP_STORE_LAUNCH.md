# ShoeSharp: App Store launch runbook

Step by step from this repo to ShoeSharp live on the iOS App Store with AdMob ads and a
"Remove ads" purchase. It's written to be followed by the owner with Claude running on
their Mac (Claude Desktop or `claude remote-control`).

**🛑 OWNER** marks steps only the owner can do: payments, identity checks, two-factor
codes, bank and tax details, and accepting Apple's or Google's legal agreements. Claude
should open the right page and explain the step, then wait.

Everything else Claude can do: fill in forms, edit files, run commands.

Tick boxes as you go and commit this file, so the next session knows where things stand.

Android / Google Play has its own runbook: [GOOGLE_PLAY_LAUNCH.md](GOOGLE_PLAY_LAUNCH.md).

---

## 0. Mac setup
- [x] Install Node.js LTS (nodejs.org) and git.
- [x] `git clone https://github.com/kvyluong/Black-Jack-APP-STORE && cd Black-Jack-APP-STORE`
- [x] Work on `main` (the clone starts there once `main` is the default branch; otherwise `git checkout main`).
- [x] `npm install`
- [x] Check it's healthy: `npx tsc --noEmit && npx expo lint && npx jest`
- [x] Xcode is **not** needed: EAS builds and signs in the cloud.

## 1. Accounts
- [x] **🛑 OWNER: Apple Developer Program** (approved 2026-10-19) at https://developer.apple.com/programs/enroll/
  - $99/year. Individual, unless there's a company.
  - Approval usually takes 1–2 days.
- [x] **🛑 OWNER: AdMob** at https://admob.google.com
  - Sign up.
  - [x] Payments: profile and W-9 done. The bank account is added later: Google asks once earnings reach about $10 and mails a PIN to verify the address. AdMob pays monthly once the balance passes $100.
- [x] **Expo account** at https://expo.dev/signup (free).
- [x] `npx eas-cli@latest login`

## 2. App identity
- [x] **🛑 OWNER: choose the bundle ID**, e.g. `com.kvyluong.shoesharp`. It can't change after release.
- [x] Put it in `app.json` → `expo.ios.bundleIdentifier`, replacing `com.REPLACE_ME.shoesharp`. Use the same value for `expo.android.package`.
- [x] `npx eas-cli@latest init`, which links the EAS project and adds `extra.eas.projectId` to `app.json`.
- [x] App icon and splash screen. `assets/icon.png` is still the template:
  - replace it with a 1024×1024 PNG with no transparency;
  - update `assets/splash-icon.png`.
- [x] Commit.

## 3. AdMob (iOS)
- [x] In AdMob, **Apps → Add app → iOS**. Choose "not listed yet"; you link it after launch (step 9).
- [x] Create 3 ad units: **Banner**, **Interstitial** and **Rewarded**.
- [x] Put the IDs in `app.json`:
  - the AdMob **app ID** (`ca-app-pub-…~…`) → `plugins` → `react-native-google-mobile-ads` → `iosAppId`, replacing Google's test ID;
  - the 3 **unit IDs** (`ca-app-pub-…/…`) → `extra.adUnits.ios.banner`, `.interstitial` and `.rewarded`.
- [x] Leave the Android placeholders. Units still set to `REPLACE…` simply show no ads (see `src/ads/config.ts`). Development builds always use Google's test ads.
- [x] **Publisher ID** (`pub-…`, from AdMob → Settings → Account): put it in `website/app-ads.txt`.
- [x] Optional: **AdMob → Privacy & messaging**. Create the GDPR (EU/UK) message and the IDFA explainer for iOS. The app already shows Google's consent form (`src/ads/init.ts`) and the iOS tracking prompt.
- [x] Commit.

## 4. Website, privacy policy, app-ads.txt
Apple requires a privacy policy URL, and the page is already written (`website/privacy.html`). AdMob reads `app-ads.txt` only at the **root of a domain**.

- [x] **🛑 OWNER:** GitHub repo → Settings → General → **Default branch → `main`**. The website deploys only from the default branch.
- [x] **🛑 OWNER:** GitHub repo → Settings → Pages → Source: **GitHub Actions**. `.github/workflows/site.yml` then deploys `website/` to https://kvyluong.github.io/Black-Jack-APP-STORE/
- [x] **Privacy policy placeholders:** (filled 2026-10-19: Kevin Luong, kvy.luong@gmail.com) fill in `REPLACE_WITH_DEVELOPER_NAME`, `REPLACE_WITH_CONTACT_EMAIL` and `REPLACE_WITH_DATE` in `website/privacy.html` and `website/es/privacidad.html` before submitting (the owner picks the public contact email).
- [x] Privacy policy URL for App Store Connect: https://kvyluong.github.io/Black-Jack-APP-STORE/privacy.html
- [x] Root domain for `app-ads.txt`. **Done with option B:** https://kvyluong.github.io/app-ads.txt (repo `kvyluong/kvyluong.github.io`). In App Store Connect, use `https://kvyluong.github.io` as the Marketing URL so AdMob finds it. The owner picks one option:
  - **A)** buy a domain (e.g. `shoesharp.app`) and point it at Pages (Settings → Pages → Custom domain);
  - **B)** create a repo named `kvyluong.github.io` containing only `app-ads.txt` at its root.

  Then use that domain as the app's "Marketing URL" or developer website.
- [x] Update `expo.extra.website` in `app.json` if the domain changes. The in-app privacy link uses it. (No change needed: the website stays at kvyluong.github.io/Black-Jack-APP-STORE.)

## 5. App Store Connect: app record and purchase
Every value for steps 5 and 6, screen by screen, is in **docs/APP_STORE_CONNECT.md**. Captioned screenshots are ready in `store-assets/screenshots/` (rebuild with `scripts/store-screenshots/`).

- [x] **🛑 OWNER:** App Store Connect → **Business** (Agreements, Tax, and Banking) (done 2026-10-19: W-9 active; Paid Apps agreement, bank and EU trader verification processing):
  - accept the **Paid Apps** agreement;
  - add bank and tax details.

  Without this, "Remove ads" can't be sold.
- [x] **Apps → + → New App** (created 2026-10-19: "ShoeSharp: Blackjack Trainer", Apple ID 6824730148, in `eas.json` → `submit.production.ios.ascAppId`): iOS. Name **ShoeSharp** (if it's taken, try "ShoeSharp: Blackjack Trainer"). Primary language English (U.S.). The bundle ID from step 2, and SKU `shoesharp`.
- [x] **In-App Purchases → +** (created 2026-10-19, Apple ID 6824753924; still needs the review screenshot from TestFlight):
  - type **Non-Consumable**;
  - product ID **`remove_ads`**, which must match `extra.iap.removeAds`;
  - reference name "Remove ads";
  - price $2.99–$4.99;
  - display name and description in English and Spanish: "Remove ads" / "Quitar anuncios", and "No more ads between hands. Rewarded bonus chips stay available." / "Sin anuncios entre manos. Las fichas extra con anuncio siguen disponibles.";
  - review screenshot: the Settings screen showing the Remove ads button.


**Status 2026-10-19 (App Store Connect, filled in by Claude):** App Information (subtitle, Games → Card + Education, content rights, Spanish (Mexico) name and subtitle), age rating questionnaire (**18+**), price Free in 173 countries (China mainland and South Korea left out: they need a game licence / GRAC rating), App Privacy answers (from the Google Mobile Ads privacy manifest; **saved, not published**), version 1.0.0 page in English and Spanish (promo text, description, keywords, support and marketing URLs, copyright, review notes, sign-in not required, manual release) with **build 2 attached**.
Still to do: Paid Apps agreement + bank + tax and EU trader status (owner), publish App Privacy (owner attests), App Review contact name/phone/email (owner), screenshots (drag in from `store-assets/screenshots/`), the `remove_ads` purchase (needs the Paid Apps agreement), privacy policy placeholders, TestFlight test on the phone, then Submit for Review.

## 6. Store listing
All listing text, search-optimized and length-checked, is in **docs/APP_STORE_LISTING.md**: name, subtitle, keywords, promotional text, description and screenshot captions, in English (U.S.) and Spanish (Mexico). Copy it from there.
- [x] English (U.S.) name, subtitle, keywords, promotional text and description.
- [x] Add the **Spanish (Mexico)** localization with its own name, subtitle, keywords and description. The US store indexes it too, so it's a second keyword field.
- [x] **Category:** primary Games → Card; secondary Education.
- [ ] **Screenshots:**
  - required: iPhone 6.9" (1320×2868) and, because `ios.supportsTablet` is true, iPad 13" (2064×2752);
  - 3–6 each, of Home, the table with the coach, Practice, the count drill, Road to the Casino, and the Casino Conditions report;
  - capture them from the web build at those sizes, or from the simulator or TestFlight build.
- [ ] **App Previews** (optional, autoplay above the screenshots): `store-assets/video/` has 24 s captioned previews for iPhone 6.9" (886×1920) and iPad 13" (1200×1600) in English and Spanish, recorded on the simulator. Rebuild with `scripts/store-video/` (see its README).
- [x] **Support URL:** the website.
- [x] **Age rating questionnaire:** "Simulated Gambling" = **Frequent/Intense**, which gives **17+**; everything else None.
- [ ] **App Privacy (nutrition labels):**
  - Data used to track you: **Device ID** (advertising identifier, via AdMob).
  - Data linked to you: none (no accounts).
  - Data not linked to you: **Product interaction**, **Advertising data**, **Crash data**, **Performance data** (collected by the Google Mobile Ads SDK).
  - Re-check against Google's current AdMob guidance for Apple's privacy labels before submitting.
- [x] **Review notes:** "ShoeSharp is a blackjack training app. No real-money gambling: chips are virtual, can't be bought or cashed out, and have no value. The only purchase removes ads."

## 6b. Simulator check on the Mac (done 2026-10-18)
EAS `simulator` profile build on the iOS 27.1 simulator (iPhone Duo): the splash, the IDFA explainer, Apple's tracking prompt (declining it still lets you use everything), the level picker, Casino Floor, a Google **test** banner, the bonus-chips button and the table (deal, other players) all work. Not covered: purchases and real ads (TestFlight, step 7).

To run it again: `npx eas-cli@latest build --platform ios --profile simulator`, unpack the `.tar.gz`, then `xcrun simctl install booted ShoeSharp.app` and `xcrun simctl launch booted com.kvyluong.shoesharp`.

## 7. Test build on the owner's iPhone (TestFlight)
A production/TestFlight build uses the **real** ad units, unlike development builds.
**Never tap your own live ads**: AdMob can suspend the account. Before installing, add the
iPhone as a test device (AdMob → Settings → Test devices, using the phone's IDFA), so it
gets test ads.

- [ ] `npx eas-cli@latest build --platform ios --profile production`
  - The first time, EAS asks to log in to Apple and creates the certificates and profiles. **🛑 OWNER:** approve the Apple two-factor prompt.
- [ ] `npx eas-cli@latest submit --platform ios --latest`, which uploads to App Store Connect / TestFlight.
- [ ] App Store Connect → TestFlight: add the owner as an internal tester, then install from the **TestFlight** app.
- [ ] **🛑 OWNER on the phone**, checking each of these:
  - [ ] first launch shows the tracking prompt (and the consent form in the EU/UK);
  - [ ] the level picker works (new / know how to play / count cards);
  - [ ] no banner anywhere (removed 2026-10-20), an interstitial appears between some hands, and the rewarded bonus-chips button pays out;
  - [ ] Remove ads buys (sandbox account) and ads disappear;
  - [ ] Restore purchase works after reinstalling;
  - [ ] sound, vibration and hand signals (tap = hit, swipe = stand) work;
  - [ ] Spanish works (phone language or Settings).
- [ ] Fix anything found, then rebuild (`autoIncrement` bumps the build number).

## 8. Submit
- [ ] In the version page, select the TestFlight build, then fill in what's missing (copyright: "2026 <owner name>").
- [ ] **🛑 OWNER:** press **Submit for Review**. Review usually takes 1–3 days.
- [ ] If it's rejected: read the note, fix, resubmit. The most common casino-app issue is real-money confusion; the review notes and in-app disclaimer cover that.

## 9. After launch
- [ ] **Google Search Console** (search.google.com/search-console): add the website, verify it, and submit `sitemap.xml`. The build generates it, along with structured data for the app and FAQ.
- [ ] Add the Smart App Banner to `website/index.html` and `website/es/index.html`: `<meta name="apple-itunes-app" content="app-id=YOUR_APP_ID">`. iPhone visitors then see an "Open in App Store" bar.
- [ ] Update `docs/APP_STORE_LISTING.md` keywords after 4–6 weeks of App Analytics data.
- [ ] AdMob → the app → **App settings → link to the App Store listing**, so ads serve at full rate.
- [ ] Check `app-ads.txt` shows as verified in AdMob (it can take up to 24 hours).
- [ ] Watch AdMob for a week; earnings take a few days to settle.
- [ ] Updates: JS-only fixes can go out with `npx eas-cli@latest update`. Anything native needs a new build and review.

---
Commands use `npx` because the repo uses npm (`package-lock.json`). Install packages with
`npx expo install <pkg>`, never with `npm install <pkg>`. See `AGENTS.md`.
