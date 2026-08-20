import { CookieInfo, CopyResult, DeleteResult } from '../types/cookie';
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

export { getOperableUrl };
