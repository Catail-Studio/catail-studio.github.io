// Builds the website's pages into public/ from site/pages/ and site/partials/.
//
//   npm run build   (node site/build.mjs)           write the pages
//   npm run check   (node site/build.mjs --check)   fail if public/ is not what the sources would build
//
// public/ is the whole site, ready to upload: these built pages next to the hand-written CSS, JS
// and assets. It needs no server-side code; the build only saves writing the same parts twice.
//
// In a page or a partial:
//   <!-- include NAME -->   on a line of its own: site/partials/NAME.html, or NAME.<lang>.html
//   {{root}}                the way from this page up to the site's root ("", "../", "../../")
//   {{alt}}                 this page in the other language, as a relative link
//   {{to:catail/index.html}}  a relative link from this page to that one (a page in site.json)
//   {{url}} {{url.tr}} {{url.en}}   full addresses of this page, and of its two languages
//   {{lang}}                "tr" or "en"
//   {{title}} {{description}}  the page's own <title> and meta description (for sharing)
//   {{share}} {{ld}} {{origin}} {{locale}}  share picture, search data, site address, og locale
//
// It also writes sitemap.xml, robots.txt and 404.html (from site/pages/404.html).

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public");
const config = JSON.parse(readFileSync(join(here, "site.json"), "utf8"));
const LANGS = ["tr", "en"];
const OTHER = { tr: "en", en: "tr" };

/** A page's address as a link: a folder's index.html is the folder itself. */
const linkPath = (path) => path.replace(/(^|\/)index\.html$/, "$1");

/** Full address of a page on the live site. */
const urlOf = (path) => new URL(linkPath(path), config.origin).href;

/** A relative link from one page to another. */
function linkFrom(from, to) {
  const link = posix.relative(posix.dirname(from), posix.dirname(to) || ".");
  const folder = link ? `${link}/` : "";
  return folder + linkPath(posix.basename(to)) || "./";
}

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

function partial(name, lang) {
  for (const file of [`${name}.${lang}.html`, `${name}.html`]) {
    const path = join(here, "partials", file);
    if (existsSync(path)) return read(path).replace(/\n$/, "");
  }
  throw new Error(`no partial "${name}" for ${lang} in site/partials/`);
}

/** Puts the partials in, each line indented as far as the include line was. */
function includeAll(text, lang, seen = []) {
  return text.replace(/^([ \t]*)<!-- include ([\w-]+) -->$/gm, (_, indent, name) => {
    if (seen.includes(name)) throw new Error(`partial "${name}" includes itself`);
    const body = includeAll(partial(name, lang), lang, [...seen, name]);
    return body
      .split("\n")
      .map((line) => (line ? indent + line : line))
      .join("\n");
  });
}

/** Every file a {{to:…}} link may point at: the pages, and the old addresses that still answer. */
const known = () => new Set([...config.pages.flatMap((pair) => LANGS.map((lang) => pair[lang])), ...Object.keys(config.redirects)]);

function fill(text, values, where, from) {
  const targets = known();
  text = text.replace(/\{\{to:([^}]+)\}\}/g, (_, target) => {
    if (!targets.has(target)) throw new Error(`${where}: {{to:${target}}} is not one of the pages in site.json`);
    return linkFrom(from, target);
  });
  return text.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`${where}: unknown {{${key}}}`);
    return values[key];
  });
}

const LOCALES = { tr: "tr_TR", en: "en_US" };

function grab(text, pattern, problem) {
  const found = pattern.exec(text);
  if (!found) throw new Error(problem);
  return found[1].replace(/\s+/g, " ").trim();
}

const banner = (source) => `<!-- Built by site/build.mjs from ${source}. Edit that file, then run: npm run build -->`;

function buildPage(pair, lang) {
  const path = pair[lang];
  const source = `site/pages/${path}`;
  const values = {
    root: "../".repeat(path.split("/").length - 1),
    alt: linkFrom(path, pair[OTHER[lang]]),
    url: urlOf(path),
    "url.tr": urlOf(pair.tr),
    "url.en": urlOf(pair.en),
    lang,
    origin: config.origin,
    locale: LOCALES[lang],
    "locale.other": LOCALES[OTHER[lang]],
    // What a shared link shows: the page's own title and description, and its card picture.
    share: new URL(`assets/share/${pair.product ?? "studio"}-${lang}.png`, config.origin).href,
  };
  const page = read(join(here, "pages", path));
  values.title = grab(page, /<title>(.*?)<\/title>/s, `${source}: no <title>`);
  values.description = grab(page, /<meta\s+name="description"\s+content="([^"]*)"/s, `${source}: no description`);
  // Data for search engines: the studio on its home page, the product on a product's pages.
  const kind = pair.product ?? (pair.tr === "index.html" ? "studio" : null);
  values.ld = kind ? fill(partial(`ld-${kind}`, lang), values, source, path).replace(/\n/g, "\n    ") : "";
  // A placeholder that comes out empty leaves only its indent behind; that line goes.
  const text = fill(includeAll(page, lang), values, source, path).replace(/^[ \t]+\n/gm, "");
  if (!text.startsWith("<!doctype html>\n")) throw new Error(`${source} must start with <!doctype html>`);
  if (text.includes("<!-- include ")) throw new Error(`${source}: an include must be on a line of its own`);
  return text.replace("<!doctype html>\n", `<!doctype html>\n${banner(source)}\n`);
}

