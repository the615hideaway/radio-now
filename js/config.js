const CONFIG = {
  siteName: 'Radio Now — (615) Hideaway Entertainment',
  password: '615bluegrass',
  authKey: 'radio_now_auth',

  // Catalog loads from this JSON file (synced from Google Sheets).
  songsDataUrl: 'data/songs.json',

  // Optional: Apps Script URL for audio stream proxy and ZIP downloads.
  googleScriptUrl: '',

  // Used only by scripts/sync-sheet-to-json.ps1 (not loaded live by the site).
  googleSheetId: '10rum4RKKF5-CgLcoSwe55EcxzyEzBSDqfxVrnbAuikk',
  sheetName: 'Sheet1',

  queueKey: 'radio_now_queue',
  downloadQueueKey: 'radio_now_download_queue',
};