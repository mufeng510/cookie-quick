# Microsoft Edge Add-ons Listing

## Short description

Copy, import, or switch saved accounts for the current page's cookies. Local-only, privacy-first.

## Full description

Cookie Quick is a small, privacy-first extension for managing the current page's cookies:

- **📋 Copy all cookies** for the current page into your clipboard as a standard HTTP Cookie header (`name1=value1; name2=value2`) — never JSON.
- **🗑 Clear site data** for the current page — removes cookies plus the site's storage (localStorage, sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers), mirroring the browser dev tools "Clear site data" action, with a confirmation prompt and a verified result report.
- **📥 Import cookies** — paste a Cookie header and apply it to the current site, with a per-cookie result report.
- **👤 Save & switch accounts** — save the current site's cookies under a remark (e.g. "work account", "personal account") and switch between them in one click: existing cookies are cleared first, the chosen account's cookies are restored, and the page reloads.

**Single Purpose:** Manage the current page's cookies locally — copy, import, clear site data, and switch between saved accounts.

**Privacy statement:** This extension processes cookie data locally in your browser only. Saved account profiles are stored exclusively in the browser's on-device extension storage (`chrome.storage.local`) and are never synced, uploaded, or transmitted anywhere. The extension makes no network requests and uses no analytics, telemetry, tracking, or third-party services.

## Permissions

- `cookies` — reads, writes, and deletes cookies for the current page via `chrome.cookies`.
- `browsingData` — used only when you click "Clear site data": clears cookies and site storage **for the current site's origin only** via `chrome.browsingData.remove({ origins: [<current origin>] })`, mirroring the browser dev tools "Clear site data" action. Nothing is collected or transmitted.
- `activeTab` — reads the current tab's URL to know which site's cookies to operate on.
- `clipboardWrite` — writes the copied cookie header to the clipboard.
- `storage` — stores saved cookie profiles locally on your device via `chrome.storage.local`. Never synced, never transmitted.
- `<all_urls>` host access — required by the `cookies` API to access cookies on the page you are viewing; data stays in your browser.
