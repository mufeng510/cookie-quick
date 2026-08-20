import { canOperateOnUrl } from './url';

export interface ActiveTab {
  id?: number;
  url?: string;
}

/**
 * Resolves the currently active tab in the current window. Falls back to the
 * most-recently-focused tab (needed for Microsoft Edge when the classic
 * active/currentWindow query returns no tab).
 */
export async function getCurrentTab(): Promise<ActiveTab> {
  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) {
    // Edge fallback: some Edge builds require querying the last focused window.
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  }
  const tab = tabs && tabs[0];
  return tab ? { id: tab.id, url: tab.url } : {};
}

/**
 * Returns the tab URL when it is eligible for cookie operations, otherwise null.
 */
export async function getOperableUrl(tab: ActiveTab): Promise<string | null> {
  const url = tab?.url;
  if (!url) return null;
  return canOperateOnUrl(url) ? url : null;
}
