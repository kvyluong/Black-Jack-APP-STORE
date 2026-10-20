# Store videos

Rebuilds `store-assets/video/`:

| File | What | Where it goes |
|---|---|---|
| `iphone-6.9-{en,es}.mp4` | 886×1920, 24 s, captioned in-app footage | App Store Connect → App Previews, iPhone 6.9" |
| `ipad-13-{en,es}.mp4` | 1200×1600, 24 s | App Store Connect → App Previews, iPad 13" |
| `trailer-16x9-{en,es}.mp4` | 1920×1080, 30 s, motion-graphics trailer (Remotion) | YouTube, then the link in Google Play |

All are silent. The App Store previews carry a silent stereo track, because App Store Connect
expects one. Apple requires previews to show the app itself, so they are straight screen
recordings with captions. The trailer has no such rule, so it is a designed piece built
around the same footage.

## 1. Record (iOS simulator)

You need an EAS `simulator` build installed on an iPhone 6.9" (iPhone 18 Pro Max) and an
iPad 13" simulator, with the status bar set to 9:41 and full battery
(`xcrun simctl status_bar <udid> override ...`).

- `node seed-sim.mjs <udid> <en|es> fresh` gives a new player, for the welcome screen.
  Without `fresh` it loads the demo progress from `../store-screenshots/seed.mjs`
  (level 19, 95% casino-ready, ads removed). Quit the app first.
- Open each screen with deep links (`xcrun simctl openurl <udid> shoesharp://play`, `drills/count`,
  `exam`, `ready`) and record with `xcrun simctl io <udid> recordVideo --codec=h264 raw/<name>.mov`.
- Shots: the welcome screen, a hand at the table (bet, deal, *Ask the coach*, play, win),
  a Fast 20-card count drill, the correct answer with *Perfect count!*, the casino test
  deal, and a scroll on the casino-ready screen. That screen plays in reverse, so the
  preview ends on the score.

## 2. App Store previews

```bash
npm i --no-save playwright-core@1.56.1
node compose.mjs ../../store-assets/video      # ONLY=iphone-es renders just one
```

The cut list is `cuts.json`: for each clip, the file, its start, its length and which caption goes over it.
The simulator writes frames only when the screen changes. `compose.mjs` first makes a
constant-rate copy of each recording in `work/` that repeats frames through still moments.

## 3. Trailer (Remotion)

```bash
cd trailer && npm ci
node prep.mjs                                  # cuts src/clips.json from ../work/cfr-*.mp4
npx remotion render src/index.ts trailer-en out/trailer-en.mp4 \
  --timeout=90000 --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --crf=18
```

Remotion's own headless Chrome times out on this Mac, so the render points it at the
installed Chrome. `npx remotion studio src/index.ts` previews it live.
