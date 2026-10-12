// Listener klik icon extension
chrome.action.onClicked.addListener((tab) => {
  captureAndAnalyze(tab);
});

// Listener pesan dari content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CAPTURE_SCREEN") {
    captureAndAnalyze(sender.tab);
  }
});

// Listener shortcut keyboard (Ctrl+Shift+X) untuk toggle sembunyi/muncul
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-popup") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_POPUP" });
      }
    });
  }
});

async function captureAndAnalyze(tab) {
  if (!tab || !tab.id) return;

  // Beritahu content script bahwa proses scan dimulai
  chrome.tabs.sendMessage(tab.id, { action: "SHOW_LOADING" });

  // Tangkap screenshot halaman web aktif
  chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 }, async (dataUrl) => {
    if (chrome.runtime.lastError || !dataUrl) {
      chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: "Gagal mengambil gambar layar." });
      return;
    }

    // Ambil API Key dari storage
    chrome.storage.local.get(['geminiApiKey'], async (res) => {
      const apiKey = res.geminiApiKey;
      if (!apiKey) {
        chrome.tabs.sendMessage(tab.id, { 
          action: "SHOW_RESULT", 
          text: "API Key belum diisi! Klik kanan ikon extension > Options." 
        });
        return;
      }

      try {
        const base64Data = dataUrl.split(',')[1];
        
        // Request ke API Gemini 1.5 Flash (Ultra Fast Latency)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Lihat gambar soal quiz ini. Berikan HANYA format jawaban singkat tanpa penjelasan sama sekali! Format wajib: 'Jawaban : [Huruf Pilihan/Jawaban]'. Contoh: 'Jawaban : A. Benda mati' atau 'Jawaban : C. 25'."
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 50
            }
          })
        });

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Jawaban tidak ditemukan.";
        
        chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: text });

      } catch (err) {
        chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: "Error: " + err.message });
      }
    });
  });
}
