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
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : url || '';
  },

  toDriveThumbnail(url) {
    const id = this.extractDriveId(url);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w400` : url || '';
  },

  resolvePreviewUrl(song) {
    const preview = song.previewLink || '';
    if (preview && !preview.startsWith('wix:')) {
      if (this.extractDriveId(preview)) return this.toDriveDownload(preview);
      if (/^https?:\/\//i.test(preview)) return preview;
    }
    return this.toDriveDownload(song.mp3) || preview;
  },

  resolveCoverUrl(song) {
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

  formatDuration(value) {
    return value || '—';
  },

  debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
};