# Microsoft Edge Add-ons Listing

## Short description

Copy or delete all cookies for the current page with one click. Local-only, privacy-first, no extra features.

## Full description

Cookie Quick is a small, privacy-first extension with exactly two functions:

- **📋 Copy all cookies** for the current page into your clipboard as a standard HTTP Cookie header (`name1=value1; name2=value2`) — never JSON.
- **🗑 Delete all cookies** for the current page, safely, with a confirmation prompt and a verified result report.

Open any website, click the Cookie Quick icon, and either copy every cookie or clear them all. No cookie editor, no import/restore, no accounts, no analytics.

**Single Purpose:** Copy or delete all cookies for the current page.

**Privacy statement:** This extension processes cookies locally in the browser only. Cookie data is never transmitted to any external server. The extension does not use analytics, telemetry, tracking, or third-party services.

## Permissions

- `cookies` — reads and deletes cookies for the current page via `chrome.cookies`.
- `activeTab` — reads the current tab's URL to know which site's cookies to operate on.
- `clipboardWrite` — writes the copied cookie header to the clipboard.
- `<all_urls>` host access — required by the `cookies` API to access cookies on the page you are viewing; data stays in your browser.
