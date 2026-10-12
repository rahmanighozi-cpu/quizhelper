document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      document.getElementById('apiKey').value = result.geminiApiKey;
    }
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
    const status = document.getElementById('status');
    status.textContent = 'API Key berhasil disimpan!';
    setTimeout(() => status.textContent = '', 2000);
  });
});
