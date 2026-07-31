chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") return;

  chrome.storage.sync.set({
    turnOffSubtitlesOnNavigation: true
  });
});
