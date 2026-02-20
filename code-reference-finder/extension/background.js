// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Create context menu for selected code
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'find-references',
    title: 'Find References for Selected Code',
    contexts: ['selection'],
  });
});

// Handle context menu clicks — this IS a valid user gesture, so sidePanel.open works
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'find-references' && info.selectionText && tab?.id) {
    // Store code first
    chrome.storage.local.set({
      pendingCode: info.selectionText,
      pendingTimestamp: Date.now(),
    });

    // Open side panel (allowed from context menu handler)
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
