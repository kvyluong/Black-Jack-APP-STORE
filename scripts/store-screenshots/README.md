# Store screenshots

Rebuilds `store-assets/screenshots/` and `store-assets/play/`: six captioned frames per
device (6.9" iPhone, 13" iPad, 1080×1920 Android phone) and language (English, Spanish), from the web build with demo progress loaded
(`seed.mjs`). Uses the Google Chrome already installed on the Mac.

```bash
npx expo export --platform web --output-dir dist
cd scripts/store-screenshots
npm i --no-save playwright-core@1.56.1
node serve.mjs "$PWD/../../dist"  # leave running; serves on 127.0.0.1:8765
node capture.mjs                   # raw screens into raw/ (deals until the coach shows)
node compose.mjs ../../store-assets/screenshots
node feature.mjs ../../store-assets/play     # Play icon (512) and feature graphics
```

Captions live in `compose.mjs` and match docs/APP_STORE_LISTING.md. The web build has
no store, so the in-app purchase review screenshot must come from a TestFlight build.
