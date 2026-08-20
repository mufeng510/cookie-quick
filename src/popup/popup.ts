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
  deleteAllCurrentCookies,
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
    `确定删除当前页面的全部 Cookie？\n\n当前共有：\n${cookies.length} 个 Cookie`,
  );
  if (!confirmed) {
    setStatus('已取消删除', 'muted');
    return;
  }

  deleteBtn.disabled = true;
  copyBtn.disabled = true;
  try {
    const result = await deleteAllCurrentCookies(currentUrl);
    const remain = await cookiesRemainForUrl(currentUrl);

    if (result.ok && result.removed > 0 && result.failed === 0 && !remain) {
      setStatus(`✓ 已删除 ${result.removed} 个 Cookie`, 'success');
    } else if (result.ok && remain) {
      setStatus('⚠ 部分删除失败，仍有 Cookie 残留', 'warn');
    } else if (result.ok && result.failed > 0) {
      setStatus(`⚠ 已删除 ${result.removed} 个 Cookie，${result.failed} 个删除失败`, 'warn');
    } else if (result.ok && result.removed === 0 && result.failed === 0) {
      setStatus('当前页面没有 Cookie', 'muted');
    } else if (result.ok) {
      setStatus(`✓ 已删除 ${result.removed} 个 Cookie`, 'success');
    } else {
      setStatus('删除过程中出错，请重试。', 'error');
    }
  } catch {
    setStatus('删除过程中出错，请重试。', 'error');
  } finally {
    await refreshCount();
    copyBtn.disabled = false;
    deleteBtn.disabled = false;
  }
}

copyBtn.addEventListener('click', handleCopy);
deleteBtn.addEventListener('click', handleDelete);

void loadCurrentTab();
