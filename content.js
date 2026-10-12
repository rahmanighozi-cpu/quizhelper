// Buat element widget mengambang di kanan bawah
let quizBox = document.getElementById('ai-quiz-helper-box');

if (!quizBox) {
  quizBox = document.createElement('div');
  quizBox.id = 'ai-quiz-helper-box';
  quizBox.innerHTML = `
    <div class="ai-box-header">
      <span id="ai-status-title">Quiz AI Helper</span>
      <div class="ai-box-controls">
        <button id="ai-btn-scan" title="Lanjut Soal / Scan Layar">🔍 Scan</button>
        <button id="ai-btn-toggle" title="Sembunyikan/Tampilkan">—</button>
      </div>
    </div>
    <div id="ai-box-body" class="ai-box-content">
      <div id="ai-response-text" class="ai-abstract-blue">Siap menganalisis...</div>
    </div>
  `;
  document.body.appendChild(quizBox);

  // Event handler tombol
  document.getElementById('ai-btn-scan').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "CAPTURE_SCREEN" });
  });

  document.getElementById('ai-btn-toggle').addEventListener('click', () => {
    const body = document.getElementById('ai-box-body');
    const btn = document.getElementById('ai-btn-toggle');
    if (body.style.display === 'none') {
      body.style.display = 'block';
      btn.innerText = '—';
    } else {
      body.style.display = 'none';
      btn.innerText = '▢';
    }
  });
}

// Menerima balasan dari Background Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const responseText = document.getElementById('ai-response-text');
  const body = document.getElementById('ai-box-body');

  // Pastikan popup terbuka saat ada aksi
  body.style.display = 'block';

  if (request.action === "SHOW_LOADING") {
    responseText.textContent = "Menganalisis layar...";
    responseText.className = "ai-abstract-blue ai-loading";
  } else if (request.action === "SHOW_RESULT") {
    responseText.textContent = request.text;
    responseText.className = "ai-abstract-blue";
  }
});
