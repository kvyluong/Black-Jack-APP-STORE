# ShoeSharp: search optimization (ASO) for the next update

Proposed store text for the first update after 1.0.0 is live. **Nothing here is live yet.**
The live text is in [APP_STORE_LISTING.md](APP_STORE_LISTING.md) (iOS) and
[GOOGLE_PLAY_LAUNCH.md](GOOGLE_PLAY_LAUNCH.md) (Play). Change name, subtitle and keywords
only together with a new build (they need review); promotional text can change anytime.

Research date: 2026-11-01. Character counts were checked with a script.

---

## 1. The keyword space

### Who ShoeSharp competes with (App Store, Nov 2026)

| App | Name / subtitle pattern | Notes |
|---|---|---|
| Blackjack & Card Counting Pro | "Learn to Beat Blackjack." | Paid, ~11K ratings, 4.8. The incumbent since 2010. |
| Blackjack Apprenticeship BJ 21 | "BJA Trainer Pro Basic Strategy" | Big brand (BJA); subscription. |
| Reckon: Blackjack Trainer | "Master strategy & counting" | Same pattern as ours: brand + "Blackjack Trainer". |
| TwentyOne: Blackjack Trainer | | New (June 2026). Uses "21" as brand. |
| AP Blackjack Trainer | | Deviations and bet spread behind a subscription. Says "not a gambling app" in its listing. |
| Deckard: Card Counter | | New, lessons + drills. Uses "Card Counter". |
| Card Counting Academy / Card Counting Trainer / Card Counting Coach / Expert Card Counting | | Exact-match names on "card counting". |
| Blackjack Counting Drills, 21 Trainer, CountJack, Blackjack Solver, Blackjack-CC | | Small apps, few ratings. |

On Google Play: BJA: Card Counting Trainer Pro (4.8, ~35K downloads), Card Counter: Blackjack
Coach, Blackjack Card Counting Trainer Free, Blackjack Apprenticeship BJ21.

### What people search
- **Head terms:** `blackjack trainer`, `card counting`, `blackjack strategy`, `basic strategy`,
  `card counter`, `blackjack`.
- **Long tail:** `hi-lo`, `true count`, `running count`, `count cards`, `blackjack chart`,
  `deviations` / `illustrious 18`, `blackjack practice`, `learn blackjack`, `21`.
- **Spanish:** `contar cartas`, `conteo de cartas`, `estrategia blackjack`, `estrategia básica`,
  `entrenador blackjack`, `21` / `veintiuno`, `naipes`, `baraja`.

### What the market tells us
1. **Two shapes win:** "*Brand*: Blackjack Trainer" and "Card Counting *X*". We already own the
   first; the second we can only reach through the subtitle and keyword field.
2. **"Basic strategy" is a head term** that no field of ours contains as a phrase today
   ("basic" sits alone in the keyword field). Putting it in the subtitle makes the exact phrase
   rank and frees keyword space.
3. **Most competitors are paywalled** (BJA, AP Blackjack Trainer, Counting Pro is paid).
   "Everything free, no subscription" is our sharpest conversion message; it belongs in
   promotional text and the first screenshot, not in indexed fields (Apple ignores "free").
4. **Gambling words are a review risk for us specifically.** 1.0.0 was rejected under 2.3.6
   (simulated gambling) and the app is now rated Simulated Gambling: None. Having `casino`,
   `vegas`, `odds` (EN) and `casino` (ES) in the hidden keyword field invites a reviewer to
   reopen that question, and the searchers those words bring want a casino game, not a trainer.
   Drop them. Also avoid: bet, betting, gamble, chips, bankroll, poker, slots, jackpot, win,
   money, profit, "beat the casino" (ES: apuestas, apostar, fichas, ganar, dinero, casino).

---

## 2. Proposal: App Store

