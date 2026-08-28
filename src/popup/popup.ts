/**
 * Cookie Quick popup controller.
 *
 * This file only:
 *   1. Resolves the active tab.
 *   2. Delegates Cookie work to Cookie Service.
 *   3. Renders the result in the UI.
 *
 * Cookie values never appear in the DOM, in logs, or in storage.
 */
import {
  getCurrentTab,
  getOperableUrl,
  getCurrentCookies,
  formatCookieHeader,
  clearSiteData,
  cookiesRemainForUrl,
} from '../services/cookie-service';
import { getDisplayHostname } from '../utils/url';

const siteEl = document.getElementById('site') as HTMLSpanElement;
const countEl = document.getElementById('count') as HTMLSpanElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;

let currentUrl: string | null = null;

/** Renders a status line with an optional CSS variant. */
function setStatus(message: string, variant: 'success' | 'error' | 'warn' | 'muted' = 'muted'): void {
  statusEl.textContent = message;
  statusEl.className = `status-text ${variant}`;
}

async function refreshCount(): Promise<void> {
  if (!currentUrl) {
    countEl.textContent = '—';
    return;
  }
  const cookies = await getCurrentCookies(currentUrl);
  countEl.textContent = `${cookies.length} 个`;
}

async function loadCurrentTab(): Promise<void> {
  copyBtn.disabled = true;
  deleteBtn.disabled = true;

  try {
    const tab = await getCurrentTab();
    const url = await getOperableUrl(tab);

    if (!url) {
      if (!tab?.url) {
        setStatus('无法获取当前页面地址。', 'error');
        currentUrl = null;
        siteEl.textContent = '—';
        countEl.textContent = '—';
      } else {
        currentUrl = null;
        siteEl.textContent = getDisplayHostname(tab.url) || tab.url;
        countEl.textContent = '—';
        setStatus('当前页面不支持 Cookie 操作。', 'warn');
      }
      return;
    }

    currentUrl = url;
    siteEl.textContent = getDisplayHostname(url);
    copyBtn.disabled = false;
    deleteBtn.disabled = false;
    await refreshCount();
    setStatus('就绪', 'muted');
  } catch {
    currentUrl = null;
    siteEl.textContent = '—';
    countEl.textContent = '—';
    setStatus('初始化失败，请重试。', 'error');
  }
}

async function handleCopy(): Promise<void> {
  if (!currentUrl) return;
  copyBtn.disabled = true;
  try {
    const cookies = await getCurrentCookies(currentUrl);
    if (cookies.length === 0) {
      setStatus('当前页面没有 Cookie', 'muted');
      await refreshCount();
      return;
    }
    const header = formatCookieHeader(cookies);
    await navigator.clipboard.writeText(header);
    setStatus(`✓ 已复制 ${cookies.length} 个 Cookie`, 'success');
  } catch {
    setStatus('复制失败，请检查剪贴板权限。', 'error');
  } finally {
    copyBtn.disabled = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!currentUrl) return;

  const cookies = await getCurrentCookies(currentUrl);
  if (cookies.length === 0) {
    setStatus('当前页面没有 Cookie', 'muted');
    await refreshCount();
    return;
  }

  const confirmed = window.confirm(
    `确定清除当前站点的全部数据？\n\n将清除：\n· Cookie × ${cookies.length}\n· 本地存储（Local/Session Storage）\n· IndexedDB\n· 缓存与 Service Worker`,
  );
  if (!confirmed) {
    setStatus('已取消清除', 'muted');
    return;
  }

  deleteBtn.disabled = true;
  copyBtn.disabled = true;
  try {
    const result = await clearSiteData(currentUrl);

    if (result.ok) {
      const remain = await cookiesRemainForUrl(currentUrl);
      setStatus(
        remain ? '⚠ 站点数据已清除，但仍有 Cookie 残留' : '✓ 已清除站点数据',
        remain ? 'warn' : 'success',
      );
    } else {
      setStatus(result.reason, 'error');
    }
  } catch {
    setStatus('清除过程中出错，请重试。', 'error');
  } finally {
    await refreshCount();
    copyBtn.disabled = false;
    deleteBtn.disabled = false;
  }
}

copyBtn.addEventListener('click', handleCopy);
deleteBtn.addEventListener('click', handleDelete);

void loadCurrentTab();
