import { beforeEach, describe, expect, it } from 'vitest';
import {
  listProfiles,
  saveCurrentProfile,
  deleteProfile,
  applyProfile,
} from '../src/services/profile-service';
import { installChromeMock, resetChromeMock, CookieStoreFake } from './helpers/chrome-mock';
import type { CookieProfile, SavedCookie } from '../src/types/cookie';

let store: CookieStoreFake;

const PAGE = 'https://www.example.com/test';
const ORIGIN = 'https://www.example.com';

beforeEach(() => {
  resetChromeMock();
  store = installChromeMock();
});

function addCookie(name: string, value: string, overrides: Partial<SavedCookie> = {}): void {
  store.add({
    name,
    value,
    domain: 'www.example.com',
    path: '/',
    secure: true,
    session: true,
    ...overrides,
  });
}

describe('saveCurrentProfile', () => {
  it('saves the current cookies with their attributes under the page origin', async () => {
    addCookie('session', 'abc', { secure: true });
    addCookie('token', 'xyz', { domain: '.example.com', httpOnly: true });

    const result = await saveCurrentProfile(PAGE, '工作账号');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.profile.origin).toBe(ORIGIN);
    expect(result.profile.remark).toBe('工作账号');
    expect(result.profile.cookies).toHaveLength(2);
    const token = result.profile.cookies.find((c) => c.name === 'token');
    expect(token?.domain).toBe('.example.com');
    expect(token?.httpOnly).toBe(true);
  });

  it('persists the profile into chrome.storage.local', async () => {
    addCookie('a', '1');
    const result = await saveCurrentProfile(PAGE, 'p1');
    expect(result.ok).toBe(true);
    const saved = (await chrome.storage.local.get('cookieProfiles'))['cookieProfiles'];
    expect(Array.isArray(saved)).toBe(true);
    expect((saved as CookieProfile[])[0].remark).toBe('p1');
  });

  it('falls back to a default remark when the input is blank', async () => {
    addCookie('a', '1');
    const result = await saveCurrentProfile(PAGE, '   ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile.remark).toBe('未命名账号');
  });

  it('trims surrounding whitespace from the remark', async () => {
    addCookie('a', '1');
    const result = await saveCurrentProfile(PAGE, '  账号A  ');
    if (result.ok) expect(result.profile.remark).toBe('账号A');
  });

  it('refuses to save an empty page', async () => {
    const result = await saveCurrentProfile(PAGE, 'any');
    expect(result).toEqual({ ok: false, reason: '当前页面没有 Cookie，无法保存' });
    expect(store.storageData['cookieProfiles']).toBeUndefined();
  });

  it('puts newer profiles first', async () => {
    addCookie('a', '1');
    await saveCurrentProfile(PAGE, 'first');
    await saveCurrentProfile(PAGE, 'second');
    const profiles = await listProfiles(ORIGIN);
    expect(profiles.map((p) => p.remark)).toEqual(['second', 'first']);
  });
});

describe('listProfiles', () => {
  it('returns only profiles belonging to the given origin', async () => {
    addCookie('a', '1');
    await saveCurrentProfile(PAGE, 'example');
    store.add({
      name: 'b',
      value: '2',
      domain: 'other.com',
      path: '/',
      secure: true,
      session: true,
    });
    await saveCurrentProfile('https://other.com/page', 'other');

    const exampleProfiles = await listProfiles(ORIGIN);
    expect(exampleProfiles.map((p) => p.remark)).toEqual(['example']);

    const all = await listProfiles();
    expect(all).toHaveLength(2);
  });

  it('returns an empty list when nothing was saved', async () => {
    expect(await listProfiles(ORIGIN)).toEqual([]);
  });
});

describe('deleteProfile', () => {
  it('removes only the targeted profile', async () => {
    addCookie('a', '1');
    const first = await saveCurrentProfile(PAGE, 'first');
    const second = await saveCurrentProfile(PAGE, 'second');
    if (!first.ok || !second.ok) throw new Error('save failed');

    await deleteProfile(first.profile.id);
    const profiles = await listProfiles(ORIGIN);
    expect(profiles.map((p) => p.remark)).toEqual(['second']);
  });
});

describe('applyProfile', () => {
  it('replaces the site cookies with the profile cookies and restores attributes', async () => {
    // Current (account A) cookies.
    addCookie('session', 'old-session', { domain: '.example.com' });
    addCookie('leftover', 'gone', { domain: '.example.com' });

    // Saved profile (account B) with a domain cookie + persistent expiry.
    const profile: CookieProfile = {
      id: 'p1',
      origin: ORIGIN,
      remark: '账号B',
      cookies: [
        {
          name: 'session',
          value: 'new-session',
          domain: '.example.com',
          path: '/',
          secure: true,
          httpOnly: true,
          expirationDate: Math.floor(Date.now() / 1000) + 3600,
        },
        { name: 'plain', value: 'v', path: '/' },
      ],
      savedAt: Date.now(),
    };

    const result = await applyProfile(PAGE, profile);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
    }

    const session = store.cookies.find((c) => c.name === 'session');
    expect(session?.value).toBe('new-session');
    expect(session?.domain).toBe('.example.com');
    expect(session?.httpOnly).toBe(true);
    expect(session?.session).toBe(false);

    // The old leftover cookie must be gone.
    expect(store.cookies.find((c) => c.name === 'leftover')).toBeUndefined();
    expect(store.cookies).toHaveLength(2);
  });

  it('skips cookies that expired after being saved', async () => {
    addCookie('a', '1');
    const profile: CookieProfile = {
      id: 'p2',
      origin: ORIGIN,
      remark: 'with-expired',
      cookies: [
        { name: 'fresh', value: 'v', path: '/' },
        { name: 'stale', value: 'v', path: '/', expirationDate: Math.floor(Date.now() / 1000) - 10 },
      ],
      savedAt: Date.now(),
    };
    const result = await applyProfile(PAGE, profile);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempted).toBe(1);
    expect(store.cookies.map((c) => c.name)).toEqual(['fresh']);
  });

  it('counts restore failures without aborting the remaining cookies', async () => {
    const originalSet = chrome.cookies.set;
    (chrome.cookies as unknown as Record<string, unknown>).set = async (opts: { name: string }) => {
      if (opts.name === 'bad') throw new Error('set failed');
      return store.set(opts as Parameters<CookieStoreFake['set']>[0]);
    };
    try {
      const profile: CookieProfile = {
        id: 'p3',
        origin: ORIGIN,
        remark: 'partial',
        cookies: [
          { name: 'good', value: 'v', path: '/' },
          { name: 'bad', value: 'v', path: '/' },
        ],
        savedAt: Date.now(),
      };
      const result = await applyProfile(PAGE, profile);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.imported).toBe(1);
        expect(result.failed).toBe(1);
      }
    } finally {
      (chrome.cookies as unknown as Record<string, unknown>).set = originalSet;
    }
  });

  it('aborts when existing cookies cannot be cleared', async () => {
    resetChromeMock();
    store = installChromeMock(['remove']);
    addCookie('a', '1', { domain: '.example.com' });

    const profile: CookieProfile = {
      id: 'p4',
      origin: ORIGIN,
      remark: 'any',
      cookies: [{ name: 'x', value: 'y', path: '/' }],
      savedAt: Date.now(),
    };
    const result = await applyProfile(PAGE, profile);
    expect(result.ok).toBe(false);
  });
});
