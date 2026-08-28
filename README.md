# Cookie Quick

**A minimal, privacy-first browser extension for Chrome and Microsoft Edge.**

Copy all cookies or clear site data for the current page with a single click.

- **Copy all cookies** — copies a standard HTTP Cookie header string (`name1=value1; name2=value2`) to your clipboard.
- **Clear site data** — removes cookies plus the site's storage (localStorage, sessionStorage, IndexedDB, Cache Storage, service workers, and more), matching the browser dev tools "Clear site data" action, after a confirmation step.

That's it. No cookie editor, no JSON export, no import/restore, no accounts, no analytics.

---

## Features

- 📋 **Copy all cookies for the current page** — produces exactly `name=value; name=value; name=value`, never JSON, never `Cookie:`, never newlines.
- 🗑 **Clear site data for the current page** — removes cookies and scoped storage using the browser's own `browsingData` API, with a confirmation dialog and verified result reporting.

## Privacy

This extension is **local-only**. It processes cookies entirely inside your browser.

Never does the extension:

- Upload or transmit cookie data to any server.
- Save or persist cookie data (no `chrome.storage`, no `localStorage`, no `sessionStorage`).
- Analyze, aggregate, or profile cookie data.
- Use analytics, telemetry, tracking, or third-party services.
- Load any remote or CDN JavaScript.
- Use `console.log` on cookie values.

> **Why `<all_urls>`?** The Chrome `cookies` API requires host permissions covering the sites whose cookies the extension accesses. Because this extension must read/delete cookies on *any* page you visit, the broad `host_permissions: ["<all_urls>"]` permission is technically required. Cookie data never leaves your local browser, and no network request is ever made.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `cookies` | Read cookies for the current page via `chrome.cookies`. |
| `browsingData` | Clear cookies and site storage for the current page via `chrome.browsingData`. |
| `activeTab` | Read the current active tab's URL to know which site to operate on. |
| `clipboardWrite` | Write the copied cookie header to the system clipboard. |
| `host_permissions: <all_urls>` | Required by the Chrome `cookies` API to access cookies on arbitrary pages. Data stays local. |

## Development

```bash
npm install    # install dependencies
npm run dev    # start the local dev server (Vite)
```

## Build

```bash
npm run build      # typecheck + production build into dist/
npm run package    # build + create release/cookie-quick-<version>.zip
npm run check      # lint + test + build + package (full quality gate)
```

Other scripts:

```bash
npm run test           # run unit tests
npm run test:watch     # watch mode
npm run lint           # eslint
```

## Install locally

### Google Chrome

1. Open `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right).
3. Click **Load unpacked** and select the `dist/` folder.

### Microsoft Edge

1. Open `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.

> The ZIP produced by `npm run package` is the file you upload to the Chrome Web Store / Edge Add-ons.

## Reproducing a release with a tag

Pushing a Git tag such as `v1.0.0` triggers an automated GitHub Release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The `release.yml` workflow: installs deps, lints, tests, builds, packages, creates a GitHub Release, and uploads the extension ZIP.

### Chrome Web Store auto-publish (`chrome-publish.yml`)

On a `v*` tag, the extension is built, packaged, and published to the Chrome Web Store via the official Chrome Web Store API. Required GitHub Secrets:

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

> For the newest "Chrome Web Store API" / Server-to-Server flow, some installations use a `CHROME_PUBLISHER_ID` (or a service-account credential) instead of the refresh-token flow. Configure the secrets matching the API flow your store project uses; **only the official Chrome Web Store API is used — the legacy, deprecated publishing endpoints are not.**

### Edge Add-ons auto-publish (`edge-publish.yml`)

On a `v*` tag, the extension is packaged and submitted to the Microsoft Edge Add-ons store via the official Edge Add-ons API. Required GitHub Secrets:

- `EDGE_PRODUCT_ID`
- `EDGE_CLIENT_ID`
- `EDGE_API_KEY`

## Security

- No network requests (`fetch`, `XMLHttpRequest`, `WebSocket`) are made anywhere in the extension.
- No cookie value is ever written to storage, logs, URLs, query strings, or hashes.
- Cookie data exists only transiently in memory during a copy/delete operation.
- No `eval`, no `new Function`, no remote code.
- All publishing credentials are read from GitHub Secrets and are never printed, echoed, or written into artifacts.

## Single Purpose

**This extension's single purpose is to copy all cookies or clear site data for the current page — and nothing else.**

## License

MIT
