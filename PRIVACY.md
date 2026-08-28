# Cookie Quick — Privacy Policy

**Effective date:** version 1.0.0

Cookie Quick is a browser extension whose single purpose is to copy all cookies or clear site data for the current page. This document explains exactly what the extension does with your data.

## Data collected

Cookie Quick collects **no personal data**. It does not collect, store, or transmit any information about you.

The only data the extension ever touches is the set of cookies for the currently active web page, and only when **you** click **Copy Cookie** or **Clear site data**.

## How cookie data is processed

- All cookie processing happens **locally, inside your browser**.
- Copying reads cookies via the browser's `chrome.cookies` API and writes the formatted header `name=value; name=value` to your system clipboard.
- Clearing site data removes cookies plus the site's storage (localStorage, sessionStorage, IndexedDB, Cache Storage, service workers, and more) via the browser's `chrome.browsingData` API.
- **Cookie data exists only in memory, transiently, during the operation you initiate.**

## What the extension never does

- **Never transmits** cookie data to any external server.
- **Never saves / persists** cookie data (no `chrome.storage`, no `localStorage`, no `sessionStorage`).
- **Never uses** analytics, telemetry, tracking, or third-party services.
- **Never loads** remote or CDN JavaScript.
- **Never makes** `fetch`, `XMLHttpRequest`, or `WebSocket` calls.
- **Never logs** cookie values (`console.log`) or includes them in URLs, query strings, or hashes.

## Core privacy statement

> This extension processes cookies locally in the browser only.
> Cookie data is never transmitted to any external server.
> The extension does not use analytics, telemetry, tracking, or third-party services.

## Permissions justification

| Permission | Purpose |
| --- | --- |
| `cookies` | Read cookies for the current page. |
| `browsingData` | Clear cookies and site storage for the current page. |
| `activeTab` | Read the current tab's URL to determine which site to operate on. |
| `clipboardWrite` | Write the copied cookie header to the system clipboard. |
| `host_permissions: <all_urls>` | Required by the Chrome `cookies` API to access cookies for arbitrary pages you visit. This broad permission is a technical requirement of the API, not a request to collect data. No cookie data leaves your browser. |

## Contact

For privacy inquiries, open an issue in the project repository.
