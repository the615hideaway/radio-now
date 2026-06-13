const DjActivity = {
  eventLabels: {
    download_mp3: 'MP3 download',
    download_wav: 'WAV download',
    download_zip: 'ZIP download',
    download_onesheet: 'One-sheet PDF',
  },

  formatLabel(eventType, format) {
    if (this.eventLabels[eventType]) return this.eventLabels[eventType];
    if (format) return String(format).toUpperCase();
    return 'Download';
  },

  async log(song, eventType, format = '') {
    if (!DjAuth.isAuthenticated() || !song) return;

    try {
      await DjAuth.authRequest('dj_log', {
        eventType,
        songId: song.id || '',
        songTitle: song.songTitle || '',
        artistName: song.artistName || '',
        format,
      });
    } catch (err) {
      console.warn('Activity log failed:', err.message);
    }
  },

  async logMany(songs, eventType, format = '') {
    if (!Array.isArray(songs) || !songs.length) return;
    await Promise.all(songs.map((song) => this.log(song, eventType, format)));
  },

  async fetchDashboard() {
    return DjAuth.authRequest('dj_dashboard');
  },

  async updateShareEmail(shareEmail) {
    const data = await DjAuth.authRequest('dj_profile_update', { shareEmail: !!shareEmail });
    DjAuth.updateDjProfile(data.dj);
    return data.dj;
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