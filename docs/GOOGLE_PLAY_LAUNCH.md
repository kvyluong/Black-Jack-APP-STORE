# ShoeSharp: Google Play launch runbook

The Android counterpart of [APP_STORE_LAUNCH.md](APP_STORE_LAUNCH.md): from this repo to
ShoeSharp live on Google Play with AdMob ads and the same "Remove ads" purchase. Same
conventions: **🛑 OWNER** steps are payments, identity checks and legal agreements; Claude
does the rest. Tick boxes as you go and commit.

Most of the shared work is already done: the package name (`com.kvyluong.shoesharp`),
icon, EAS project, AdMob account, website and privacy policy.

**Plan for the wait.** New personal Play accounts can't publish to everyone straight
away: Google first requires a **closed test with at least 12 testers, kept opted in for
14 days in a row**. Start that test as early as possible (step 5); everything else fits
inside those two weeks.

---

## 1. Play Console account
- [ ] **🛑 OWNER: Google Play Console** at https://play.google.com/console/signup
  - Account type **Personal** (a company needs a D-U-N-S number).
  - One-time **$25** fee, then identity verification with a government ID. Approval can take a few days.
  - Verify the contact phone and email it asks for. Android device verification may also be asked for (the Play Console app on an Android phone).
  - Status (2026-10-18): account created and paid (personal, developer name "9in1shampoo", account ID 7923078639624714826). Still to do: **verify identity** (upload an ID), **verify an Android device** (sign in to the Play Console app on an Android phone), then **verify the contact phone**. "Create app" stays locked until these are done.
- [ ] **🛑 OWNER: Payments profile / merchant account**: Play Console → Settings → Payments profile. Needed to sell "Remove ads". It can reuse the Google payments profile AdMob created (same Google account).

## 2. AdMob (Android)
- [x] AdMob → Apps → Add app → **Android**, "not listed yet" (app ID `ca-app-pub-2452034460168771~8351378637`).
- [x] Ad units **Android Banner**, **Android Interstitial**, **Android Rewarded**, with IDs in `app.json` (`androidAppId` and `extra.adUnits.android`).
- [ ] AdMob → Privacy & messaging: add the **Android** ShoeSharp app to the "ShoeSharp GDPR consent" message (Your apps → edit → tick it, with the same privacy policy URL) and publish. The IDFA explainer is iOS-only.
- [x] `app-ads.txt` already covers Android: it lists the publisher ID, not an app.

## 3. Create the app in Play Console
- [ ] **Create app**: name `ShoeSharp: Blackjack Trainer`, default language English (United States), **Game**, **Free**. Accept the declarations (**🛑 OWNER**: Developer Program Policies and US export laws).
- [ ] Add the **Spanish (Latin America) – es-419** translation for the listing (step 6).

## 4. First build and the service account
- [x] `npx eas-cli@latest build --platform android --profile production` (an `.aab`; EAS creates and keeps the upload key). First build done 2026-10-18: 1.0.0 (versionCode 2), https://expo.dev/accounts/kvyluong/projects/shoesharp/builds/cd79ac40-2770-4389-a877-334a0241cb48. Rebuild after any native change.
- [ ] **Google service account key** so EAS can upload: follow https://github.com/expo/fyi/blob/main/creating-google-service-account.md, then upload the JSON in the EAS dashboard → Credentials → Android → `com.kvyluong.shoesharp` → Google service account key. **🛑 OWNER:** granting the account access in Play Console → Users and permissions.
- [ ] `npx eas-cli@latest submit --platform android --latest`. The first release lands on the **internal testing** track.

