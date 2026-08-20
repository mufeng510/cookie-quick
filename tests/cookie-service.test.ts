import { beforeEach, describe, expect, it } from 'vitest';
import {
  formatCookieHeader,
  getCurrentCookies,
  deleteAllCurrentCookies,
  copyCookiesForUrl,
  deleteCookie,
  toCookieInfo,
} from '../src/services/cookie-service';
import type { CookieInfo } from '../src/types/cookie';
import { installChromeMock, resetChromeMock, setCurrentTabUrl, CookieStoreFake } from './helpers/chrome-mock';

let store: CookieStoreFake;

beforeEach(() => {
  resetChromeMock();
  store = installChromeMock();
  setCurrentTabUrl('https://www.example.com/test');
});

function cookie(overrides: Partial<CookieInfo> = {}): CookieInfo {
  return toCookieInfo({
    name: 'name',
    value: 'value',
    domain: '.example.com',
    path: '/',
    secure: true,
    session: true,
    storeId: '0',
    ...overrides,
  });
}

describe('formatCookieHeader', () => {
  it('formats a single cookie as name=value', () => {
    expect(formatCookieHeader([cookie({ name: 'session', value: 'abc' })])).toBe('session=abc');
  });

  it('formats multiple cookies joined by "; " with no extra whitespace/newlines', () => {
    const header = formatCookieHeader([
      cookie({ name: 'session', value: 'abc', domain: 'www.example.com' }),
      cookie({ name: 'token', value: 'xyz', domain: 'www.example.com' }),
    ]);
    expect(header).toBe('session=abc; token=xyz');
  });

  it('produces the exact required string for https://www.example.com/test with session & token', () => {
    const header = formatCookieHeader([
      cookie({ name: 'session', value: 'abc' }),
      cookie({ name: 'token', value: 'xyz' }),
    ]);
    // Exact-match guarantee required by the spec: no JSON, no Cookie:, no newline.
    expect(header).toBe('session=abc; token=xyz');
    expect(header).not.toContain('Cookie:');
    expect(header).not.toContain('\n');
    expect(header).not.toContain('domain');
    expect(header).not.toContain('path');
    expect(header).not.toContain('{');
    expect(header).not.toContain('[');
  });

  it('handles cookie values with special characters without mangling', () => {
    const header = formatCookieHeader([
      cookie({ name: 'a', value: 'hello%20world' }),
      cookie({ name: 'b', value: 'x;y=z' }),
    ]);
    expect(header).toBe('a=hello%20world; b=x;y=z');
  });

  it('returns an empty string for zero cookies', () => {
    expect(formatCookieHeader([])).toBe('');
  });

  it('ignores cookie attributes (domain/path/secure) in the header', () => {
    const header = formatCookieHeader([
      cookie({ name: 'sid', value: '123', domain: '.example.com', path: '/a', secure: true }),
      cookie({ name: 'uid', value: '1', domain: 'www.example.com', path: '/b', secure: false }),
    ]);
    expect(header).toBe('sid=123; uid=1');
  });
});

describe('getCurrentCookies (copy path)', () => {
  it('returns cookies scoped to the current page URL', async () => {
    store.add(cookie({ name: 'session', value: 'abc', domain: 'www.example.com' }));
    store.add(cookie({ name: 'token', value: 'xyz', domain: 'www.example.com' }));
    const cookies = await getCurrentCookies('https://www.example.com/test');
    expect(cookies.length).toBe(2);
  });

  it('returns zero cookies for a page with none', async () => {
    expect((await getCurrentCookies('https://www.example.com/test')).length).toBe(0);
  });

  it('excludes cookies that do not match the URL (different host)', async () => {
    store.add(cookie({ name: 'from', value: 'other', domain: 'other.com' }));
    expect((await getCurrentCookies('https://www.example.com/test')).length).toBe(0);
  });

  it('matches a domain cookie (.example.com) from a subdomain page', async () => {
    store.add(cookie({ name: 'session', value: 'abc', domain: '.example.com' }));
    const names = (await getCurrentCookies('https://www.example.com/test')).map((c) => c.name);
    expect(names).toContain('session');
  });

  it('respects path scope', async () => {
    store.add(cookie({ name: 'scoped', value: '1', domain: '.example.com', path: '/api' }));
    expect((await getCurrentCookies('https://www.example.com/test')).length).toBe(0);
    expect((await getCurrentCookies('https://www.example.com/api')).length).toBe(1);
  });
});

