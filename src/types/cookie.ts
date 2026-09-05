/**
 * Minimal, UI-decoupled representation of a browser cookie.
 * Only the fields used by this extension are carried over. Cookie values are
 * held in memory transiently and are never persisted or transmitted.
 */
export interface CookieInfo {
  name: string;
  value: string;
  /** Cookie domain as reported by the browser, e.g. ".example.com". */
  domain: string;
  path: string;
  /** Whether the cookie is Secure (https-only). */
  secure: boolean;
  session: boolean;
  storeId?: string;
}

/** The result of copying all cookies for a page. */
export type CopyResult =
  | { ok: true; count: number; header: string }
  | { ok: false; reason: string };

/** The result of deleting all cookies for a page. */
export type DeleteResult =
  | { ok: true; attempted: number; removed: number; failed: number }
  | { ok: false; reason: string };

/** The result of clearing all site data (cookies + storage) for a page. */
export type ClearSiteDataResult =
  | { ok: true; origin: string }
  | { ok: false; reason: string };

/** A cookie captured with the attributes needed to restore it later. */
export interface SavedCookie {
  name: string;
  value: string;
  /** Cookie domain as reported by the browser, e.g. ".example.com". */
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  /** Epoch seconds; absent for session cookies. */
  expirationDate?: number;
}

/**
 * A named snapshot of one site's cookies ("account"), used to switch between
 * accounts on the same site. Profiles are stored only in the browser's local
 * extension storage (chrome.storage.local) and never leave the device.
 */
export interface CookieProfile {
  id: string;
  /** Origin the profile belongs to, e.g. "https://example.com". */
  origin: string;
  /** User-provided note, e.g. "work account". */
  remark: string;
  cookies: SavedCookie[];
  savedAt: number;
}

/** The result of saving the current page's cookies as a profile. */
export type SaveProfileResult =
  | { ok: true; profile: CookieProfile }
  | { ok: false; reason: string };

/** The result of importing pasted cookie pairs into the current page. */
export type ImportResult =
  | { ok: true; attempted: number; imported: number; failed: number }
  | { ok: false; reason: string };

/** The result of applying a saved profile to the current page. */
export type ApplyProfileResult =
  | { ok: true; attempted: number; imported: number; failed: number }
  | { ok: false; reason: string };