## 4b. Emulator check on the Mac (done 2026-10-18)
EAS `preview` build (APK) on an Android 15 Pixel 8 emulator: the new splash and icon show, the level picker, home, Casino Floor and the table (deal, coach, actions) all work, and the tab bar clears the gesture bar. Not covered: purchases (needs Play), ads (AdMob answers "no fill" (code 3) until the app is live and linked in AdMob, step 10), and the EU consent form (the GDPR message isn't attached to the Android app yet, step 2).

To run it again: `$ANDROID_HOME/emulator/emulator -avd ShoeSharp_Pixel`, with `ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`, then install a fresh `eas build --platform android --profile preview` APK with `adb install -r`.

## 5. Closed test (start early: 12 testers × 14 days)
- [ ] Play Console → Testing → **Closed testing** → create a track, add the build, and a tester list (Google Group or email list) with **at least 12** people. Tell them to accept the opt-in link **and keep the app installed**; anyone who opts out resets their 14 days.
- [ ] Note the start date here: ____ . Earliest production application: start + 14 days.
- [ ] Testers check what the iPhone checklist checks (APP_STORE_LAUNCH.md step 7): consent form (EU/UK), level picker, interstitial and rewarded ads (no banners), Remove ads purchase (licence testers buy for free) and restore, sound, vibration, Spanish.
- [ ] Add the testers' Gmail addresses under Settings → **License testing**, so their test purchases aren't charged.

## 6. Store listing (Grow → Store presence → Main store listing)
Full description: use the one in [APP_STORE_LISTING.md](APP_STORE_LISTING.md), with **"iPhone and iPad" → "Phones and tablets"** (and "iPhone y iPad" → "Teléfonos y tabletas"). Play has no keyword field: it indexes the title, short and full description, so the description matters more here than on iOS.

| Field | English (en-US) | Spanish (es-419) |
|---|---|---|
| App name (30) | `ShoeSharp: Blackjack Trainer` (28) | `ShoeSharp: Blackjack y Conteo` (29) |
| Short description (80) | `Learn blackjack basic strategy and card counting, with a coach at every hand.` (77) | `Aprende estrategia básica de blackjack y a contar cartas, con un coach al lado.` (79) |

- [ ] **App icon** 512×512: `store-assets/play/icon-512.png`.
- [ ] **Feature graphic** 1024×500: `store-assets/play/feature-graphic-en.png` / `-es.png`.
- [ ] **Phone screenshots** (1080×1920): `store-assets/play/phone/en-US` and `es-419`, 01–06 in order.
- [ ] **Tablet screenshots** (7" and 10"): reuse `store-assets/screenshots/ipad-13/` (en-US for English, es-MX for Spanish).
- [ ] **Preview video:** Play takes a YouTube link, not a file. Upload `store-assets/video/trailer-16x9-en.mp4` (and `-es` for the Spanish listing) to YouTube as public or unlisted, with ads off, then paste the URL.
- [ ] Category **Card**; tags: Card, Casino, Educational (whatever Play offers closest). Contact email, website `https://kvyluong.github.io/Black-Jack-APP-STORE/`.

## 7. App content (Policy → App content)
- [ ] **Privacy policy:** `https://kvyluong.github.io/Black-Jack-APP-STORE/privacy.html` (placeholders filled in 2026-10-19)
- [ ] **Data deletion** (Data safety form, if asked for a URL): `https://kvyluong.github.io/Black-Jack-APP-STORE/privacy.html#delete`. Terms of use and refunds: `terms.html`.
- [ ] **Ads:** Yes, the app contains ads.
- [ ] **App access:** All functionality is available without special access (no login).
- [ ] **Content rating (IARC questionnaire):** category Game. Answer honestly: **simulated gambling: Yes**; real-money gambling: No; no violence, sex, drugs or user-to-user chat; purchases of digital goods: Yes. The rating comes out from the answers.
- [ ] **Target audience:** **18 and over** only (simulated gambling). Not designed for children; that keeps it out of the Families program.
- [ ] **Data safety** (everything below is collected by the Google Mobile Ads SDK; the app has no accounts and keeps progress on the device):

  | Data type | Collected | Shared | Purpose | Optional? |
  |---|---|---|---|---|
  | Device or other IDs (advertising ID) | Yes | Yes | Advertising or marketing; Analytics | Users can reset or delete the ad ID |
  | App activity → App interactions | Yes | Yes | Advertising or marketing; Analytics | Required |
  | App info and performance → Crash logs, Diagnostics | Yes | Yes | Analytics | Required |
  | Location → Approximate location (from IP) | Yes | Yes | Advertising or marketing | Required |

  Encrypted in transit: **Yes**. Users can request deletion: **No account data is stored**, so answer per the form ("No", with the note that progress stays on the device and uninstalling deletes it). Check against Google's AdMob guidance, "Data disclosure for Google Mobile Ads SDK", before submitting.
- [ ] **Advertising ID:** Yes, the app uses it, for **Advertising or marketing** (the AdMob SDK adds the `AD_ID` permission).
- [ ] **Government apps / financial features / health:** No.
- [ ] **News app:** No.

## 8. In-app product
Play only lets you create products after a build with billing has been uploaded (step 4).
- [ ] Monetize → Products → **In-app products** → Create: product ID **`remove_ads`** (must match `extra.iap.removeAds`), name "Remove ads" / "Quitar anuncios", description as in APP_STORE_CONNECT.md §6, price **USD 2.99**. **Activate** it.

## 9. Production
- [ ] When the closed test has run 14 days with 12+ testers: Dashboard → **Apply for production** (answer the questions about the test honestly). Google usually replies within about a week.
- [ ] Production → Create release → the latest build → roll out (**🛑 OWNER** presses the final button). Review usually takes a few days.

## 10. After launch
- [ ] AdMob → the Android app → **App settings → link to the Google Play listing**, so ads serve at full rate.
- [ ] Add a **Get it on Google Play** badge next to the App Store link on the website.
- [ ] Updates: same as iOS: `npx eas-cli@latest update` for JS-only fixes; new builds through `eas build` + `eas submit`.
