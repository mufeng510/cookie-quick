/**
 * URL helpers for the Cookie Quick extension.
 *
 * Only http/https pages are eligible for cookie operations. Everything else
 * (chrome://, edge://, about:, file://, extension pages, etc.) is not.
 */

export const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns true if the given URL is a page we can safely operate cookies on.
 * Chrome/Edge internal and non-http(s) pages are excluded.
 */
export function canOperateOnUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  return SUPPORTED_PROTOCOLS.has(parsed.protocol);
}

/**
 * Returns the registrable hostname (e.g. "example.com") for display purposes.
 * Falls back to the full host if parsing fails.
 */
export function getDisplayHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
}

/**
 * Builds a legal delete URL for a cookie from its reported attributes.
 *
 * - Uses https when the cookie is Secure, otherwise http.
 * - Strips a leading "." from the domain so ".example.com" -> "example.com".
 * - Appends the cookie's path (default "/").
 *
 * Examples:
 *   { domain: ".example.com", path: "/user", secure: true } -> "https://example.com/user"
 *   { domain: "www.example.com", path: "/", secure: false } -> "http://www.example.com/"
 */
export function buildDeleteUrl(cookie: {
  domain: string;
  path: string;
  secure: boolean;
}): string {
  const protocol = cookie.secure ? 'https' : 'http';
  const domain = stripLeadingDot(cookie.domain);
  const path = cookie.path && cookie.path.length > 0 ? cookie.path : '/';
  return `${protocol}://${domain}${path}`;
}

/** Removes a single leading "." from a domain string, if present. */
export function stripLeadingDot(domain: string): string {
  return domain.startsWith('.') ? domain.slice(1) : domain;
}
