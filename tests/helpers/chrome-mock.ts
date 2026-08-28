/**
 * A minimal fake of the `chrome` global used by the Cookie Quick extension.
 * The fake store keeps cookies keyed by (storeId, name, domain, path) so the
 * service can be tested against realistic domain/path/secure matching without
 * a real browser.
 */

export interface FakeCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  session: boolean;
  storeId?: string;
}

/** Arguments captured from a chrome.browsingData.remove call. */
export interface RemovalCall {
  options: { origins: string[]; since: number };
  dataToRemove: Record<string, boolean>;
}

export class CookieStoreFake {
  cookies: FakeCookie[] = [];
  removalCalls: RemovalCall[] = [];

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
    },
    tabs: {
      query: (_opts: { active?: boolean; currentWindow?: boolean; lastFocusedWindow?: boolean }) => {
        if (rejects.includes('query')) return Promise.reject(new Error('query failed'));
        return Promise.resolve([
          { id: 1, url: currentTabUrl, active: true, currentWindow: true },
        ]);
      },
    },
    browsingData: {
      remove: (options: { origins: string[]; since: number }, dataToRemove: Record<string, boolean>) => {
        if (rejects.includes('browsingData')) return Promise.reject(new Error('browsingData failed'));
        store.removalCalls.push({ options, dataToRemove });
        return Promise.resolve(undefined);
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
