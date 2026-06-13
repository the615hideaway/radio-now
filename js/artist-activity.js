const ArtistActivity = {
  eventLabels: {
    download_mp3: 'MP3 download',
    download_wav: 'WAV download',
    download_zip: 'Downloaded',
    downloaded: 'Downloaded',
    download_onesheet: 'One-sheet PDF',
  },

  formatLabel(eventType, format) {
    if (this.eventLabels[eventType]) return this.eventLabels[eventType];
    if (format) return String(format).toUpperCase();
    return 'Download';
  },

  formatDjLine(item) {
    const parts = [];
    if (item.djName) parts.push(item.djName);
    if (item.djStation) parts.push(item.djStation);
    if (item.djShowName) parts.push(item.djShowName);
    return parts.join(' · ');
  },

  async fetchDashboard() {
    return ArtistAuth.authRequest('artist_dashboard');
  },

  async fetchDemoDashboard() {
    const scriptUrl = String(CONFIG.googleScriptUrl || '').trim();
    if (!scriptUrl.includes('script.google.com')) {
      throw new Error('Demo dashboard needs Apps Script setup.');
    }

    const url = `${scriptUrl.replace(/\/$/, '')}?action=demo_artist_dashboard`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Demo artist dashboard unavailable');
    return data;
  },

  formatTimestamp(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  },
};