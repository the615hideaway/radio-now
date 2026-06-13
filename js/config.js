const CONFIG = {
  siteName: 'Radio Now — (615) Hideaway Entertainment',
  // Legacy shared-password key (no longer used for sign-in).
  authKey: 'radio_now_auth',
  djSessionKey: 'radio_now_dj_session',

  // Catalog loads from this JSON file (synced from Google Sheets).
  songsDataUrl: 'data/songs.json',

  // Required for ZIP downloads: deploy google-apps-script/Code.gs from your sheet
  // (Extensions → Apps Script → Deploy as Web app → Anyone). See AUDIO-FIX-STEPS.txt.
  googleScriptUrl: 'https://script.google.com/macros/s/AKfycbwAhbh2k467duQanEnn6s34kngP8grcrV095j4qJkEweCjrH_67H940Px8IiZDWxEnRvg/exec',

  // Optional fallback: Google Cloud API key with Drive API enabled (public files only).
  googleApiKey: '',

  // Used only by scripts/sync-sheet-to-json.ps1 (not loaded live by the site).
  googleSheetId: '1EXNdRluPjwyaY5ktt-qHI2bNF7IT5bD1udnCgkKNdkU',
  sheetName: 'Sheet1',

  queueKey: 'radio_now_queue',
  downloadQueueKey: 'radio_now_download_queue',
};