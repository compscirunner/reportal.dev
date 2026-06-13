// Reportal — a fully static gallery of Meta Portal apps.
// Everything runs in the browser: one GitHub Search API call to find repos
// tagged `meta-portal`, then per-repo manifests/screenshots are pulled straight
// from the CDN (raw.githubusercontent + opengraph), which don't count against
// the GitHub API rate limit. Results are cached in localStorage.

const TOPIC = "meta-portal";
const CACHE_KEY = "reportal:cache:v2";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");

let apps = [];

init();

async function init() {
  const cached = readCache();
  if (cached) {
    apps = cached;
    render();
    setStatus(`${apps.length} apps · cached`);
  }
  try {
    apps = await loadApps();
    saveCache(apps);
    render();
    setStatus(`${apps.length} apps tagged #${TOPIC}`);
  } catch (e) {
    if (!cached) {
      setStatus(
        e.message === "rate-limited"
          ? "GitHub's unauthenticated API limit (60/hr per IP) is exhausted — try again shortly."
          : `Couldn't reach GitHub (${e.message}).`,
        true
      );
    }
  }
  searchInput.addEventListener("input", render);
}

async function loadApps() {
  const url =
    `https://api.github.com/search/repositories` +
    `?q=topic:${TOPIC}&sort=stars&order=desc&per_page=100`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")
    throw new Error("rate-limited");
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return Promise.all((data.items || []).map(enrich));
}

// Pull the optional manifest + screenshot from the CDN (no API quota used).
async function enrich(repo) {
  const branch = repo.default_branch || "HEAD";
  const base = `https://raw.githubusercontent.com/${repo.full_name}/${branch}`;
  const og = `https://opengraph.githubassets.com/1/${repo.full_name}`;

  let m = {};
  try {
    const r = await fetch(`${base}/meta-portal.json`, { cache: "no-store" });
    if (r.ok) m = await r.json();
  } catch (_) {}

  const shot =
    m.screenshots && m.screenshots[0]
      ? `${base}/${String(m.screenshots[0]).replace(/^\.?\//, "")}`
      : og;

  return {
    name: m.name || repo.name,
    owner: repo.owner.login,
    full_name: repo.full_name,
    url: repo.html_url,
    releases: `${repo.html_url}/releases/latest`,
    description: m.description || repo.description || "",
    stars: repo.stargazers_count,
    category: m.category || "",
    models: Array.isArray(m.models) ? m.models : [],
    screenshot: shot,
    ogFallback: og,
  };
}

function render() {
  const q = (searchInput.value || "").toLowerCase().trim();
  const list = apps.filter(
    (a) =>
      !q ||
      `${a.name} ${a.description} ${a.owner} ${a.category} ${a.models.join(" ")}`
        .toLowerCase()
        .includes(q)
  );
  grid.innerHTML = list.length
    ? list.map(card).join("")
    : `<p class="empty">No apps match “${esc(q)}”.</p>`;
}

function card(a) {
  const cat = a.category ? `<span class="tag cat">${esc(a.category)}</span>` : "";
  const models = a.models.map((m) => `<span class="tag">${esc(m)}</span>`).join("");
  return `<article class="card">
    <a class="shot" href="${a.url}" target="_blank" rel="noopener">
      <img loading="lazy" alt="${esc(a.name)} screenshot" src="${a.screenshot}"
           onerror="this.onerror=null;this.src='${a.ogFallback}'">
    </a>
    <div class="body">
      <h3>${esc(a.name)}</h3>
      <p class="by">by ${esc(a.owner)} · ★ ${a.stars}</p>
      <p class="desc">${esc(a.description)}</p>
      <div class="tags">${cat}${models}</div>
      <div class="actions">
        <a class="btn" href="${a.url}" target="_blank" rel="noopener">GitHub</a>
        <a class="btn primary" href="${a.releases}" target="_blank" rel="noopener">Get APK ↓</a>
      </div>
    </div>
  </article>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}
function setStatus(msg, err) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", !!err);
}
function readCache() {
  try {
    const o = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (o && Date.now() - o.t < CACHE_TTL) return o.apps;
  } catch (_) {}
  return null;
}
function saveCache(a) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), apps: a }));
  } catch (_) {}
}
