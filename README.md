# Reportal

**A community gallery of sideloadable apps for repurposed Meta / Facebook Portals**,
served from [reportal.dev](https://reportal.dev).

People are turning discontinued Meta Portals into Android wall displays. Reportal
makes those apps discoverable: it's a single static page that, on load, asks GitHub
for every repo tagged [`meta-portal`](https://github.com/topics/meta-portal) and
renders them as an installable gallery.

## How it works

- **No backend, no database.** It's `index.html` + `app.js` on GitHub Pages.
- On load it makes **one** GitHub Search API call (`topic:meta-portal`), then pulls
  each app's optional [`meta-portal.json`](SPEC.md) manifest and screenshots straight
  from the CDN (`raw.githubusercontent.com` / `opengraph.githubassets.com`) — those
  don't count against the API rate limit.
- Results are cached in `localStorage` (6h). GitHub's unauthenticated limit
  (60 req/hr) is **per visitor IP**, so there's no shared bottleneck.

## List your app

Add the **`meta-portal`** topic to your repo (and, optionally, a `meta-portal.json`
manifest + a GitHub Release with your APK). It shows up automatically. See
[SPEC.md](SPEC.md).

## Develop locally

It's plain HTML/CSS/JS — no build step:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## Deploy (GitHub Pages)

This repo is the site root. Enable **Settings → Pages → Deploy from branch →
`main` / `/ (root)`**. The `CNAME` file points it at `reportal.dev`; set the DNS
records at your registrar to GitHub Pages (apex `A` records or a `www` `CNAME`).

## License

[MIT](LICENSE). Unofficial community project; not affiliated with Meta.
