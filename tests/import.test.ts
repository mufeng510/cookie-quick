import { beforeEach, describe, expect, it } from 'vitest';
import {
  parseCookieHeader,
  importCookiePairs,
  importCookiesForUrl,
} from '../src/services/cookie-service';
import { installChromeMock, resetChromeMock, CookieStoreFake } from './helpers/chrome-mock';

let store: CookieStoreFake;

beforeEach(() => {
  resetChromeMock();
  store = installChromeMock();
});

describe('parseCookieHeader', () => {
  it('parses a standard header with "; " separators', () => {
    expect(parseCookieHeader('session=abc; token=xyz')).toEqual([
      { name: 'session', value: 'abc' },
      { name: 'token', value: 'xyz' },
    ]);
  });

  it('splits each pair on the first "=" so values may contain "="', () => {
    expect(parseCookieHeader('a=b=c; d=e')).toEqual([
      { name: 'a', value: 'b=c' },
      { name: 'd', value: 'e' },
    ]);
  });

  it('trims whitespace around names and values and tolerates bare ";" separators', () => {
    expect(parseCookieHeader('  a = 1 ;  b=2;; c =3;')).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
      { name: 'c', value: '3' },
    ]);
  });

  it('skips segments without a name or without "="', () => {
    expect(parseCookieHeader('=value; novalue; a=1; ;')).toEqual([{ name: 'a', value: '1' }]);
  });

  it('returns an empty list for empty or whitespace-only input', () => {
    expect(parseCookieHeader('')).toEqual([]);
    expect(parseCookieHeader('   ')).toEqual([]);
  });

  it('keeps URL-encoded values untouched', () => {
    expect(parseCookieHeader('sid=hello%20world')).toEqual([{ name: 'sid', value: 'hello%20world' }]);
  });
});

describe('importCookiesForUrl / importCookiePairs', () => {
  it('imports each parsed pair as a host cookie on the page host', async () => {
    const result = await importCookiesForUrl('https://www.example.com/test', 'session=abc; token=xyz');
    expect(result).toEqual({ ok: true, attempted: 2, imported: 2, failed: 0 });

    const names = (await store.getAll({ url: 'https://www.example.com/test' })).map((c) => c.name);
    expect(names).toEqual(['session', 'token']);
  });

  it('derives the Secure flag from the page scheme', async () => {
    await importCookiesForUrl('https://www.example.com/', 'a=1');
    await importCookiesForUrl('http://www.example.com/', 'b=2');
    const a = store.cookies.find((c) => c.name === 'a');
    const b = store.cookies.find((c) => c.name === 'b');
    expect(a?.secure).toBe(true);
    expect(b?.secure).toBe(false);
  });

  it('sets cookies with path "/" and no expiration (session cookies)', async () => {
    await importCookiesForUrl('https://www.example.com/', 'a=1');
    const a = store.cookies.find((c) => c.name === 'a');
    expect(a?.path).toBe('/');
    expect(a?.session).toBe(true);
    expect(a?.domain).toBe('www.example.com');
  });

  it('overwrites an existing cookie with the same name when importing', async () => {
    store.add({
      name: 'session',
      value: 'old',
      domain: 'www.example.com',
      path: '/',
      secure: true,
      session: true,
    });
    await importCookiesForUrl('https://www.example.com/', 'session=new');
    const session = store.cookies.find((c) => c.name === 'session');
    expect(session?.value).toBe('new');
    expect(store.cookies.filter((c) => c.name === 'session')).toHaveLength(1);
  });

  it('rejects an empty header without setting anything', async () => {
    const result = await importCookiesForUrl('https://www.example.com/', '   ');
    expect(result).toEqual({ ok: false, reason: '没有可导入的 Cookie' });
    expect(store.cookies).toHaveLength(0);
  });

  it('counts individual failures without aborting the rest', async () => {
    const originalSet = chrome.cookies.set;
    (chrome.cookies as unknown as Record<string, unknown>).set = async (opts: { name: string }) => {
      if (opts.name === 'bad') return undefined; // simulate a rejected cookie
      return store.set(opts as Parameters<CookieStoreFake['set']>[0]);
    };
    try {
      const result = await importCookiePairs('https://www.example.com/', [
        { name: 'good', value: '1' },
        { name: 'bad', value: '2' },
        { name: 'also-good', value: '3' },
      ]);
      expect(result).toEqual({ ok: true, attempted: 3, imported: 2, failed: 1 });
    } finally {
      (chrome.cookies as unknown as Record<string, unknown>).set = originalSet;
    }
  });

  it('treats a rejecting chrome.cookies.set as failures for every pair', async () => {
    resetChromeMock();
    store = installChromeMock(['set']);
    const result = await importCookiesForUrl('https://www.example.com/', 'a=1; b=2');
    expect(result).toEqual({ ok: true, attempted: 2, imported: 0, failed: 2 });
  });
});
