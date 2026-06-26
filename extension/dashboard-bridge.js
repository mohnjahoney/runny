if (window.location.hostname === "127.0.0.1" && window.location.port === "4789") {
  function markReady() {
    if (document.documentElement) {
      document.documentElement.dataset.runnyExtension = "ready";
    }
  }

  markReady();
  document.addEventListener("DOMContentLoaded", markReady, { once: true });

  function announceReady() {
    markReady();
    window.postMessage(
      { source: "runny-extension", type: "ready" },
      window.location.origin,
    );
  }

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      event.data?.source !== "runny-dashboard"
    ) {
      return;
    }

    if (event.data.type === "hello") {
      announceReady();
      return;
    }

    if (
      !["open", "focus", "refresh", "hard-refresh", "tab-status"].includes(
        event.data.type,
      )
    ) {
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: event.data.type,
        projectId: event.data.projectId,
        url: event.data.url,
      },
      (response) => {
        const error = chrome.runtime.lastError;
        window.postMessage(
          {
            source: "runny-extension",
            type: "result",
            requestType: event.data.type,
            projectId: event.data.projectId,
            ok: !error && response?.ok === true,
            message: error?.message || response?.message || "Browser action failed",
            hasTab: response?.hasTab === true,
          },
          window.location.origin,
        );
      },
    );
  });

  announceReady();
}
