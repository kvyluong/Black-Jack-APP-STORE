# ShoeSharp: App Store Connect fill-in sheet

Every value App Store Connect asks for, in the order its screens ask. Listing text
(name, subtitle, keywords, description) lives in [APP_STORE_LISTING.md](APP_STORE_LISTING.md);
this sheet points to it rather than repeating it. Steps refer to
[APP_STORE_LAUNCH.md](APP_STORE_LAUNCH.md).

Before starting: the Apple Developer membership must be active, and the **Paid Apps
agreement** plus bank and tax details must be done (**Business** in App Store Connect).
Without them, the in-app purchase can't be created or sold.

---

## 1. New App (Apps → + → New App)

| Field | Value |
|---|---|
| Platforms | iOS |
| Name | `ShoeSharp: Blackjack Trainer` (fallback if taken: `ShoeSharp - Blackjack Trainer`) |
| Primary language | English (U.S.) |
| Bundle ID | `com.kvyluong.shoesharp` (register it first if it's not listed; see below) |
| SKU | `shoesharp` |
| User access | Full access |

If the bundle ID isn't in the dropdown, let EAS register it: the first
`eas build --platform ios` creates it. Or add it at developer.apple.com → Certificates,
IDs & Profiles → Identifiers → + → App IDs. Use **Explicit** `com.kvyluong.shoesharp` and
tick **In-App Purchase** (on by default).

## 2. App Information

| Field | Value |
|---|---|
| Subtitle | From APP_STORE_LISTING.md (per localization) |
| Category | Primary **Games**, subcategory **Card**. Secondary **Education** |
| Content rights | "No, it does not contain, show, or access third-party content" |
| Age rating | See §5 |
| License agreement | Apple's standard EULA |

**Localizations:** add **Spanish (Mexico)** with its name and subtitle from APP_STORE_LISTING.md.

## 3. Pricing and Availability

| Field | Value |
|---|---|
| Price | Free (USD 0) |
| Availability | All countries and regions |
| iPad and Mac availability | Leave "Make this app available" **on** for Apple silicon Macs, or turn it off if you'd rather not test it there |

## 4. App Privacy

**Privacy policy URL:** `https://kvyluong.github.io/Black-Jack-APP-STORE/privacy.html`

"Do you or your third-party partners collect data from this app?" → **Yes.** Everything
below is collected by the Google Mobile Ads SDK. The app itself has no accounts and no
analytics, and keeps progress on the device.

Answers below follow the Google Mobile Ads SDK's own privacy manifest (`PrivacyInfo.xcprivacy`
in SDK 13.11.0), entered in App Store Connect on 2026-10-19.

| Data type | Linked to user? | Used for tracking? | Purposes |
|---|---|---|---|
| **Location → Coarse Location** | **Yes** | No | Third-party advertising, Developer's advertising, Analytics |
| **Identifiers → Device ID** | **Yes** | **Yes** | Third-party advertising, Developer's advertising, Analytics |
| **Usage Data → Product Interaction** | **Yes** | No | Third-party advertising, Developer's advertising, Analytics |
| **Usage Data → Advertising Data** | **Yes** | No | Third-party advertising, Developer's advertising, Analytics |
| **Diagnostics → Crash Data** | No | No | Analytics |
| **Diagnostics → Performance Data** | No | No | Third-party advertising, Developer's advertising, Analytics |
| **Diagnostics → Other Diagnostic Data** | No | No | Third-party advertising, Developer's advertising, Analytics |

After an SDK upgrade, re-check against the new manifest:
`plutil -convert json -o - PrivacyInfo.xcprivacy` from the SDK zip.

Before publishing, check these against Google's current page,
"Prepare for Apple's App Store data disclosure requirements" (AdMob help). Google
updates it as the SDK changes.

## 5. Age Rating questionnaire

Answer **None / No** to everything except:

| Question | Answer |
|---|---|
| Simulated Gambling | **Frequent/Intense** |
| Gambling (real money) | **No** |
| Contests | No |
| Unrestricted web access | No |
| Advertising (if asked) | **Yes**, the app shows ads |
| In-app controls / parental controls (if asked) | No |

This puts the app in Apple's top age tier (17+, shown as 18+ under Apple's newer rating
labels). That's expected for blackjack; anything lower is likely to be rejected.

## 6. In-App Purchase (Monetization → In-App Purchases → +)

| Field | Value |
|---|---|
| Type | **Non-Consumable** |
| Reference name | `Remove ads` |
| Product ID | `remove_ads` (must match `extra.iap.removeAds` in app.json) |
| Price | Tier **USD 2.99** (anything from 2.99 to 4.99 works) |
| Availability | All countries |
| Family Sharing | On (optional, friendlier for a non-consumable) |

Localizations:

| | Display name | Description |
|---|---|---|
| English (U.S.) | `Remove ads` | `No banner or between-hand ads. Bonus-chip videos stay.` (54/55) |
| Spanish (Mexico) | `Quitar anuncios` | `Sin banners ni anuncios entre manos.` (36/55) |

**Review screenshot:** the Settings screen showing the Remove ads and Restore purchase
buttons. Take it on the phone from the TestFlight build (step 7): the web build has no store,
so it shows a note instead of the buttons.
**Review notes:** "Tap the Me tab → Settings → Remove ads. Restore purchase is on the same screen."

Descriptions are capped at **55 characters**. The first purchase is reviewed together with an
app version: when submitting, click **Add for Review** on the purchase and on version 1.0.0 so
both go into the same submission. Created 2026-10-19: Apple ID 6824753924, USD 2.99, all countries.

## 7. Version page (iOS App → 1.0 Prepare for Submission)

| Field | Value |
|---|---|
| Promotional text | From APP_STORE_LISTING.md |
| Description | From APP_STORE_LISTING.md |
| Keywords | From APP_STORE_LISTING.md |
| Support URL | `https://kvyluong.github.io/Black-Jack-APP-STORE/` |
| Marketing URL | `https://kvyluong.github.io` (the root domain, so AdMob finds `app-ads.txt`; it redirects to the website) |
| Version | `1.0.0` |
| Copyright | `2026 Kevin Luong` |
| Build | Pick the TestFlight build (runbook step 7) |
| Screenshots | `store-assets/screenshots/` (6.9" iPhone and 13" iPad, English and Spanish), in caption order 01–06 |
| App Previews | `store-assets/video/iphone-6.9-en.mp4` and `ipad-13-en.mp4` (English); `iphone-6.9-es.mp4` and `ipad-13-es.mp4` (Spanish). 24 s each, silent. Poster frame: leave the default or pick the coach shot |
| App icon | Comes from the build |

**App Review Information**

| Field | Value |
|---|---|
| Sign-in required | **No** (no accounts) |
| Contact | Your name, phone and email |
| Notes | See below |

```
ShoeSharp is a blackjack training app. No real-money gambling: chips are virtual, can't be bought or cashed out, and have no value. The only purchase removes ads (Me → Settings → Remove ads; Restore purchase is on the same screen).

On first launch the app shows Google's consent message (EEA/UK/Switzerland only) and Apple's App Tracking Transparency prompt, preceded by a short explainer. Declining both still lets you use the whole app.
```

**Version release:** "Manually release this version" for the first launch, so you
control the day it goes live.

## 8. Export compliance

`ITSAppUsesNonExemptEncryption` is already `false` in app.json, so App Store Connect
won't ask about encryption on each build.
