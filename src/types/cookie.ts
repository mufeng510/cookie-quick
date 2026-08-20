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