const MOVED = {
  tr: { title: "Bu sayfa taşındı", text: "Bu sayfa taşındı:" },
  en: { title: "This page has moved", text: "This page has moved:" },
};

/** GitHub Pages can't answer with a redirect, so an old address gets a page that moves on at once. */
function buildRedirect(from, to) {
  const pair = config.pages.find((each) => LANGS.some((lang) => each[lang] === to));
  if (!pair) throw new Error(`redirect ${from}: ${to} is not one of the pages`);
  const lang = LANGS.find((each) => pair[each] === to);
  const link = linkFrom(from, to);
  const words = MOVED[lang];
  return `<!doctype html>
${banner("site/site.json (redirects)")}
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <title>${words.title}</title>
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${urlOf(to)}" />
    <script>
      location.replace(${JSON.stringify(link)} + location.search + location.hash);
    </script>
    <meta http-equiv="refresh" content="0; url=${link}" />
  </head>
  <body>
    <p>${words.text} <a href="${link}">${urlOf(to)}</a></p>
  </body>
</html>
`;
}

function buildAll() {
  const files = new Map();
  const add = (path, text) => {
    if (files.has(path)) throw new Error(`${path} would be built twice`);
    files.set(path, text);
  };
  for (const pair of config.pages) for (const lang of LANGS) add(pair[lang], buildPage(pair, lang));
  for (const [from, to] of Object.entries(config.redirects)) add(from, buildRedirect(from, to));
  add("404.html", buildNotFound());
  add("sitemap.xml", buildSitemap());
  add("robots.txt", buildRobots());
  return files;
}

/** Every page in both languages, each naming its other language, as search engines like it. */
function buildSitemap() {
  const entries = config.pages.flatMap((pair) =>
    LANGS.map((lang) => {
      const links = LANGS.map((each) => `    <xhtml:link rel="alternate" hreflang="${each}" href="${urlOf(pair[each])}" />`);
      links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf(pair.en)}" />`);
      return `  <url>\n    <loc>${urlOf(pair[lang])}</loc>\n${links.join("\n")}\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

function buildRobots() {
  return `# Everyone is welcome. The design sample page isn't meant to be found.
User-agent: *
Disallow: ${new URL(config.origin).pathname}_tasarim.html

Sitemap: ${new URL("sitemap.xml", config.origin).href}
`;
}

/** The "not found" page. It may be served at any address, so its links start from the site's root. */
function buildNotFound() {
  const source = "site/pages/404.html";
  const values = { base: new URL(config.origin).pathname };
  const text = fill(includeAll(read(join(here, "pages", "404.html")), "tr"), values, source, "404.html");
  if (text.includes("<!-- include ")) throw new Error(`${source}: an include must be on a line of its own`);
  return text.replace("<!doctype html>\n", `<!doctype html>\n${banner(source)}\n`);
}

function htmlIn(folder, prefix = "") {
  const found = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) found.push(...htmlIn(join(folder, entry.name), `${path}/`));
    else if (entry.name.endsWith(".html")) found.push(path);
  }
  return found;
}

const files = buildAll();
const problems = [];
const check = process.argv.includes("--check");

for (const [path, text] of files) {
  const target = join(out, ...path.split("/"));
  const now = existsSync(target) ? read(target) : null;
  if (now === text) continue;
  if (check) {
    problems.push(`public/${path} is ${now === null ? "missing" : "out of date"}`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    console.log(`built public/${path}`);
  }
}

// Every page in public/ comes from here, or is listed as kept by hand.
for (const path of htmlIn(out)) {
  if (!files.has(path) && !config.handWritten.includes(path)) {
    problems.push(`public/${path} is neither built by site/build.mjs nor listed in "handWritten"`);
  }
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  if (check) console.error("Run: npm run build");
  process.exit(1);
}
console.log(check ? "public/ is up to date." : `${files.size} pages, all up to date.`);