Rules applied: name > subtitle > keywords in weight; words combine across the three fields
within one localization; never repeat a word; no spaces after commas; singular forms;
no "free", "app" or category names. The US storefront indexes **both** EN-US and ES-MX, so
the Spanish field is a second 100 characters there.

### English (U.S.)

| Field | Live now | Proposed | Length |
|---|---|---|---|
| Name | `ShoeSharp: Blackjack Trainer` | **Keep** `ShoeSharp: Blackjack Trainer` | 28/30 |
| Subtitle | `Learn Card Counting & Strategy` | `Card Counting & Basic Strategy` | 30/30 |
| Keywords | `21,hi-lo,count,basic,chart,casino,practice,coach,odds,deck,shoe,vegas,dealer,drill,simulator,hand` | `21,hi-lo,counter,count,true,deviation,chart,drill,practice,coach,learn,deck,shoe,dealer,lesson,skill` | 100/100 |
| Promo text | `Every lesson, drill and casino test is free. No paywall, …` | `Every lesson, drill and exam is free. No paywall, no subscription, no account: learn perfect blackjack strategy and card counting at your own pace.` | 147/170 |

Why:
- **Name stays.** "Blackjack Trainer" is the exact head term and the brand is already
  printed on screenshots and the icon. Renaming costs recognition for little gain.
- **Subtitle** swaps the low-value "Learn" for "Basic", so the exact phrases
  `card counting`, `basic strategy`, `blackjack strategy` and `blackjack basic strategy` all
  live in indexed fields. "learn" moves to the keyword field, so `learn blackjack` and
  `learn card counting` still match.
- **Keywords out:** `casino`, `vegas`, `odds` (review risk, wrong audience), `basic`
  (now in subtitle), `simulator` (pulls "blackjack simulator" casino-game searchers who
  bounce), `hand` (weak).
- **Keywords in:** `counter` (`card counter` is a top query; Apple doesn't reliably stem
  counting → counter), `true` (with `count` → `true count`), `deviation` (`blackjack
  deviations`, the Illustrious 18 crowd), `learn`, `lesson`, `skill`.
- `running` (for `running count`) is the first word to add back if anything is cut; it didn't fit.

### Spanish (Mexico)

| Field | Live now | Proposed | Length |
|---|---|---|---|
| Name | `ShoeSharp: Blackjack y Conteo` | **Keep** | 29/30 |
| Subtitle | `Aprende a contar cartas al 21` | `Contar cartas y estrategia 21` | 29/30 |
| Keywords | `entrenador,estrategia,naipes,simulador,casino,veintiuno,crupier,consejos,baraja,practica,hi-lo,juego` | `entrenador,basica,naipes,veintiuno,crupier,baraja,practica,hi-lo,mazo,zapato,tabla,contador,aprender` | 100/100 |
| Promo text | (no-paywall line) | `Todas las lecciones, ejercicios y exámenes son gratis. Sin muro de pago, sin suscripción y sin cuenta: aprende estrategia de blackjack y a contar cartas a tu ritmo.` | 164/170 |

Why:
- **Subtitle** puts `estrategia` in an indexed field next to `contar cartas`, so
  `estrategia blackjack`, `contar cartas 21` and `estrategia 21` rank; "aprende" moves to
  the keyword field as `aprender`.
- **Out:** `casino`, `simulador` (same reasons as English), `consejos`, `juego` (generic),
  `estrategia` (now in subtitle).
