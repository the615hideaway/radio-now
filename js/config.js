const CONFIG = {
  siteName: 'Radio Now — (615) Hideaway Entertainment',
  password: '615bluegrass',
  authKey: 'radio_now_auth',

  // Catalog loads from this JSON file (synced from Google Sheets).
  songsDataUrl: 'data/songs.json',

  // Required for ZIP downloads: deploy google-apps-script/Code.gs from your sheet
  // (Extensions → Apps Script → Deploy as Web app → Anyone). See AUDIO-FIX-STEPS.txt.
  googleScriptUrl: '',

  // Optional fallback: Google Cloud API key with Drive API enabled (public files only).
  googleApiKey: '',

  // Used only by scripts/sync-sheet-to-json.ps1 (not loaded live by the site).
  googleSheetId: '10rum4RKKF5-CgLcoSwe55EcxzyEzBSDqfxVrnbAuikk',
  sheetName: 'Sheet1',

  queueKey: 'radio_now_queue',
  downloadQueueKey: 'radio_now_download_queue',
};