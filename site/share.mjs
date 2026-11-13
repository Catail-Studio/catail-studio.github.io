// Draws the pictures a shared link shows (public/assets/share/<kind>-<lang>.png, 1200 × 630) from
// site/share/card.html, with Chrome or Edge running headless. Run it again when a card's words
// or look change:  npm run share
// Set CHROME to the browser's path if it isn't found by itself.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "assets", "share");
const KINDS = ["studio", "catail"];
const LANGS = ["tr", "en"];

const browsers = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const browser = browsers.find((path) => existsSync(path));
if (!browser) {
  console.error("No Chrome or Edge found. Set CHROME to its path.");
  process.exit(1);
}

mkdirSync(out, { recursive: true });
const card = pathToFileURL(join(here, "share", "card.html")).href;
for (const kind of KINDS) {
  for (const lang of LANGS) {
    const file = join(out, `${kind}-${lang}.png`);
    execFileSync(browser, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      "--virtual-time-budget=4000",
      `--screenshot=${file}`,
      `${card}?kind=${kind}&lang=${lang}`,
    ], { stdio: "ignore" });
    console.log(`drew public/assets/share/${kind}-${lang}.png`);
  }
}
