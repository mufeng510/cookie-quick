# Microsoft Edge Add-ons Listing

## Short description

Copy all cookies or clear site data for the current page with one click. Local-only, privacy-first.

## Full description

Cookie Quick is a small, privacy-first extension with exactly two functions:

- **📋 Copy all cookies** for the current page into your clipboard as a standard HTTP Cookie header (`name1=value1; name2=value2`) — never JSON.
- **🗑 Clear site data** for the current page — removes cookies plus the site's storage (localStorage, sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers), mirroring the browser dev tools "Clear site data" action, with a confirmation prompt and a verified result report.

Open any website, click the Cookie Quick icon, and either copy every cookie or clear the site's data. No cookie editor, no import/restore, no accounts, no analytics.

**Single Purpose:** Copy all cookies or clear site data for the current page.

**Privacy statement:** This extension processes cookie and site data locally in the browser only. Data is never transmitted to any external server. The extension does not use analytics, telemetry, tracking, or third-party services.

## Permissions

- `cookies` — reads and deletes cookies for the current page via `chrome.cookies`.
- `browsingData` — used only when you click "Clear site data": clears cookies and site storage **for the current site's origin only** via `chrome.browsingData.remove({ origins: [<current origin>] })`, mirroring the browser dev tools "Clear site data" action. Nothing is collected or transmitted.
- `activeTab` — reads the current tab's URL to know which site's cookies to operate on.
- `clipboardWrite` — writes the copied cookie header to the clipboard.
- `<all_urls>` host access — required by the `cookies` API to access cookies on the page you are viewing; data stays in your browser.
