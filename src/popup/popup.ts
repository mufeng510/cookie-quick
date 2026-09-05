/**
 * Cookie Quick popup controller.
 *
 * This file only:
 *   1. Resolves the active tab.
 *   2. Delegates Cookie work to Cookie Service / Profile Service.
 *   3. Renders the result in the UI.
 *
 * Cookie values never appear in the DOM or in logs. The only place cookies
 * are persisted is chrome.storage.local, and only when the user explicitly
 * saves a profile, on their own device.
 */
import {
  getCurrentTab,
  getOperableUrl,
  getCurrentCookies,
  formatCookieHeader,
  clearSiteData,
  cookiesRemainForUrl,
  importCookiesForUrl,
} from '../services/cookie-service';
import {
  listProfiles,
  saveCurrentProfile,
  deleteProfile,
  applyProfile,
} from '../services/profile-service';
import type { CookieProfile } from '../types/cookie';
import { getDisplayHostname } from '../utils/url';

const siteEl = document.getElementById('site') as HTMLSpanElement;
const countEl = document.getElementById('count') as HTMLSpanElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;

const importToggleBtn = document.getElementById('import-toggle') as HTMLButtonElement;
const importPanel = document.getElementById('import-panel') as HTMLDivElement;
const importInput = document.getElementById('import-input') as HTMLTextAreaElement;
const importBtn = document.getElementById('import-btn') as HTMLButtonElement;

const profilesToggleBtn = document.getElementById('profiles-toggle') as HTMLButtonElement;
const profilesPanel = document.getElementById('profiles-panel') as HTMLDivElement;
const remarkInput = document.getElementById('profile-remark') as HTMLInputElement;
const saveProfileBtn = document.getElementById('save-profile-btn') as HTMLButtonElement;
const profileListEl = document.getElementById('profile-list') as HTMLUListElement;

let currentUrl: string | null = null;
let currentTabId: number | undefined = undefined;

