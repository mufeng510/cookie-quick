# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Changed

- **Clear site data** replaces the previous delete-cookies-only behavior. The delete action now clears cookies plus all scoped storage for the current site (localStorage/sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers, WebSQL, file systems), matching the browser dev tools "Clear site data" action via the `chrome.browsingData` API.

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
