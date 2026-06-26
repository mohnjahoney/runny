import { sameProjectTarget } from "./url-matching.js";

async function storedProjectTabs() {
  const result = await chrome.storage.local.get("projectTabs");
  return result.projectTabs || {};
}

async function rememberProjectTab(projectId, tabId) {
  const projectTabs = await storedProjectTabs();
  projectTabs[projectId] = tabId;
  await chrome.storage.local.set({ projectTabs });
}

async function findProjectTab(projectId, url) {
  const projectTabs = await storedProjectTabs();
  const rememberedId = projectTabs[projectId];
  if (rememberedId !== undefined) {
    try {
      const remembered = await chrome.tabs.get(rememberedId);
      if (sameProjectTarget(remembered.url, url)) return remembered;
    } catch {
      // The remembered tab was closed.
    }
  }

  const tabs = await chrome.tabs.query({});
  const matching = tabs
    .filter((tab) => sameProjectTarget(tab.url, url))
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0),
    )[0];
  if (matching?.id !== undefined) {
    await rememberProjectTab(projectId, matching.id);
    return matching;
  }
  return null;
}

async function focusProjectTab(projectId, url) {
  let tab = await findProjectTab(projectId, url);
  if (tab?.id === undefined) {
    tab = await chrome.tabs.create({ url, active: true });
  } else {
    tab = await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId !== undefined) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  }
  if (tab.id !== undefined) await rememberProjectTab(projectId, tab.id);
  return tab;
}

async function projectTabStatus(projectId, url) {
  const tab = await findProjectTab(projectId, url);
  return { hasTab: tab?.id !== undefined };
}

function waitForNavigation(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Refresh was sent, but the page did not finish loading"));
    }, 20_000);

    const completed = (details) => {
      if (details.tabId === tabId && details.frameId === 0) {
        cleanup();
        resolve();
      }
    };

    const failed = (details) => {
      if (details.tabId === tabId && details.frameId === 0) {
        cleanup();
        reject(new Error(`Refresh failed: ${details.error}`));
      }
    };

    function cleanup() {
      clearTimeout(timeout);
      chrome.webNavigation.onCompleted.removeListener(completed);
      chrome.webNavigation.onErrorOccurred.removeListener(failed);
    }

    chrome.webNavigation.onCompleted.addListener(completed);
    chrome.webNavigation.onErrorOccurred.addListener(failed);
  });
}

async function refreshProjectTab(projectId, url, bypassCache) {
  const tab = await findProjectTab(projectId, url);
  if (tab?.id === undefined) {
    throw new Error(`No tab matches ${url}. Open it once to create one.`);
  }

  const completion = waitForNavigation(tab.id);
  await chrome.tabs.reload(tab.id, { bypassCache });
  await completion;
  return bypassCache ? "Hard refreshed ✓" : "Refreshed ✓";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    if (!message?.projectId || !message?.url) {
      throw new Error("The project does not have a browser URL yet");
    }

    if (message.type === "tab-status") {
      return projectTabStatus(message.projectId, message.url);
    }
    if (message.type === "open" || message.type === "focus") {
      await focusProjectTab(message.projectId, message.url);
      return "Project tab ready";
    }
    if (message.type === "refresh") {
      return refreshProjectTab(message.projectId, message.url, false);
    }
    if (message.type === "hard-refresh") {
      return refreshProjectTab(message.projectId, message.url, true);
    }
    throw new Error("Unknown browser action");
  })()
    .then((result) => {
      if (typeof result === "object" && result !== null) {
        sendResponse({ ok: true, ...result });
        return;
      }
      sendResponse({ ok: true, message: result });
    })
    .catch((error) =>
      sendResponse({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      }),
    );

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const projectTabs = await storedProjectTabs();
    let changed = false;
    for (const [projectId, rememberedId] of Object.entries(projectTabs)) {
      if (rememberedId === tabId) {
        delete projectTabs[projectId];
        changed = true;
      }
    }
    if (changed) await chrome.storage.local.set({ projectTabs });
  })();
});
