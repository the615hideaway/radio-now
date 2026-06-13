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