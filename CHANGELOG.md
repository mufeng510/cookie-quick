# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## [1.2.0] - 2026-08-30

### Added

- **Import cookies** — paste a Cookie header (`name1=value1; name2=value2`) into the popup and apply it to the current site via `chrome.cookies.set`; each pair is written as a host-only cookie on the page's host with the Secure flag derived from the page scheme, and per-cookie failures are counted, not silently dropped.
- **Save & switch accounts (cookie profiles)** — save the current site's cookies (with domain, path, secure, httpOnly, and expiry attributes) as a named profile with a remark, list them per-site in the popup, and switch accounts in one click: existing site cookies are cleared first, the profile is restored, and the page reloads. Expired cookies are skipped when restoring, and partial restore failures are reported.
- New `storage` permission for `chrome.storage.local`. Profiles are stored **only** on the user's own device, never synced, and never transmitted; the README, store listings, and privacy disclosures have been updated accordingly.

## [1.1.1] - 2026-08-30

### Fixed

- Added extension localization metadata — `_locales` folders for English (default) and Simplified Chinese, localized manifest `name`/`description`/`action.default_title` via `__MSG_...__`, and `default_locale: "en"`. Store partners detect listing languages from the package's `_locales` folder, so packages without it could not proceed past the store listing step (seen in Edge Partner Center, where the detected language came up empty).

## [1.1.0] - 2026-08-29

### Changed

- **Clear site data** replaces the previous delete-cookies-only behavior. The delete action now clears cookies plus all scoped storage for the current site (localStorage/sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers, WebSQL, file systems), matching the browser dev tools "Clear site data" action via the `chrome.browsingData` API.

### GitHub Actions

- Releases are now fully automatic: pushing to `main` with a new `version` in `package.json` builds, packages, pushes the `v<version>` tag, creates the GitHub Release, and publishes to the Chrome Web Store and Microsoft Edge Add-ons. Manual tag pushes are no longer needed or used.
- `chrome-publish.yml` and `edge-publish.yml` remain as manual (`workflow_dispatch`) fallbacks for re-publishing; automatic publishing now lives in `release.yml`.
- Store publish steps are skipped with a warning until the `CHROME_*` / `EDGE_*` GitHub Secrets are configured.

## [1.0.0] - 2026-08-19

### Added

- **Copy all cookies** for the current page, formatted as a standard HTTP Cookie header (`name1=value1; name2=value2`).
- **Delete all cookies** for the current page, with an explicit confirmation dialog.
- Verifies deleted cookies after removal and reports partial failures.
- Minimal, privacy-first Chrome / Edge extension using Manifest V3.
- No network requests, no cookie persistence, no analytics, no tracking.
- Full unit test suite covering cookie formatting, URL scoping, and deletion.
- GitHub Actions CI, Release, Chrome Web Store publish, and Edge Add-ons publish workflows.
- Local installation instructions for Chrome and Edge.

### Security

- Cookie data is processed locally only and never transmitted, stored, or logged.
- Publishing credentials are read exclusively from GitHub Secrets.

### GitHub Actions

- `CI`, `release.yml` (GitHub Release + ZIP asset), `chrome-publish.yml` (Chrome Web Store API v2 via `wdzeng/chrome-extension`), and `edge-publish.yml` (Edge Add-ons API v1.1 via `wdzeng/edge-addon`) workflows.
- Store publish workflows support both tag-triggered and manual (`workflow_dispatch`) runs.
- Store publishing requires the `CHROME_*` / `EDGE_*` GitHub Secrets to be configured before it can complete.
