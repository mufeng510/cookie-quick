import {
  ApplyProfileResult,
  CookieProfile,
  SaveProfileResult,
  SavedCookie,
} from '../types/cookie';
import { deleteAllCurrentCookies, getDetailedCookies } from './cookie-service';

/**
 * Saved cookie profiles ("accounts") for switching between multiple accounts
 * on the same site.
 *
 * Profiles live ONLY in the browser's local extension storage
 * (chrome.storage.local) on the user's own device. Nothing is ever synced,
 * uploaded, or transmitted.
 */

const STORAGE_KEY = 'cookieProfiles';

async function readProfiles(): Promise<CookieProfile[]> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const profiles = (data as Record<string, unknown>)[STORAGE_KEY];
  return Array.isArray(profiles) ? (profiles as CookieProfile[]) : [];
}

async function writeProfiles(profiles: CookieProfile[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: profiles });
}

/** Generates a locally-unique profile id (no crypto/random-UUID dependency). */
function makeId(): string {
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns saved profiles, newest first. When `origin` is given, only profiles
 * belonging to that origin ("https://example.com") are returned.
 */
export async function listProfiles(origin?: string): Promise<CookieProfile[]> {
  const profiles = await readProfiles();
  const filtered = origin ? profiles.filter((p) => p.origin === origin) : profiles;
  return filtered.sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Saves the current page's cookies as a named profile (an "account"). The
 * full cookie attributes are captured so the profile can be restored later.
 */
export async function saveCurrentProfile(url: string, remark: string): Promise<SaveProfileResult> {
  const cookies = await getDetailedCookies(url);
  if (cookies.length === 0) {
    return { ok: false, reason: '当前页面没有 Cookie，无法保存' };
  }

  const profile: CookieProfile = {
    id: makeId(),
    origin: new URL(url).origin,
    remark: remark.trim().length > 0 ? remark.trim() : '未命名账号',
    cookies,
    savedAt: Date.now(),
  };

  const profiles = await readProfiles();
  profiles.unshift(profile);
  await writeProfiles(profiles);
  return { ok: true, profile };
}

/** Deletes a saved profile by id. */
export async function deleteProfile(id: string): Promise<void> {
  const profiles = await readProfiles();
  const remaining = profiles.filter((p) => p.id !== id);
  await writeProfiles(remaining);
}

/**
 * Restores a saved profile onto the current page: all of the site's current
 * cookies are removed first, then the profile's cookies are written back with
 * their original attributes. Expired cookies are skipped silently.
 */
export async function applyProfile(url: string, profile: CookieProfile): Promise<ApplyProfileResult> {
  const cleared = await deleteAllCurrentCookies(url);
  if (!cleared.ok || cleared.failed > 0) {
    const reason = cleared.ok
      ? `有 ${cleared.failed} 个现有 Cookie 删除失败，已中止切换`
      : '无法清除当前站点的 Cookie，已中止切换';
    return { ok: false, reason };
  }

  const nowSeconds = Date.now() / 1000;
  const restorable = profile.cookies.filter(
    (c) => typeof c.expirationDate !== 'number' || c.expirationDate > nowSeconds,
  );

  let imported = 0;
  let failed = 0;
  for (const cookie of restorable) {
    const ok = await setSavedCookie(url, cookie);
    if (ok) imported += 1;
    else failed += 1;
  }

  return { ok: true, attempted: restorable.length, imported, failed };
}

/** Writes one saved cookie back via chrome.cookies.set. */
async function setSavedCookie(url: string, cookie: SavedCookie): Promise<boolean> {
  try {
    const set = await chrome.cookies.set({
      url,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path && cookie.path.length > 0 ? cookie.path : '/',
      ...(cookie.domain ? { domain: cookie.domain } : {}),
      ...(typeof cookie.secure === 'boolean' ? { secure: cookie.secure } : {}),
      ...(typeof cookie.httpOnly === 'boolean' ? { httpOnly: cookie.httpOnly } : {}),
      ...(typeof cookie.expirationDate === 'number' ? { expirationDate: cookie.expirationDate } : {}),
    });
    return Boolean(set);
  } catch {
    return false;
  }
}
