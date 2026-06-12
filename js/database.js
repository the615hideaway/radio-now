const RadioDB = {
  catalogMeta: null,

  isScriptConfigured() {
    return !!(CONFIG.googleScriptUrl && CONFIG.googleScriptUrl.includes('script.google.com'));
  },

  normalizeSong(raw, index) {
    const previewLink = String(raw.previewLink || raw['Preview Link'] || '').trim();

    return {
      id: raw.id || `song-${index + 1}`,
      artistName: raw.artistName || '',
      songTitle: raw.songTitle || '',
      year: String(raw.year || ''),
      mp3: raw.mp3 || Utils.toDriveDownload(raw.MP3 || raw.MP3s || ''),
      previewLink,
      previewStreamUrl: raw.previewStreamUrl || Utils.toPreviewStreamUrl(previewLink),
      previewDriveId: raw.previewDriveId || Utils.extractDriveId(previewLink) || '',
      wav: raw.wav || Utils.toDriveDownload(raw.WAV || ''),
      cover: raw.cover || raw.Cover || '',
      coverThumbnailUrl: raw.coverThumbnailUrl || Utils.resolveCoverUrl({ cover: raw.cover || raw.Cover }),
      songTime: raw.songTime || '',
      description: raw.description || Utils.stripHtml(raw.Description || ''),
      musicStyle: raw.musicStyle || '',
      bandMembers: raw.bandMembers || '',
      songwriter: raw.songwriter || '',
      featuredArtist: raw.featuredArtist || '',
      website: raw.website || '',
      recordLabel: raw.recordLabel || '',
      contactEmail: raw.contactEmail || '',
    };
  },

  async getCatalogMeta() {
    if (this.catalogMeta) return this.catalogMeta;
    const response = await fetch(CONFIG.songsDataUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Song catalog JSON not found');
    const data = await response.json();
    this.catalogMeta = {
      syncedAt: data.syncedAt || null,
      songCount: data.songCount || (data.songs || []).length,
      source: data.source || 'json',
    };
    return this.catalogMeta;
  },

  async getAllSongs() {
    const response = await fetch(CONFIG.songsDataUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load ${CONFIG.songsDataUrl}. Run scripts/sync-sheet-to-json.ps1 to generate it.`);
    }

    const data = await response.json();
    this.catalogMeta = {
      syncedAt: data.syncedAt || null,
      songCount: data.songCount || (data.songs || []).length,
      source: data.source || 'json',
    };

    const songs = (data.songs || [])
      .map((song, i) => this.normalizeSong(song, i))
      .filter((song) => song.artistName || song.songTitle);

    if (!songs.length) throw new Error('Catalog JSON contains no songs.');
    return songs;
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

      if (errors.length) console.warn('Some files were skipped from ZIP:', errors);
      return;
    }

    await this.downloadFilesIndividually(songs, format);
  },
};