describe('copyCookiesForUrl', () => {
  it('copies cookies and reports the count', async () => {
    store.add(cookie({ name: 'session', value: 'abc', domain: '.example.com' }));
    store.add(cookie({ name: 'token', value: 'xyz', domain: 'www.example.com' }));
    let written: string | null = null;
    const result = await copyCookiesForUrl('https://www.example.com/test', async (t) => {
      written = t;
    });
    expect(result).toEqual({ ok: true, count: 2, header: 'session=abc; token=xyz' });
    expect(written).toBe('session=abc; token=xyz');
  });

  it('does not write anything and reports empty when there are no cookies', async () => {
    let written: string | null = null;
    const result = await copyCookiesForUrl('https://www.example.com/test', async (t) => {
      written = t;
    });
    expect(result.ok).toBe(false);
    expect(written).toBeNull();
  });

  it('reports copy failure', async () => {
    store.add(cookie({ name: 'a', value: '1' }));
    const result = await copyCookiesForUrl('https://www.example.com/test', async () => {
      throw new Error('clipboard denied');
    });
    expect(result).toEqual({ ok: false, reason: '复制失败' });
  });
});

describe('deleteCookie / deleteAllCurrentCookies', () => {
  it('builds an https delete URL for a secure domain cookie', async () => {
    let urlUsed: string | undefined;
    (chrome.cookies.remove as unknown) = async (opts: { url: string; name: string }) => {
      urlUsed = opts.url;
      return { url: opts.url, name: opts.name };
    };
    const ok = await deleteCookie(cookie({ name: 'session', value: 'abc', domain: '.example.com', secure: true, path: '/' }));
    expect(ok).toBe(true);
    expect(urlUsed).toBe('https://example.com/');
  });

  it('builds an http delete URL for a non-secure cookie', async () => {
    let urlUsed: string | undefined;
    (chrome.cookies.remove as unknown) = async (opts: { url: string; name: string }) => {
      urlUsed = opts.url;
      return { url: opts.url, name: opts.name };
    };
    await deleteCookie(cookie({ name: 't', value: '1', domain: 'www.example.com', secure: false, path: '/a' }));
    expect(urlUsed).toBe('http://www.example.com/a');
  });

  it('deletes all cookies and reports success', async () => {
    store.add(cookie({ name: 'a', value: '1', domain: '.example.com' }));
    store.add(cookie({ name: 'b', value: '2', domain: 'www.example.com' }));
    const result = await deleteAllCurrentCookies('https://www.example.com/test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempted).toBe(2);
      expect(result.removed).toBe(2);
      expect(result.failed).toBe(0);
    }
    expect(store.cookies.length).toBe(0);
  });

  it('reports partial failure when some removes fail', async () => {
    store.add(cookie({ name: 'a', value: '1', domain: '.example.com' }));
    store.add(cookie({ name: 'b', value: '2', domain: '.example.com' }));
    let calls = 0;
    (chrome.cookies.remove as unknown) = async (opts: { url: string; name: string }) => {
      calls += 1;
      if (opts.name === 'b') return undefined; // simulate failure for the second cookie
      return { url: opts.url, name: opts.name };
    };
    const result = await deleteAllCurrentCookies('https://www.example.com/test');
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempted).toBe(2);
      expect(result.removed).toBe(1);
      expect(result.failed).toBe(1);
    }
  });

  it('treats a rejected remove as a failure', async () => {
    store.add(cookie({ name: 'a', value: '1', domain: '.example.com' }));
    (chrome.cookies.remove as unknown) = async () => {
      throw new Error('boom');
    };
    const result = await deleteAllCurrentCookies('https://www.example.com/test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempted).toBe(1);
      expect(result.removed).toBe(0);
      expect(result.failed).toBe(1);
    }
  });

  it('does nothing when there are zero cookies', async () => {
    const result = await deleteAllCurrentCookies('https://www.example.com/test');
    expect(result).toEqual({ ok: true, attempted: 0, removed: 0, failed: 0 });
  });
});
