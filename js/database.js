const RadioDB = {
  catalogMeta: null,

  isScriptConfigured() {
    return !!(CONFIG.googleScriptUrl && CONFIG.googleScriptUrl.includes('script.google.com'));
  },

  zipSetupHint() {
    if (this.isScriptConfigured()) return '';
    return ' ZIP downloads need a one-time Apps Script setup: open your Radio Now Google Sheet → Extensions → Apps Script → paste google-apps-script/Code.gs → Deploy as Web app (Anyone) → paste the /exec URL into js/config.js as googleScriptUrl. See AUDIO-FIX-STEPS.txt in the repo.';
  },

  normalizeSong(raw, index) {
    const mp3Source = String(raw.mp3 || raw.MP3 || raw.MP3s || '').trim();
    const mp3 = mp3Source
      ? (String(raw.mp3 || '').includes('uc?export=download') ? raw.mp3 : Utils.toDriveDownload(mp3Source))
      : '';

    return {
      id: raw.id || `song-${index + 1}`,
      artistName: raw.artistName || '',
      songTitle: raw.songTitle || '',
      year: String(raw.year || '').replace(/\.0$/, ''),
      mp3,
      previewLink: mp3Source,
      previewStreamUrl: raw.previewStreamUrl || Utils.toPreviewStreamUrl(mp3Source),
      previewDriveId: raw.previewDriveId || Utils.extractDriveId(mp3Source) || '',
      wav: raw.wav || Utils.toDriveDownload(raw.WAV || ''),
      cover: raw.cover || raw.Cover || raw['Cover Art'] || '',
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

  async downloadZip(songs, format = 'mp3', onProgress) {
    if (!songs.length) throw new Error('Download queue is empty.');

    if (this.isScriptConfigured()) {
      try {
        return await this.downloadZipViaScript(songs, format, onProgress);
      } catch (err) {
        console.warn('Server ZIP failed, retrying in browser via Apps Script stream:', err.message);
      }
    }

    return this.downloadZipClient(songs, format, onProgress);
  },

  songPayloadForZip(song, format) {
    return {
      id: song.id,
      artistName: song.artistName,
      songTitle: song.songTitle,
      year: song.year,
      songTime: song.songTime,
      musicStyle: song.musicStyle,
      description: song.description,
      bandMembers: song.bandMembers,
      songwriter: song.songwriter,
      featuredArtist: song.featuredArtist,
      website: song.website,
      recordLabel: song.recordLabel,
      contactEmail: song.contactEmail,
      cover: song.cover,
      mp3: song.mp3,
      wav: song.wav,
      previewDriveId: song.previewDriveId || Utils.extractDriveId(song.previewLink) || '',
      mp3DriveId: Utils.extractDriveId(song.mp3) || '',
      wavDriveId: Utils.extractDriveId(song.wav) || '',
      coverDriveId: Utils.extractDriveId(song.cover) || '',
      formatDriveId: Utils.getSongDriveId(song, format),
    };
  },

  async fetchCoverBlob(song) {
    const candidates = Utils.getCoverDownloadCandidates(song);
    if (!candidates.length) return null;

    const errors = [];
    for (const url of candidates) {
      try {
        const response = await fetch(url, { mode: 'cors', redirect: 'follow', credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.size || blob.type === 'text/html') throw new Error('not an image');
        return blob;
      } catch (err) {
        errors.push(err.message);
      }
    }

    console.warn('Cover fetch failed:', song.songTitle, errors[errors.length - 1]);
    return null;
  },

  coverExtension(blob) {
    const type = blob?.type || '';
    if (type.includes('png')) return 'png';
    if (type.includes('webp')) return 'webp';
    return 'jpg';
  },

  async addSongPackageToZip(folder, song, format, audioBlob) {
    const ext = format === 'wav' ? 'wav' : 'mp3';
    const baseName = Utils.zipFolderName(song.artistName, song.songTitle);

    folder.file(`${baseName}.${ext}`, audioBlob);

    const coverBlob = await this.fetchCoverBlob(song);
    if (coverBlob) {
      const coverName = `cover.${this.coverExtension(coverBlob)}`;
      folder.file(coverName, coverBlob);
      folder.file('one-sheet.html', OneSheet.generateHtml(song, { hasCover: true, coverFile: coverName }));
      return;
    }

    folder.file('one-sheet.html', OneSheet.generateHtml(song, { hasCover: false }));
  },

  async downloadZipViaScript(songs, format, onProgress) {
    onProgress?.({ current: 0, total: songs.length, added: 0, status: 'requesting' });

    const response = await fetch(CONFIG.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'zip',
        format,
        songs: songs.map((s) => this.songPayloadForZip(s, format)),
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Zip creation failed');

    const bytes = atob(data.zipBase64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);

    const blob = new Blob([buffer], { type: 'application/zip' });
    this.triggerBlobDownload(blob, data.filename || 'radio-now-selection.zip');

    onProgress?.({ current: songs.length, total: songs.length, added: data.added || songs.length, status: 'done' });

    if (data.skipped?.length) {
      throw new Error(`ZIP created with ${data.added || '?'} of ${songs.length} songs. Skipped: ${data.skipped.join('; ')}`);
    }
  },

  async fetchAudioBlob(url) {
    const response = await fetch(url, { mode: 'cors', redirect: 'follow', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let blob = await response.blob();
    if (blob.type === 'text/html' || (blob.size < 8000 && blob.type !== 'audio/mpeg')) {
      const html = await blob.text();
      const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/);
      const idMatch = url.match(/[?&]id=([^&]+)/);
      if (confirmMatch && idMatch) {
        const confirmUrl = `https://drive.usercontent.google.com/download?id=${idMatch[1]}&export=download&confirm=${confirmMatch[1]}`;
        const retry = await fetch(confirmUrl, { mode: 'cors', redirect: 'follow', credentials: 'omit' });
        if (!retry.ok) throw new Error(`Confirm fetch HTTP ${retry.status}`);
        blob = await retry.blob();
      }
    }

    if (!blob.size) throw new Error('Empty file');
    if (blob.type === 'text/html') throw new Error('Drive returned HTML instead of audio');
    return blob;
  },

  async fetchSongBlob(song, format) {
    const candidates = Utils.getSongDownloadCandidates(song, format);
    if (!candidates.length) throw new Error(`No ${format.toUpperCase()} link`);

    const errors = [];
    for (const url of candidates) {
      try {
        const blob = await this.fetchAudioBlob(url);
        if (await Utils.isAudioBlob(blob)) return blob;
        errors.push(`${url}: not audio (${blob.type || 'unknown'})`);
      } catch (err) {
        errors.push(`${url}: ${err.message}`);
      }
    }

    throw new Error(errors[errors.length - 1] || 'All download sources failed');
  },

  triggerBlobDownload(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
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
      const candidates = Utils.getSongDownloadCandidates(song, format);
      const url = candidates[0];
      if (!url) continue;
      const filename = Utils.safeFilename(song.artistName, song.songTitle, ext);
      this.triggerFileDownload(url, filename);
      started++;
      await new Promise((resolve) => setTimeout(resolve, 450));
    }

    if (!started) {
      throw new Error(`No ${format.toUpperCase()} download links found for queued songs.`);
    }
  },

  async downloadZipClient(songs, format, onProgress) {
    if (!window.JSZip) throw new Error('JSZip is not loaded');

    const zip = new JSZip();
    const usedNames = new Set();
    const errors = [];
    const ext = format === 'wav' ? 'wav' : 'mp3';
    let added = 0;

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      onProgress?.({ current: i + 1, total: songs.length, added, status: 'fetching', songTitle: song.songTitle });

      try {
        const audioBlob = await this.fetchSongBlob(song, format);
        let folderName = Utils.zipFolderName(song.artistName, song.songTitle);
        let suffix = 2;
        while (usedNames.has(folderName.toLowerCase())) {
          folderName = `${Utils.zipFolderName(song.artistName, song.songTitle)} (${suffix})`;
          suffix += 1;
        }
        usedNames.add(folderName.toLowerCase());

        const folder = zip.folder(folderName);
        await this.addSongPackageToZip(folder, song, format, audioBlob);
        added++;
      } catch (err) {
        errors.push(`${song.songTitle}: ${err.message}`);
      }
    }

    if (!added) {
      const detail = errors.length ? errors.join('; ') : 'no download sources worked';
      throw new Error(`Could not build a ZIP (${detail}).${this.zipSetupHint()}`);
    }

    onProgress?.({ current: songs.length, total: songs.length, added, status: 'zipping' });
    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    this.triggerBlobDownload(content, `radio-now-${format}-${new Date().toISOString().slice(0, 10)}.zip`);

    onProgress?.({ current: songs.length, total: songs.length, added, status: 'done' });

    if (errors.length) {
      throw new Error(`ZIP created with ${added} of ${songs.length} songs. Could not include: ${errors.join('; ')}.${this.zipSetupHint()}`);
    }
  },
};