let quizBox = document.getElementById('ai-quiz-helper-box');

if (!quizBox) {
  quizBox = document.createElement('div');
  quizBox.id = 'ai-quiz-helper-box';
  quizBox.innerHTML = `
    <div class="ai-box-header">
      <span id="ai-status-title">Quiz AI Helper</span>
      <div class="ai-box-controls">
        <button id="ai-btn-scan" title="Scan Layar Soal">🔍 Scan</button>
        <button id="ai-btn-hide" title="Sembunyikan Total (Ctrl+Shift+X)">✕</button>
      </div>
    </div>
    <div id="ai-box-body" class="ai-box-content">
      <div id="ai-response-text" class="ai-text-black">Siap menganalisis...</div>
    </div>
  `;
  document.body.appendChild(quizBox);

  // Tombol Scan Layar
  document.getElementById('ai-btn-scan').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "CAPTURE_SCREEN" });
  });

  // Tombol X Sembunyi Total
  document.getElementById('ai-btn-hide').addEventListener('click', toggleVisibility);
}

function toggleVisibility() {
  quizBox.classList.toggle('ai-hidden');
}

// Listener pesan dari background / shortcut
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const responseText = document.getElementById('ai-response-text');

  if (request.action === "TOGGLE_POPUP") {
    toggleVisibility();
  } else if (request.action === "SHOW_LOADING") {
    quizBox.classList.remove('ai-hidden'); // Otomatis muncul saat mulai scan
    responseText.textContent = "Menganalisis layar...";
    responseText.className = "ai-text-black ai-loading";
  } else if (request.action === "SHOW_RESULT") {
    quizBox.classList.remove('ai-hidden');
    responseText.textContent = request.text;
    responseText.className = "ai-text-black";
  }
});
