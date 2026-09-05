# Chrome Web Store Listing

## Summary (132 characters)

```
Copy, import, or switch saved accounts for the current page's cookies. Local-only, privacy-first.
```

## Description

Cookie Quick is a tiny, privacy-first extension for managing the current page's cookies:

- **📋 Copy all cookies** for the current page into your clipboard as a standard HTTP Cookie header (`name1=value1; name2=value2`) — never JSON.
- **🗑 Clear site data** for the current page — removes cookies plus the site's storage (localStorage, sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers), mirroring the browser dev tools "Clear site data" action, with a confirmation prompt and a verified result report.
- **📥 Import cookies** — paste a Cookie header and apply it to the current site, with a per-cookie result report.
- **👤 Save & switch accounts** — save the current site's cookies under a remark (e.g. "work account", "personal account") and switch between them in one click: existing cookies are cleared first, the chosen account's cookies are restored, and the page reloads.

**Single Purpose:** Manage the current page's cookies locally — copy, import, clear site data, and switch between saved accounts.

**Privacy:** This extension processes cookie data locally in your browser only. Saved account profiles are stored exclusively in the browser's on-device extension storage (`chrome.storage.local`) and are never synced, uploaded, or transmitted anywhere. The extension makes no network requests and uses no analytics, telemetry, tracking, or third-party services.

## Permission justification

The extension requests the minimum permissions required for its functions:

| Permission | Why it is required |
| --- | --- |
| `cookies` | Allows Chrome to read, set, and delete cookies for the current page via `chrome.cookies`. |
| `browsingData` | Used only when the user clicks "Clear site data". Clears cookies and site storage (localStorage, sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers, WebSQL, file systems) **for the current site's origin only** via `chrome.browsingData.remove({ origins: [<current origin>] })`, mirroring the browser dev tools "Clear site data" action. Nothing is collected or transmitted. |
| `activeTab` | Lets the extension see the current tab's URL so it knows which site's cookies to operate on. |
| `clipboardWrite` | Lets the extension write the copied cookie header to your clipboard. |
| `storage` | Stores saved cookie profiles in `chrome.storage.local` — the browser's on-device extension storage — only when the user explicitly saves one. Data is never synced to any account and never transmitted. |
| `<all_urls>` host access | The Chrome `cookies` API requires host access covering the sites whose cookies you wish to manage. Because you may click the icon on any page, this broad host permission is technically required. Cookie data never leaves your browser. |

## Privacy disclosure

This extension does not collect, store, or transmit any user data to any server. Cookie processing is entirely local and transient; the only persistence is `chrome.storage.local` on the user's own device, written only when the user explicitly saves a cookie profile.
