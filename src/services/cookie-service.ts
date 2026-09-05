import { CookieInfo, CopyResult, DeleteResult, ClearSiteDataResult, SavedCookie, ImportResult } from '../types/cookie';
import { canOperateOnUrl, buildDeleteUrl } from '../utils/url';
import { ActiveTab, getCurrentTab, getOperableUrl } from '../utils/tab';

/**
 * Cookie Quick core service.
 *
 * This module contains ALL Cookie logic and is fully UI-decoupled. It never
 * touches the network, never logs cookie values, and never persists them to
 * storage. Cookies exist only transiently in memory while a copy/delete runs.
 */

/** Returns the active tab. Exposed for tests and the popup. */
export { getCurrentTab };
export type { ActiveTab };

/** Maps a raw browser cookie to our minimal, testable representation. */
export function toCookieInfo(cookie: {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  session: boolean;
  storeId?: string;
}): CookieInfo {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    session: cookie.session,
    storeId: cookie.storeId,
  };
}

/**
 * Formats cookies into a standard HTTP Cookie header value:
 *
 *   name1=value1; name2=value2; name3=value3
 *
 * No "Cookie:" prefix, no JSON, no newlines, no metadata (domain/path/expires/
 * secure/httponly/samesite).
 */
export function formatCookieHeader(cookies: readonly CookieInfo[]): string {
  return cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * Retrieves the cookies the browser deems applicable to the given page URL,
 * using chrome.cookies.getAll({ url }). This lets the browser apply its own
 * domain/path/secure/sameSite/store matching rules instead of us re-implementing
 * cookie-scope logic.
 */
export async function getCurrentCookies(url: string): Promise<CookieInfo[]> {
  const all = await chrome.cookies.getAll({ url });
  return all.map(toCookieInfo);
}

/**
 * Deletes a single cookie using chrome.cookies.remove, building a legal delete
 * URL from the cookie's actual domain, path, and secure flags.
 */
export async function deleteCookie(cookie: CookieInfo): Promise<boolean> {
  try {
    const url = buildDeleteUrl(cookie);
    const removed = await chrome.cookies.remove({
      url,
      name: cookie.name,
      storeId: cookie.storeId,
    });
    return Boolean(removed);
  } catch {
    return false;
  }
}

/**
 * Deletes every cookie matching the given page URL and reports exactly how many
 * were removed vs. failed, so the UI never assumes success.
 */
export async function deleteAllCurrentCookies(url: string): Promise<DeleteResult> {
  const cookies = await getCurrentCookies(url);
  if (cookies.length === 0) {
    return { ok: true, attempted: 0, removed: 0, failed: 0 };
  }

  let removed = 0;
  let failed = 0;
  for (const cookie of cookies) {
    const success = await deleteCookie(cookie);
    if (success) removed += 1;
    else failed += 1;
  }

  return { ok: true, attempted: cookies.length, removed, failed };
}

/**
 * Verifies whether any cookies remain for a page URL (used after a delete to
 * confirm the operation actually cleared the cookies).
 */
export async function cookiesRemainForUrl(url: string): Promise<boolean> {
  const remaining = await getCurrentCookies(url);
  return remaining.length > 0;
}

/**
 * Helper used by tests and popup: safe copy of all cookies for a URL.
 * Returns a CopyResult with the formatted header and count.
 */
export async function copyCookiesForUrl(
  url: string,
  writeText: (text: string) => Promise<void>,
): Promise<CopyResult> {
  const cookies = await getCurrentCookies(url);
  if (cookies.length === 0) {
    return { ok: false, reason: '当前页面没有 Cookie' };
  }
  const header = formatCookieHeader(cookies);
  try {
    await writeText(header);
    return { ok: true, count: cookies.length, header };
  } catch {
    return { ok: false, reason: '复制失败' };
  }
}

/** Whether the given URL is eligible for cookie operations. */
export function isOperableUrl(url: string): boolean {
  return canOperateOnUrl(url);
}

/**
 * Clears all site data for the given page origin, mirroring the browser dev
 * tools "Clear site data" action: cookies plus the scoped storage types
 * (localStorage/sessionStorage, IndexedDB, Cache Storage, HTTP cache, service
 * workers, WebSQL, and file systems).
 */
export async function clearSiteData(url: string): Promise<ClearSiteDataResult> {
  const origin = new URL(url).origin;
  try {
    await chrome.browsingData.remove(
      { origins: [origin], since: 0 },
      {
        cookies: true,
        localStorage: true,
        indexedDB: true,
        cacheStorage: true,
        cache: true,
        serviceWorkers: true,
        webSQL: true,
        fileSystems: true,
      },
    );
    return { ok: true, origin };
  } catch {
    return { ok: false, reason: '清除站点数据失败' };
  }
}

export { getOperableUrl };

/**
 * Parses a pasted HTTP Cookie header into name/value pairs. Segments are
 * separated by ";" and each pair is split on the FIRST "=" so values may
 * themselves contain "=" (e.g. base64 padding). Segments without a name are
 * skipped rather than aborting the whole import.
 */
export function parseCookieHeader(header: string): { name: string; value: string }[] {
  const pairs: { name: string; value: string }[] = [];
  for (const segment of header.split(';')) {
    const trimmed = segment.trim();
    if (trimmed.length === 0) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue; // no "=" at all, or an empty name ("=value")
    const name = trimmed.slice(0, eq).trim();
    if (name.length === 0) continue;
    pairs.push({ name, value: trimmed.slice(eq + 1).trim() });
  }
  return pairs;
}

/**
 * Imports parsed cookie pairs into the current page's site via
 * chrome.cookies.set. The header carries no attributes, so each cookie is
 * written as a host-only cookie on the page's host with path "/" and the
 * Secure flag matching the page's scheme. Individual failures are counted,
 * not fatal, so a partially bad paste still imports the good cookies.
 */
export async function importCookiePairs(url: string, pairs: readonly { name: string; value: string }[]): Promise<ImportResult> {
  if (pairs.length === 0) {
    return { ok: false, reason: '没有可导入的 Cookie' };
  }

  const secure = new URL(url).protocol === 'https:';
  let imported = 0;
  let failed = 0;
  for (const pair of pairs) {
    try {
      const set = await chrome.cookies.set({
        url,
        name: pair.name,
        value: pair.value,
        path: '/',
        secure,
      });
      if (set) imported += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { ok: true, attempted: pairs.length, imported, failed };
}

/**
 * Imports a pasted Cookie header ("name1=value1; name2=value2") into the
 * current page's site.
 */
export async function importCookiesForUrl(url: string, header: string): Promise<ImportResult> {
  return importCookiePairs(url, parseCookieHeader(header));
}

/**
 * Captures the cookies applicable to the given page URL together with the
 * attributes needed to restore them later (domain/path/secure/httpOnly/
 * expirationDate). Used when saving a cookie profile.
 */
export async function getDetailedCookies(url: string): Promise<SavedCookie[]> {
  const all = await chrome.cookies.getAll({ url });
  return all.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: Boolean((cookie as { httpOnly?: boolean }).httpOnly),
    expirationDate: (cookie as { expirationDate?: number }).expirationDate,
  }));
}
