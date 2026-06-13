# The `meta-portal` listing convention

Reportal builds its gallery entirely from public GitHub data — there's no
database and no submission form. To list your Portal app:

## 1. Add the topic (required)

Add the **`meta-portal`** topic to your GitHub repo
(repo home → ⚙️ next to *About* → *Topics*). That alone makes it appear, using
your repo's name, description, star count, and social-preview image.

## 2. Add a `meta-portal.json` manifest (optional, recommended)

Drop a `meta-portal.json` at the **root of your repo's default branch** to control
how the card looks. All fields are optional; anything omitted falls back to GitHub
metadata.

```json
{
  "name": "ISS Tracker",
  "description": "Live ISS dashboard — video, ground track, crew, space weather.",
  "package": "com.portal.isstracker",
  "category": "space",
  "models": ["portal-plus", "portal-2019"],
  "screenshots": ["docs/dashboard-landscape.png", "docs/dashboard-portrait.png"],
  "minSdk": 24
}
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Display name (defaults to repo name) |
| `description` | string | One-line summary (defaults to repo description) |
| `package` | string | Android application id |
| `category` | string | e.g. `space`, `media`, `home`, `clock`, `game`, `utility` |
| `models` | string[] | Tested devices, e.g. `portal-plus`, `portal-2019`, `portal-mini`, `portal-tv` |
| `screenshots` | string[] | Repo-relative image paths; the first is used as the card image |
| `minSdk` | number | Minimum Android API level |

## 3. Publish a release (recommended)

Attach your APK to a GitHub **Release**. The card's "Get APK" button links to your
`releases/latest`, so users can download and sideload it.

## How it's fetched

The site reads the manifest and screenshots directly from
`raw.githubusercontent.com` (the CDN, not the API), so they don't count against
GitHub's rate limit. Changes appear within a few hours (browser cache TTL).
