/**
 * A minimal fake of the `chrome` global used by the Cookie Quick extension.
 * The fake store keeps cookies keyed by (storeId, name, domain, path) so the
 * service can be tested against realistic domain/path/secure matching without
 * a real browser. chrome.storage.local is backed by a plain in-memory object.
 */

export interface FakeCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  session: boolean;
  storeId?: string;
  httpOnly?: boolean;
  expirationDate?: number;
}

/** Arguments captured from a chrome.browsingData.remove call. */
export interface RemovalCall {
  options: { origins: string[]; since: number };
  dataToRemove: Record<string, boolean>;
}

export class CookieStoreFake {
  cookies: FakeCookie[] = [];
  removalCalls: RemovalCall[] = [];
  reloadCalls: number[] = [];
  storageData: Record<string, unknown> = {};

  add(c: FakeCookie): void {
    this.cookies.push({ storeId: '0', ...c });
  }

  clear(): void {
    this.cookies = [];
  }

  /** chrome.cookies.getAll({ url }) with browser-style scope filtering. */
  getAll({ url }: { url: string }): Promise<FakeCookie[]> {
    const scoped = this.cookies.filter((c) => matchesUrl(c, url));
    return Promise.resolve(scoped.map((c) => ({ ...c })));
  }

  /** chrome.cookies.remove({ url, name }) */
  remove(opts: { url: string; name: string }): Promise<{ url: string; name: string } | undefined> {
    const idx = this.cookies.findIndex((c) => c.name === opts.name && matchesUrl(c, opts.url));
    if (idx === -1) return Promise.resolve(undefined);
    const removed = this.cookies.splice(idx, 1)[0];
    return Promise.resolve({ url: opts.url, name: removed.name });
  }

  /**
   * chrome.cookies.set with upsert semantics on (name, domain, path). The
   * domain defaults to the URL host (host-only cookie), mirroring the real API.
   */
  set(opts: {
    url: string;
    name: string;
    value: string;
    domain?: string | null;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    expirationDate?: number;
  }): Promise<FakeCookie | undefined> {
    const u = new URL(opts.url);
    const domain = opts.domain && opts.domain.length > 0 ? opts.domain : u.hostname;
    const path = opts.path && opts.path.length > 0 ? opts.path : '/';
    const cookie: FakeCookie = {
      name: opts.name,
      value: opts.value,
      domain,
      path,
      secure: Boolean(opts.secure),
      session: opts.expirationDate === undefined,
      storeId: '0',
      httpOnly: Boolean(opts.httpOnly),
      expirationDate: opts.expirationDate,
    };
    const idx = this.cookies.findIndex(
      (c) => c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path,
    );
    if (idx >= 0) this.cookies[idx] = cookie;
    else this.cookies.push(cookie);
    return Promise.resolve({ ...cookie });
  }

  /** chrome.storage.local backed by an in-memory record. */
  storageGet(keys: string | string[] | null): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    const wanted = keys === null ? Object.keys(this.storageData) : Array.isArray(keys) ? keys : [keys];
    for (const key of wanted) {
      if (key in this.storageData) out[key] = this.storageData[key];
    }
    return Promise.resolve(out);
  }

  storageSet(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.storageData, items);
    return Promise.resolve();
  }

  storageRemove(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      delete this.storageData[key];
    }
    return Promise.resolve();
  }
}

/** Rough host-based scope match for the test fake (not the real extension match). */
function matchesUrl(c: FakeCookie, url: string): boolean {
  const u = new URL(url);
  const host = u.hostname;
  const bare = c.domain.replace(/^\./, '');
  const domainOk = host === bare || host.endsWith('.' + bare);
  if (!domainOk) return false;
  const path = u.pathname;
  const cPath = c.path || '/';
  if (cPath === '/') return true;
  return path.startsWith(cPath);
}


/** Installs a fake `chrome` global, returns the store for manipulation. */
export function installChromeMock(rejects: string[] = []): CookieStoreFake {
  const store = new CookieStoreFake();

  const chromeMock = {
    cookies: {
      getAll: (opts: { url: string }) => {
        if (rejects.includes('getAll')) return Promise.reject(new Error('getAll failed'));
        return store.getAll(opts);
      },
      remove: (opts: { url: string; name: string }) => {
        if (rejects.includes('remove')) return Promise.reject(new Error('remove failed'));
        return store.remove(opts);
      },
      set: (opts: Parameters<CookieStoreFake['set']>[0]) => {
        if (rejects.includes('set')) return Promise.reject(new Error('set failed'));
        return store.set(opts);
      },
    },
    tabs: {
      query: (_opts: { active?: boolean; currentWindow?: boolean; lastFocusedWindow?: boolean }) => {
        if (rejects.includes('query')) return Promise.reject(new Error('query failed'));
        return Promise.resolve([
          { id: 1, url: currentTabUrl, active: true, currentWindow: true },
        ]);
      },
      reload: (tabId: number) => {
        store.reloadCalls.push(tabId);
        return Promise.resolve();
      },
    },
    browsingData: {
      remove: (options: { origins: string[]; since: number }, dataToRemove: Record<string, boolean>) => {
        if (rejects.includes('browsingData')) return Promise.reject(new Error('browsingData failed'));
        store.removalCalls.push({ options, dataToRemove });
        return Promise.resolve(undefined);
      },
    },
    storage: {
      local: {
        get: (keys: string | string[] | null) => {
          if (rejects.includes('storage.get')) return Promise.reject(new Error('storage.get failed'));
          return store.storageGet(keys);
        },
        set: (items: Record<string, unknown>) => {
          if (rejects.includes('storage.set')) return Promise.reject(new Error('storage.set failed'));
          return store.storageSet(items);
        },
        remove: (keys: string | string[]) => {
          if (rejects.includes('storage.remove')) return Promise.reject(new Error('storage.remove failed'));
          return store.storageRemove(keys);
        },
      },
    },
  };

  (globalThis as Record<string, unknown>).chrome = chromeMock;
  return store;
}

let currentTabUrl = 'https://www.example.com/test';
export function setCurrentTabUrl(url: string): void {
  currentTabUrl = url;
}

export function resetChromeMock(): void {
  currentTabUrl = 'https://www.example.com/test';
  delete (globalThis as Record<string, unknown>).chrome;
}
