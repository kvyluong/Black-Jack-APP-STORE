// Loads the store demo progress (../store-screenshots/seed.mjs) into the app on a booted
// iOS simulator, by writing AsyncStorage's files into the app's data container.
// Usage: node seed-sim.mjs <simulator udid> <en|es> [fresh]   (quit the app first)
// `fresh` loads a brand-new player in that language instead, for the level picker.
import { execFileSync } from 'node:child_process'; import crypto from 'node:crypto';
import fs from 'node:fs'; import path from 'node:path';
import { seed } from '../store-screenshots/seed.mjs';

const [udid, lang, fresh] = process.argv.slice(2);
const BUNDLE = 'com.kvyluong.shoesharp'; const KEY = 'blackjack-coach/v1';
const data = execFileSync('xcrun', ['simctl', 'get_app_container', udid, BUNDLE, 'data']).toString().trim();
const dir = path.join(data, 'Library/Application Support', BUNDLE, 'RCTAsyncLocalStorage_V1');
fs.mkdirSync(dir, { recursive: true });
// Values over 1 KB live in their own file, named by the key's MD5; the manifest holds null for them.
fs.writeFileSync(path.join(dir, crypto.createHash('md5').update(KEY).digest('hex')),
  fresh ? JSON.stringify({ settings: { language: lang }, stats: {} }) : seed(lang));
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ [KEY]: null }));
console.log('seeded', lang, dir);
