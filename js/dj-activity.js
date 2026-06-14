const DjActivity = {
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

  async log(song, eventType, format = '') {
    if (!DjAuth.isAuthenticated() || !song) return;

    try {
      await DjAuth.authRequest('dj_log', {
        eventType,
        songId: song.id || '',
        songTitle: song.songTitle || '',
        artistName: song.artistName || '',
        musicStyle: song.musicStyle || '',
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

  async fetchDemoDashboard() {
    const scriptUrl = String(CONFIG.googleScriptUrl || '').trim();
    if (!scriptUrl.includes('script.google.com')) {
      throw new Error('Demo dashboard needs Apps Script setup.');
    }

    const url = `${scriptUrl.replace(/\/$/, '')}?action=demo_dashboard`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Demo dashboard unavailable');
    return data;
  },

  async updateProfile(fields) {
    const data = await DjAuth.authRequest('dj_profile_update', {
      firstName: String(fields.firstName || '').trim(),
      lastName: String(fields.lastName || '').trim(),
      programName: String(fields.programName || '').trim(),
      programFormat: String(fields.programFormat || '').trim(),
      stationCallLetters: String(fields.stationCallLetters || '').trim(),
      stationFrequency: String(fields.stationFrequency || '').trim(),
      state: String(fields.state || '').trim(),
      stationWebsite: String(fields.stationWebsite || '').trim(),
      programWebsite: String(fields.programWebsite || '').trim(),
      programStartTime: String(fields.programStartTime || '').trim(),
      programEndTime: String(fields.programEndTime || '').trim(),
      programTimezone: String(fields.programTimezone || '').trim(),
      programDays: String(fields.programDays || '').trim(),
      shareEmail: !!fields.shareEmail,
    });
    DjAuth.updateDjProfile(data.dj);
    return data.dj;
  },

  async updateShareEmail(shareEmail) {
    return this.updateProfile({ shareEmail: !!shareEmail });
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