/** Renders a status line with an optional CSS variant. */
function setStatus(message: string, variant: 'success' | 'error' | 'warn' | 'muted' = 'muted'): void {
  statusEl.textContent = message;
  statusEl.className = `status-text ${variant}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function togglePanel(toggleBtn: HTMLButtonElement, panel: HTMLElement): void {
  const hidden = panel.classList.toggle('hidden');
  toggleBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
}

async function refreshCount(): Promise<void> {
  if (!currentUrl) {
    countEl.textContent = '—';
    return;
  }
  const cookies = await getCurrentCookies(currentUrl);
  countEl.textContent = `${cookies.length} 个`;
}

async function renderProfiles(): Promise<void> {
  profileListEl.textContent = '';
  if (!currentUrl) return;

  const origin = new URL(currentUrl).origin;
  const profiles = await listProfiles(origin);

  if (profiles.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'profile-empty';
    empty.textContent = '暂无保存的账号';
    profileListEl.appendChild(empty);
    return;
  }

  for (const profile of profiles) {
    profileListEl.appendChild(buildProfileRow(profile));
  }
}

function buildProfileRow(profile: CookieProfile): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'profile-item';

  const info = document.createElement('div');
  info.className = 'profile-info';
  const remark = document.createElement('span');
  remark.className = 'profile-remark';
  remark.textContent = profile.remark; // user input: textContent only, never innerHTML
  const meta = document.createElement('span');
  meta.className = 'profile-meta';
  meta.textContent = `${profile.cookies.length} 个 Cookie · ${formatTime(profile.savedAt)}`;
  info.append(remark, meta);

  const actions = document.createElement('div');
  actions.className = 'profile-actions';

  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'btn-mini btn-apply';
  applyBtn.textContent = '切换';
  applyBtn.addEventListener('click', () => void handleApplyProfile(profile));

  const deleteBtnMini = document.createElement('button');
  deleteBtnMini.type = 'button';
  deleteBtnMini.className = 'btn-mini btn-remove';
  deleteBtnMini.textContent = '✕';
  deleteBtnMini.addEventListener('click', () => void handleDeleteProfile(profile));

  actions.append(applyBtn, deleteBtnMini);
  li.append(info, actions);
  return li;
}

async function loadCurrentTab(): Promise<void> {
  copyBtn.disabled = true;
  deleteBtn.disabled = true;
  importBtn.disabled = true;
  saveProfileBtn.disabled = true;

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
      await renderProfiles();
      return;
    }

    currentUrl = url;
    currentTabId = tab.id;
    siteEl.textContent = getDisplayHostname(url);
    copyBtn.disabled = false;
    deleteBtn.disabled = false;
    importBtn.disabled = false;
    saveProfileBtn.disabled = false;
    await refreshCount();
    await renderProfiles();
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

async function handleImport(): Promise<void> {
  if (!currentUrl) return;
  const header = importInput.value;
  importBtn.disabled = true;
  try {
    const result = await importCookiesForUrl(currentUrl, header);
    if (!result.ok) {
      setStatus(result.reason, 'warn');
      return;
    }
    if (result.failed > 0) {
      setStatus(`⚠ 已导入 ${result.imported} 个，${result.failed} 个失败`, 'warn');
    } else {
      setStatus(`✓ 已导入 ${result.imported} 个 Cookie`, 'success');
    }
    importInput.value = '';
  } catch {
    setStatus('导入过程中出错，请重试。', 'error');
  } finally {
    importBtn.disabled = false;
    await refreshCount();
  }
}

async function handleSaveProfile(): Promise<void> {
  if (!currentUrl) return;
  saveProfileBtn.disabled = true;
  try {
    const result = await saveCurrentProfile(currentUrl, remarkInput.value);
    if (!result.ok) {
      setStatus(result.reason, 'warn');
      return;
    }
    remarkInput.value = '';
    setStatus(`✓ 已保存账号「${result.profile.remark}」`, 'success');
    await renderProfiles();
  } catch {
    setStatus('保存过程中出错，请重试。', 'error');
  } finally {
    saveProfileBtn.disabled = false;
  }
}

async function handleApplyProfile(profile: CookieProfile): Promise<void> {
  if (!currentUrl) return;

  const confirmed = window.confirm(
    `切换到「${profile.remark}」？\n\n将覆盖当前站点的全部 Cookie（${profile.cookies.length} 个），并刷新页面。`,
  );
  if (!confirmed) {
    setStatus('已取消切换', 'muted');
    return;
  }

  copyBtn.disabled = true;
  deleteBtn.disabled = true;
  saveProfileBtn.disabled = true;
  try {
    const result = await applyProfile(currentUrl, profile);
    if (!result.ok) {
      setStatus(result.reason, 'error');
      return;
    }
    if (result.failed > 0) {
      setStatus(`⚠ 已写入 ${result.imported} 个，${result.failed} 个失败`, 'warn');
    } else {
      setStatus(`✓ 已切换到「${profile.remark}」，正在刷新页面…`, 'success');
    }
    if (typeof currentTabId === 'number') {
      await chrome.tabs.reload(currentTabId);
    }
  } catch {
    setStatus('切换过程中出错，请重试。', 'error');
  } finally {
    await refreshCount();
    await renderProfiles();
    copyBtn.disabled = false;
    deleteBtn.disabled = false;
    saveProfileBtn.disabled = false;
  }
}

async function handleDeleteProfile(profile: CookieProfile): Promise<void> {
  const confirmed = window.confirm(`删除账号「${profile.remark}」？`);
  if (!confirmed) {
    setStatus('已取消删除', 'muted');
    return;
  }
  try {
    await deleteProfile(profile.id);
    setStatus(`已删除「${profile.remark}」`, 'muted');
  } catch {
    setStatus('删除过程中出错，请重试。', 'error');
  } finally {
    await renderProfiles();
  }
}

copyBtn.addEventListener('click', handleCopy);
deleteBtn.addEventListener('click', handleDelete);
importBtn.addEventListener('click', handleImport);
saveProfileBtn.addEventListener('click', handleSaveProfile);
importToggleBtn.addEventListener('click', () => togglePanel(importToggleBtn, importPanel));
profilesToggleBtn.addEventListener('click', () => togglePanel(profilesToggleBtn, profilesPanel));

void loadCurrentTab();
