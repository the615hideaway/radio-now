const RadioDB = {
  isScriptConfigured() {
    return !!(CONFIG.googleScriptUrl && CONFIG.googleScriptUrl.includes('script.google.com'));
  },

  isGvizConfigured() {
    return !!(CONFIG.googleSheetId && CONFIG.googleSheetId.length > 10);
  },

  isConfigured() {
    return this.isScriptConfigured() || this.isGvizConfigured();
  },

  normalizeSong(raw, index) {
    const get = (...keys) => {
      for (const key of keys) {
        if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
          return String(raw[key]).trim();
        }
      }
      return '';
    };

    const artistName = get('artistName', 'Artist Name');
    const songTitle = get('songTitle', 'Song Title');

    return {
      id: get('id', 'ID') || `song-${index + 1}`,
      artistName,
      songTitle,
      year: get('year', 'Year'),
      mp3: Utils.toDriveDownload(get('mp3', 'MP3', 'MP3s')),
      previewLink: get('previewLink', 'Preview Link', 'Audio'),
      wav: Utils.toDriveDownload(get('wav', 'WAV')),
      cover: get('cover', 'Cover'),
      songTime: get('songTime', 'Song Time'),
      description: Utils.stripHtml(get('description', 'Description')),
      musicStyle: get('musicStyle', 'Music Style'),
      bandMembers: get('bandMembers', 'Band Members'),
      songwriter: get('songwriter', 'Songwriter'),
      featuredArtist: get('featuredArtist', 'Featured Artist'),
      website: get('website', 'Website'),
      recordLabel: get('recordLabel', 'Record Label'),
      contactEmail: get('contactEmail', 'Contact E-Mail', 'Contact Email'),
    };
  },

  async testConnection() {
    const result = await this.getAllSongs();
    if (!result.length) throw new Error('Connected but no songs were returned.');
    return true;
  },

  async getAllSongs() {
    if (this.isScriptConfigured()) {
      return this.fetchFromScript();
    }
    if (this.isGvizConfigured()) {
      return this.fetchFromGviz();
    }
    return this.fetchLocal();
  },

  async fetchFromScript() {
    const url = `${CONFIG.googleScriptUrl}?action=list`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to load songs');
    return (data.songs || []).map((song, i) => this.normalizeSong(song, i));
  },

  cellValue(cell) {
    if (!cell) return '';
    if (cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== '') {
      return String(cell.f).trim();
    }
    if (cell.v !== undefined && cell.v !== null) {
      const value = cell.v;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(Math.round(value));
      }
      return String(value).trim();
    }
    return '';
  },

  async fetchFromGviz() {
    const sheet = encodeURIComponent(CONFIG.sheetName || 'Sheet1');
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.googleSheetId}/gviz/tq?tqx=out:json&sheet=${sheet}`;
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
    if (!match) throw new Error('Could not parse Google Sheet response');
    const json = JSON.parse(match[1]);
    const cols = json.table.cols.map((c) => c.label);
    const rows = json.table.rows || [];

    const songs = rows.map((row, index) => {
      const record = {};
      (row.c || []).forEach((cell, i) => {
        if (cols[i]) record[cols[i]] = this.cellValue(cell);
      });
      return this.normalizeSong(record, index);
    });

    return songs.filter((s) => s.artistName || s.songTitle);
  },

  async fetchLocal() {
    const response = await fetch(CONFIG.localDataUrl);
    if (!response.ok) throw new Error('Local song data not found');
    const data = await response.json();
    return (data.songs || []).map((song, i) => this.normalizeSong(song, i));
  },

  async downloadZip(songs, format = 'mp3') {
    if (this.isScriptConfigured()) {
      return this.downloadZipViaScript(songs, format);
    }
    return this.downloadZipClient(songs, format);
  },

  async downloadZipViaScript(songs, format) {
    const response = await fetch(CONFIG.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'zip',
        format,
        songs: songs.map((s) => ({
          id: s.id,
          artistName: s.artistName,
          songTitle: s.songTitle,
          mp3: s.mp3,
          wav: s.wav,
        })),
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Zip creation failed');

    const bytes = atob(data.zipBase64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);

    const blob = new Blob([buffer], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = data.filename || 'radio-now-selection.zip';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  async fetchAudioBlob(url) {
    const response = await fetch(url, { mode: 'cors', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.size) throw new Error('Empty file');
    return blob;
  },

  triggerFileDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async downloadFilesIndividually(songs, format) {
    const ext = format === 'wav' ? 'wav' : 'mp3';
    let started = 0;

    for (const song of songs) {
      const url = format === 'wav' && song.wav ? song.wav : song.mp3;
      if (!url) continue;
      const filename = Utils.safeFilename(song.artistName, song.songTitle, ext);
      this.triggerFileDownload(url, filename);
      started++;
      await new Promise((resolve) => setTimeout(resolve, 450));
    }

    if (!started) {
      throw new Error(`No ${format.toUpperCase()} download links found for selected songs.`);
    }
  },

  async downloadZipClient(songs, format) {
    if (!window.JSZip) throw new Error('JSZip is not loaded');

    const zip = new JSZip();
    let added = 0;
    const errors = [];
    const ext = format === 'wav' ? 'wav' : 'mp3';

    for (const song of songs) {
      const url = format === 'wav' && song.wav ? song.wav : song.mp3;
      if (!url) {
        errors.push(`${song.songTitle}: no ${format.toUpperCase()} link`);
        continue;
      }

      try {
        const blob = await this.fetchAudioBlob(url);
        zip.file(Utils.safeFilename(song.artistName, song.songTitle, ext), blob);
        added++;
      } catch (err) {
        errors.push(`${song.songTitle}: ${err.message}`);
      }
    }

    if (added) {
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `radio-now-${format}-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      if (errors.length) {
        console.warn('Some files were skipped from ZIP:', errors);
      }
      return;
    }

    await this.downloadFilesIndividually(songs, format);
  },
};