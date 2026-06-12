const Utils = {
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  },

  extractDriveId(url) {
    if (!url) return null;
    const value = String(url);
    const fileMatch = value.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) return fileMatch[1];
    const openMatch = value.match(/[?&]id=([^&]+)/);
    return openMatch ? openMatch[1] : null;
  },

  toDriveDownload(url) {
    const id = this.extractDriveId(url);
    if (!id) return url || '';
    return `https://drive.google.com/uc?export=download&id=${id}`;
  },

  toPreviewStreamUrl(previewLink) {
    const preview = String(previewLink || '').trim();
    if (!preview || preview.startsWith('wix:')) return '';

    const driveId = this.extractDriveId(preview);
    if (driveId) {
      return `https://drive.usercontent.google.com/download?id=${driveId}&export=download`;
    }

    if (/^https?:\/\//i.test(preview)) return preview;
    return '';
  },

  toDriveThumbnail(url) {
    const id = this.extractDriveId(url);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w400` : url || '';
  },

  resolvePreviewUrl(song) {
    if (song.previewStreamUrl) return song.previewStreamUrl;
    return this.toPreviewStreamUrl(song.previewLink);
  },

  resolveCoverUrl(song) {
    if (song.coverThumbnailUrl) return song.coverThumbnailUrl;
    const cover = song.cover || '';
    if (this.extractDriveId(cover)) return this.toDriveThumbnail(cover);
    if (/^https?:\/\//i.test(cover)) return cover;
    return '';
  },

  safeFilename(artist, title, ext) {
    const base = `${artist || 'Unknown'} - ${title || 'Track'}`
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `${base}.${ext}`;
  },

  uniqueZipFilename(usedNames, artist, title, ext) {
    let name = this.safeFilename(artist, title, ext);
    let counter = 2;
    while (usedNames.has(name.toLowerCase())) {
      const stem = this.safeFilename(artist, title, ext).replace(new RegExp(`\\.${ext}$`), '');
      name = `${stem} (${counter}).${ext}`;
      counter += 1;
    }
    usedNames.add(name.toLowerCase());
    return name;
  },

  getDriveDownloadUrls(driveId) {
    if (!driveId) return [];
    return [
      `https://drive.usercontent.google.com/download?id=${driveId}&export=download`,
      `https://drive.usercontent.google.com/u/0/uc?id=${driveId}&export=download`,
      `https://drive.google.com/uc?export=download&id=${driveId}`,
    ];
  },

  getSongDriveId(song, format) {
    const primary = format === 'wav' && song.wav ? song.wav : song.mp3;
    const fallback = format === 'wav' ? song.mp3 : song.wav;
    return (
      this.extractDriveId(primary)
      || this.extractDriveId(fallback)
      || song.previewDriveId
      || this.extractDriveId(song.previewLink)
      || ''
    );
  },

  getSongDownloadCandidates(song, format) {
    const urls = [];
    const primary = format === 'wav' && song.wav ? song.wav : song.mp3;
    const fallback = format === 'wav' ? song.mp3 : (song.wav || '');

    [primary, fallback, song.previewStreamUrl].forEach((url) => {
      if (!url) return;
      urls.push(url);
      const id = this.extractDriveId(url);
      if (id) urls.push(...this.getDriveDownloadUrls(id));
    });

    const driveId = this.getSongDriveId(song, format);
    if (driveId) urls.push(...this.getDriveDownloadUrls(driveId));

    return [...new Set(urls.filter(Boolean))];
  },

  async isAudioBlob(blob) {
    if (!blob || !blob.size) return false;
    if (blob.type && blob.type.startsWith('audio/')) return true;
    if (blob.type && blob.type.includes('octet-stream') && blob.size > 50000) return true;

    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
    const isMp3Frame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
    const isRiff = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
    return isId3 || isMp3Frame || isRiff;
  },

  formatDuration(value) {
    return value || '—';
  },

  formatSyncDate(iso) {
    if (!iso) return 'unknown date';
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  },

  debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
};