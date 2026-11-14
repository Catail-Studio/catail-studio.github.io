// Reads Catail's releases. latest.json can't be read from a browser (GitHub sends no CORS
// header for release files) and the file name carries the version, so this asks the GitHub API.
// Whatever goes wrong, download links keep RELEASES_PAGE, which always shows the latest release.

const REPO = "Catail-Studio/catail-ss";
const API_URL = `https://api.github.com/repos/${REPO}/releases?per_page=100`;
const DOWNLOAD_PREFIX = `https://github.com/${REPO}/releases/download/`;
const INSTALLER = /^catail[_-]v?(\d+\.\d+\.\d+)[_-]x64-setup\.exe$/i;
// v2: entries carry download counts too.
const CACHE_KEY = "catail.site.releases.v2";
const REPO_URL = `https://api.github.com/repos/${REPO}`;
const REPO_CACHE_KEY = "catail.site.repo";
const REPO_CACHE_TTL_MS = 30 * 60 * 1000;
// Short, so a new release reaches earlier visitors soon. The API allows 60 requests an hour.
const CACHE_TTL_MS = 5 * 60 * 1000;

export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

export function compareVersions(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

// Every published release that has an installer, newest first. A release still waiting for its
// upload, a draft or a pre-release is left out, so no link ever points at nothing.
export function listReleases(releases) {
  if (!Array.isArray(releases)) return [];
  const byVersion = new Map();
  for (const release of releases) {
    if (!release || release.draft || release.prerelease) continue;
    for (const asset of release.assets ?? []) {
      const match = INSTALLER.exec(asset?.name ?? "");
      const url = asset?.browser_download_url;
      if (!match || typeof url !== "string" || !url.startsWith(DOWNLOAD_PREFIX)) continue;
      if (byVersion.has(match[1])) continue;
      byVersion.set(match[1], {
        version: match[1],
        url,
        size: Number(asset.size) || 0,
        downloads: Number(asset.download_count) || 0,
        publishedAt: release.published_at ?? null,
        notes: typeof release.body === "string" ? release.body.trim() : "",
      });
    }
  }
  return [...byVersion.values()].sort((a, b) => compareVersions(b.version, a.version));
}

export function pickLatest(releases) {
  return listReleases(releases)[0] ?? null;
}

function isRelease(value) {
  return (
    typeof value?.version === "string" &&
    typeof value.url === "string" &&
    value.url.startsWith(DOWNLOAD_PREFIX) &&
    typeof value.downloads === "number"
  );
}

function readCache(storage) {
  try {
    const cached = JSON.parse(storage.getItem(CACHE_KEY));
    if (Array.isArray(cached?.releases) && cached.releases.length > 0 && cached.releases.every(isRelease)) {
      return cached;
    }
  } catch {
    // Storage is off or holds something else; ask GitHub instead.
  }
  return null;
}

function writeCache(storage, releases, at) {
  try {
    storage.setItem(CACHE_KEY, JSON.stringify({ releases, at }));
  } catch {
    // Only saves a request next time.
  }
}

// Resolves to { releases, source }, releases being empty when nothing is known. Never rejects.
export async function loadReleases({
  fetchFn = globalThis.fetch.bind(globalThis),
  storage = globalThis.localStorage,
  now = Date.now(),
  timeoutMs = 6000,
} = {}) {
  const cached = readCache(storage);
  if (cached && now - cached.at < CACHE_TTL_MS) return { releases: cached.releases, source: "cache" };

  try {
    const response = await fetchFn(API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const releases = listReleases(await response.json());
    if (releases.length > 0) {
      writeCache(storage, releases, now);
      return { releases, source: "api" };
    }
  } catch {
    // Offline, rate limited (60 an hour per address) or GitHub is down: fall through.
  }
  return cached ? { releases: cached.releases, source: "stale" } : { releases: [], source: "none" };
}

// Resolves to { release, source }, release being null when nothing is known. Never rejects.
export async function loadLatest(options) {
  const { releases, source } = await loadReleases(options);
  return { release: releases[0] ?? null, source };
}

/** How many times the installers have been downloaded, all versions together (updates included). */
export function totalDownloads(releases) {
  return releases.reduce((sum, release) => sum + (release.downloads || 0), 0);
}

// Resolves to the repository's star count, or null when GitHub can't be asked. Never rejects.
export async function loadStars({
  fetchFn = globalThis.fetch.bind(globalThis),
  storage = globalThis.localStorage,
  now = Date.now(),
  timeoutMs = 6000,
} = {}) {
  let cached = null;
  try {
    cached = JSON.parse(storage.getItem(REPO_CACHE_KEY));
    if (typeof cached?.stars !== "number") cached = null;
  } catch {
    // Storage is off; ask GitHub.
  }
  if (cached && now - cached.at < REPO_CACHE_TTL_MS) return cached.stars;
  try {
    const response = await fetchFn(REPO_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const stars = Number((await response.json())?.stargazers_count);
    if (!Number.isFinite(stars)) throw new Error("no star count");
    try {
      storage.setItem(REPO_CACHE_KEY, JSON.stringify({ stars, at: now }));
    } catch {
      // Only saves a request next time.
    }
    return stars;
  } catch {
    return cached ? cached.stars : null;
  }
}
