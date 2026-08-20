import { describe, it, expect } from 'vitest';
import {
  canOperateOnUrl,
  buildDeleteUrl,
  getDisplayHostname,
  stripLeadingDot,
} from '../src/utils/url';

describe('canOperateOnUrl', () => {
  it('accepts normal https pages', () => {
    expect(canOperateOnUrl('https://example.com/test')).toBe(true);
    expect(canOperateOnUrl('https://www.example.com:8443/user/123')).toBe(true);
  });

  it('accepts http pages', () => {
    expect(canOperateOnUrl('http://example.com/')).toBe(true);
  });

  it('rejects unsupported schemes', () => {
    expect(canOperateOnUrl('chrome://settings')).toBe(false);
    expect(canOperateOnUrl('edge://extensions')).toBe(false);
    expect(canOperateOnUrl('about:blank')).toBe(false);
    expect(canOperateOnUrl('file:///etc/passwd')).toBe(false);
    expect(canOperateOnUrl('chrome-extension://abc/index.html')).toBe(false);
    expect(canOperateOnUrl('edge-extension://abc/index.html')).toBe(false);
    expect(canOperateOnUrl('moz-extension://abc/index.html')).toBe(false);
  });

  it('rejects malformed urls', () => {
    expect(canOperateOnUrl('')).toBe(false);
    expect(canOperateOnUrl('not a url')).toBe(false);
  });
});

describe('getDisplayHostname', () => {
  it('returns just the host for display', () => {
    expect(getDisplayHostname('https://www.example.com/user/123')).toBe('www.example.com');
    expect(getDisplayHostname('http://example.com')).toBe('example.com');
  });
  it('returns empty for invalid urls', () => {
    expect(getDisplayHostname('not a url')).toBe('');
  });
});

describe('stripLeadingDot', () => {
  it('strips a single leading dot', () => {
    expect(stripLeadingDot('.example.com')).toBe('example.com');
    expect(stripLeadingDot('example.com')).toBe('example.com');
    expect(stripLeadingDot('..example.com')).toBe('.example.com');
    expect(stripLeadingDot('.')).toBe('');
  });
});

describe('buildDeleteUrl', () => {
  it('uses https for secure cookies and strips leading dot', () => {
    const url = buildDeleteUrl({ domain: '.example.com', path: '/', secure: true });
    expect(url).toBe('https://example.com/');
  });

  it('uses http for non-secure cookies', () => {
    const url = buildDeleteUrl({ domain: '.example.com', path: '/', secure: false });
    expect(url).toBe('http://example.com/');
  });

  it('keeps a bare (host-only) domain intact', () => {
    const url = buildDeleteUrl({ domain: 'www.example.com', path: '/', secure: true });
    expect(url).toBe('https://www.example.com/');
  });

  it('preserves the cookie path', () => {
    const url = buildDeleteUrl({ domain: '.example.com', path: '/user/123', secure: true });
    expect(url).toBe('https://example.com/user/123');
  });

  it('defaults path to / when empty', () => {
    const url = buildDeleteUrl({ domain: '.example.com', path: '', secure: false });
    expect(url).toBe('http://example.com/');
  });

  it('never produces a URL containing a leading dot in the host', () => {
    const url = buildDeleteUrl({ domain: '.example.com', path: '/x', secure: true });
    expect(url).not.toContain('/.example.com');
    expect(url).not.toContain('https://.example.com');
  });
});
