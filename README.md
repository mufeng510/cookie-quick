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

## Releasing

Releases are fully automatic and driven by the version in `package.json`. To ship a release:

1. Bump `version` in `package.json` (semver) and run `node scripts/sync-version.mjs`.
2. Update `CHANGELOG.md`.
3. Push to `main`.

The `Release` workflow then detects the unreleased version, and: installs deps, lints, tests, builds, packages, pushes the `v<version>` tag, creates the GitHub Release with the extension ZIP, and publishes it to both stores. Already-released versions are skipped, so ordinary pushes to `main` never publish anything.

Required GitHub Secrets for store publishing (until configured, those publish steps are skipped with a warning):

- Chrome Web Store: `CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`
- Edge Add-ons: `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY`

> Only the official Chrome Web Store API / Edge Add-ons API are used — no legacy publishing endpoints.

To (re-)publish an already-released version manually, dispatch the `Publish to Chrome Web Store` / `Publish to Microsoft Edge Add-ons` workflows, optionally against a tag ref:

```bash
gh workflow run chrome-publish.yml --ref v1.1.0
gh workflow run edge-publish.yml --ref v1.1.0
```

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
