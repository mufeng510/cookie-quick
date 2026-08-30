# Chrome Web Store Listing

## Summary (132 characters)

```
Copy all cookies or clear site data for the current page with one click. No extra features, local-only, privacy-first.
```

## Description

Cookie Quick is a tiny, privacy-first extension that does exactly two things:

- **📋 Copy all cookies** for the current page into your clipboard as a standard HTTP Cookie header (`name1=value1; name2=value2`) — never JSON.
- **🗑 Clear site data** for the current page — removes cookies plus the site's storage (localStorage, sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers), mirroring the browser dev tools "Clear site data" action, with a confirmation prompt and a verified result report.

Open any website, click the Cookie Quick icon, and either copy every cookie or clear the site's data. That's it. No cookie editor, no import/restore, no accounts, no analytics.

**Single Purpose:** Copy all cookies or clear site data for the current page.

**Privacy:** This extension processes cookie and site data locally in the browser only. Data is never transmitted to any external server. The extension does not use analytics, telemetry, tracking, or third-party services.

## Permission justification

The extension requests the minimum permissions required for its two functions:

| Permission | Why it is required |
| --- | --- |
| `cookies` | Allows Chrome to read and delete cookies for the current page via `chrome.cookies`. |
| `browsingData` | Used only when the user clicks "Clear site data". Clears cookies and site storage (localStorage, sessionStorage, IndexedDB, Cache Storage, HTTP cache, service workers, WebSQL, file systems) **for the current site's origin only** via `chrome.browsingData.remove({ origins: [<current origin>] })`, mirroring the browser dev tools "Clear site data" action. Nothing is collected or transmitted. |
| `activeTab` | Lets the extension see the current tab's URL so it knows which site's cookies to operate on. |
| `clipboardWrite` | Lets the extension write the copied cookie header to your clipboard. |
| `<all_urls>` host access | The Chrome `cookies` API requires host access covering the sites whose cookies you wish to manage. Because you may click the icon on any page, this broad host permission is technically required. Cookie data never leaves your browser. |

## Privacy disclosure

This extension does not collect, store, or transmit any user data. Cookie processing is entirely local and transient.