- **In:** `basica` (→ `estrategia básica`; Apple ignores accents), `mazo` (Latin American word
  for deck, next to Spain's `baraja`), `zapato` (shoe), `tabla` (`tabla de estrategia`),
  `contador` (`contador de cartas`), `aprender`.

### Also worth doing on iOS
- **Keyword-linked custom product pages** (App Store Connect → Custom Product Pages, up to 70;
  keywords assignable since Oct 2025). Make two:
  - *Card counting* page: Academy and count-drill screenshots first; assign `counter`, `hi-lo`, `true`.
  - *Basic strategy* page: table + coach + chart screenshots first; assign `chart`, `coach`, `practice`.
  A keyword goes to one page only. This lifts conversion per query, which feeds rank.
- **Screenshot captions** may be read by Apple's ranking (practitioner reports, not confirmed).
  Current captions already say "Count cards like a pro" / "A coach at every decision". Keep
  keywords in them; avoid "casino" in captions too (caption 3 "Pass the casino test" → "Pass
  the Full Shoe Test" when screenshots are next re-shot, matching the names on the
  `fallback/no-casino-wording` branch).
- **In-app purchase name** is indexed. "Remove ads" adds nothing; leave it, it's honest.

---

## 3. Proposal: Google Play

Play has no keyword field. It indexes **title**, **short description** and **full
description** (repetition in the full description counts, stuffing gets penalized).
Play's metadata policy bans "free", "best", "#1" and price/promo claims in the title and
discourages them in the short description, so they're left out.

| Field | English (en-US) | Spanish (es-419) |
|---|---|---|
| Title (30) | `ShoeSharp: Blackjack Trainer` (28) | `ShoeSharp: Blackjack y Conteo` (29) |
| Short description (80) | `Card counting trainer and blackjack basic strategy coach, with Hi-Lo drills.` (76) | `Aprende a contar cartas y la estrategia básica del blackjack, con un coach.` (75) |

Why: the current short description (`Learn blackjack basic strategy and card counting, with a
coach at every hand.`) is fine; the new one adds the exact phrases `card counting trainer`,
`basic strategy` and `hi-lo` and drops filler ("at every hand"). Full description: reuse the
iOS one with the feature names from `fallback/no-casino-wording` if that branch ships, and
make sure "card counting", "basic strategy" and "blackjack trainer" each appear 3–5 times
naturally.

---

## 4. Ready to paste (next update)

```
=== App Store · English (U.S.) ===
Name:      ShoeSharp: Blackjack Trainer
Subtitle:  Card Counting & Basic Strategy
Keywords:  21,hi-lo,counter,count,true,deviation,chart,drill,practice,coach,learn,deck,shoe,dealer,lesson,skill
Promo:     Every lesson, drill and exam is free. No paywall, no subscription, no account: learn perfect blackjack strategy and card counting at your own pace.

=== App Store · Spanish (Mexico) ===
Name:      ShoeSharp: Blackjack y Conteo
Subtitle:  Contar cartas y estrategia 21
Keywords:  entrenador,basica,naipes,veintiuno,crupier,baraja,practica,hi-lo,mazo,zapato,tabla,contador,aprender
Promo:     Todas las lecciones, ejercicios y exámenes son gratis. Sin muro de pago, sin suscripción y sin cuenta: aprende estrategia de blackjack y a contar cartas a tu ritmo.

=== Google Play · en-US ===
Title:     ShoeSharp: Blackjack Trainer
Short:     Card counting trainer and blackjack basic strategy coach, with Hi-Lo drills.

=== Google Play · es-419 ===
Title:     ShoeSharp: Blackjack y Conteo
Short:     Aprende a contar cartas y la estrategia básica del blackjack, con un coach.
```

Promo text (both iOS languages) can be pasted now without a new build; it isn't indexed,
but the current one says "casino test", which this version removes.

---

## 5. Measure and iterate
- After 4–6 weeks: App Store Connect → App Analytics → Acquisition → Source Type → App Store
  Search, and the Search Terms report in Apple Ads (a free account shows impressions per term).
  Swap any keyword with zero impressions.
- Ratings drive rank more than any of the above. The in-app rating prompt fires after happy
  moments; don't add more prompts.
- Next candidates to test: `running`, `illustrious`, `tutor`, `quiz` (EN); `curso`, `juego`,
  `conteo real` (ES).

Sources: App Store and Play listings of the apps above (Nov 2026); Mobile Action and AppTweak
on keyword-linked custom product pages (Oct 2025).
