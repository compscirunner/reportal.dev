// Reportal Widgets — a fully static gallery of Portal *widgets*.
// Same approach as the apps gallery (app.js): one GitHub Search API call for
// repos tagged `meta-portal-widget`, then each repo's meta-portal-widget.json is
// pulled from the CDN (no API quota). `fork:true` because many widgets (e.g.
// ws4kp) are forks, which GitHub repository search hides by default.

const TOPIC = "meta-portal-widget";
const CACHE_KEY = "reportal:widgets:v1";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");

let widgets = [];

init();

async function init() {
  const cached = readCache();
  if (cached) {
    widgets = cached;
    render();
    setStatus(`${widgets.length} widgets · cached`);
  }
  try {
    widgets = await loadWidgets();
    saveCache(widgets);
    render();
    setStatus(`${widgets.length} widgets tagged #${TOPIC}`);
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

async function loadWidgets() {
  const url =
    `https://api.github.com/search/repositories` +
    `?q=topic:${TOPIC}+fork:true&sort=updated&order=desc&per_page=100`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")
    throw new Error("rate-limited");
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return Promise.all((data.items || []).map(enrich));
}

// Pull the widget manifest from the CDN (no API quota used).
async function enrich(repo) {
  const branch = repo.default_branch || "HEAD";
  const base = `https://raw.githubusercontent.com/${repo.full_name}/${branch}`;
  const og = `https://opengraph.githubassets.com/1/${repo.full_name}`;

  let m = {};
  try {
    const r = await fetch(`${base}/meta-portal-widget.json`, { cache: "no-store" });
    if (r.ok) m = await r.json();
  } catch (_) {}

  // Resolve a live preview URL the same way the Portal host does: an explicit
  // `url`, else the repo's GitHub Pages site for `entry`.
  const [owner, repoName] = repo.full_name.split("/");
  const entry = String(m.entry || "index.html").replace(/^\.?\//, "");
  const preview = m.url || `https://${owner}.github.io/${repoName}/${entry}`;

  const shot =
    m.screenshots && m.screenshots[0]
      ? `${base}/${String(m.screenshots[0]).replace(/^\.?\//, "")}`
      : og;

  const config = Array.isArray(m.config)
    ? m.config.map((f) => f.label || f.key).filter(Boolean)
    : [];

  return {
    name: m.name || repo.name,
    owner: repo.owner.login,
    url: repo.html_url,
    preview,
    description: m.description || repo.description || "",
    stars: repo.stargazers_count,
    config,
    screenshot: shot,
    ogFallback: og,
  };
}

function render() {
  const q = (searchInput.value || "").toLowerCase().trim();
  const list = widgets.filter(
    (w) =>
      !q ||
      `${w.name} ${w.description} ${w.owner} ${w.config.join(" ")}`
        .toLowerCase()
        .includes(q)
  );
  grid.innerHTML = list.length
    ? list.map(card).join("")
    : `<p class="empty">No widgets match “${esc(q)}”.</p>`;
}

function card(w) {
  const cfg = w.config.length
    ? `<div class="tags">${w.config
        .map((c) => `<span class="tag">${esc(c)}</span>`)
        .join("")}</div>`
    : "";
  return `<article class="card">
    <a class="shot" href="${w.preview}" target="_blank" rel="noopener">
      <img loading="lazy" alt="${esc(w.name)}" src="${w.screenshot}"
           onerror="this.onerror=null;this.src='${w.ogFallback}'">
    </a>
    <div class="body">
      <h3>${esc(w.name)}</h3>
      <p class="by">by ${esc(w.owner)} · ★ ${w.stars}</p>
      <p class="desc">${esc(w.description)}</p>
      ${cfg}
      <div class="actions">
        <a class="btn" href="${w.url}" target="_blank" rel="noopener">GitHub</a>
        <a class="btn primary" href="${w.preview}" target="_blank" rel="noopener">Preview ↗</a>
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
    if (o && Date.now() - o.t < CACHE_TTL) return o.widgets;
  } catch (_) {}
  return null;
}
function saveCache(w) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), widgets: w }));
  } catch (_) {}
}
