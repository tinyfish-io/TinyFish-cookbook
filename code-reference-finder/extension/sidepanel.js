const appFrame = document.getElementById('app-frame');
let lastTimestamp = 0;

function injectCode(code) {
  appFrame.contentWindow.postMessage(
    { type: 'INJECT_CODE', code: code },
    '*'
  );
}

// Check for pending code on load (side panel just opened)
appFrame.addEventListener('load', () => {
  chrome.storage.local.get(['pendingCode', 'pendingTimestamp'], (data) => {
    if (data.pendingCode && data.pendingTimestamp > lastTimestamp) {
      lastTimestamp = data.pendingTimestamp;
      // Small delay to ensure the Next.js app is ready
      setTimeout(() => injectCode(data.pendingCode), 500);
    }
  });
});

// Watch for new code stored by content script or background
chrome.storage.onChanged.addListener((changes) => {
  if (changes.pendingCode && changes.pendingTimestamp) {
    const newTimestamp = changes.pendingTimestamp.newValue;
    if (newTimestamp > lastTimestamp) {
      lastTimestamp = newTimestamp;
      injectCode(changes.pendingCode.newValue);
    }
  }
});
