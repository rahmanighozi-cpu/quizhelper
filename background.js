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

// Listener shortcut keyboard (Ctrl+Shift+X)
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-popup") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && tabs[0].url && !tabs[0].url.startsWith("chrome://")) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_POPUP" }).catch(() => {});
      }
    });
  }
});

async function captureAndAnalyze(tab) {
  if (!tab || !tab.id || !tab.url || tab.url.startsWith("chrome://")) return;

  // Kirim status loading
  chrome.tabs.sendMessage(tab.id, { action: "SHOW_LOADING" }).catch(() => {});

  // Ambil screenshot layar
  chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 80 }, async (dataUrl) => {
    if (chrome.runtime.lastError || !dataUrl) {
      chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: "Gagal mengambil gambar layar." }).catch(() => {});
      return;
    }

    chrome.storage.local.get(['geminiApiKey'], async (res) => {
      const apiKey = res.geminiApiKey;
      if (!apiKey) {
        chrome.tabs.sendMessage(tab.id, { 
          action: "SHOW_RESULT", 
          text: "API Key belum diisi! Klik kanan ikon extension > Options." 
        }).catch(() => {});
        return;
      }

      try {
        const base64Data = dataUrl.split(',')[1];
        
        // MENGGUNAKAN MODEL GEMINI 3.8 FLASH
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Selesaikan soal quiz di gambar ini. BERIKAN HANYA FORMAT JAWABAN PERSIS SEPERTI INI: 'Jawaban : [Huruf Pilihan]. [Nilai/Teks Jawaban]'. Tanpa penjelasan atau kata-kata tambahan."
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
              maxOutputTokens: 60
            }
          })
        });

        const result = await response.json();
        
        // Jika model gemini-3.8-flash belum aktif di akun tertentu, fallback otomatis panggil model flash dasar
        if (result.error) {
          const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Selesaikan soal quiz di gambar ini. BERIKAN HANYA FORMAT JAWABAN PERSIS SEPERTI INI: 'Jawaban : [Huruf Pilihan]. [Nilai/Teks Jawaban]'. Tanpa penjelasan." },
                  { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                ]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 60 }
            })
          });
          
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.error) {
            chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: "API Error: " + fallbackResult.error.message }).catch(() => {});
            return;
          }
          
          const fallbackText = fallbackResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Jawaban tidak ditemukan.";
          chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: fallbackText }).catch(() => {});
          return;
        }

        const candidate = result.candidates?.[0];
        let text = candidate?.content?.parts?.[0]?.text?.trim();

        if (!text) {
          text = "Jawaban tidak ditemukan.";
        }

        chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: text }).catch(() => {});

      } catch (err) {
        chrome.tabs.sendMessage(tab.id, { action: "SHOW_RESULT", text: "Error: " + err.message }).catch(() => {});
      }
    });
  });
}
