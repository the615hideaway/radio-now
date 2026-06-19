const AudioPlayer = {
  audioEl: null,
  objectUrl: '',
  blobCache: new Map(),
  prefetchJobs: new Map(),
  maxCacheSize: 5,

  getDriveId(song) {
    return song.previewDriveId || Utils.extractDriveId(song.mp3) || Utils.extractDriveId(song.previewLink) || '';
  },

  canUseScriptProxy() {
    return typeof RadioDB !== 'undefined' && RadioDB.isScriptConfigured();
  },

  hasPreview(song) {
    if (this.getDriveId(song) && this.canUseScriptProxy()) return true;
    return this.getPreviewSources(song).length > 0;
  },

  getPreviewSources(song) {
    const urls = [];
    const driveId = this.getDriveId(song);

    if (song.previewStreamUrl) urls.push(song.previewStreamUrl);

    if (driveId) {
      const api = Utils.driveApiMediaUrl(driveId);
      if (api) urls.push(api);
      urls.push(...Utils.getDriveDownloadUrls(driveId));
    }

    [song.mp3, song.previewLink].forEach((url) => {
      if (!url) return;
      urls.push(url);
      const id = Utils.extractDriveId(url);
      if (id) {
        urls.push(...Utils.getDriveDownloadUrls(id));
        const stream = Utils.toPreviewStreamUrl(url);
        if (stream) urls.push(stream);
      }
    });

    return [...new Set(urls.filter(Boolean))];
  },

  cacheBlob(driveId, blob) {
    if (!driveId || !blob) return;
    if (this.blobCache.size >= this.maxCacheSize) {
      const oldest = this.blobCache.keys().next().value;
      this.blobCache.delete(oldest);
    }
    this.blobCache.set(driveId, blob);
  },

  revokeObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    }
  },

  showLoading(message = 'Loading preview…') {
    const container = document.getElementById('now-playing-player');
    if (!container) return;
    this.audioEl = null;
    container.innerHTML = `
      <div class="now-playing-fallback preview-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>${Utils.escapeHtml(message)}</span>
      </div>`;
  },

  getPlayerElement() {
    const container = document.getElementById('now-playing-player');
    if (!container) return null;

    if (!this.audioEl || !container.contains(this.audioEl)) {
      container.innerHTML = `
        <audio class="preview-audio preview-audio--now-playing" controls playsinline preload="auto"
          title="Radio Now preview player"></audio>`;
      this.audioEl = container.querySelector('audio');
    }

    return this.audioEl;
  },

  prefetch(song) {
    const driveId = this.getDriveId(song);
    if (!driveId || !this.canUseScriptProxy()) return;
    if (this.blobCache.has(driveId) || this.prefetchJobs.has(driveId)) return;

    const job = RadioDB.fetchAudioViaScript(driveId)
      .then((blob) => {
        if (blob?.size) this.cacheBlob(driveId, blob);
        return blob;
      })
      .catch(() => null)
      .finally(() => {
        this.prefetchJobs.delete(driveId);
      });

    this.prefetchJobs.set(driveId, job);
  },

  async playBlob(audio, blob) {
    this.revokeObjectUrl();
    this.objectUrl = URL.createObjectURL(blob);
    audio.src = this.objectUrl;

    try {
      await audio.play();
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        audio.load();
        return true;
      }
      throw err;
    }
  },

  async fetchAndCacheBlob(driveId) {
    const blob = await RadioDB.fetchAudioViaScript(driveId);
    if (!(await Utils.isAudioBlob(blob))) {
      throw new Error('Preview stream did not return audio');
    }
    this.cacheBlob(driveId, blob);
    return blob;
  },

  async playFromScript(song) {
    const driveId = this.getDriveId(song);
    if (!driveId || !this.canUseScriptProxy()) return false;

    const cached = this.blobCache.get(driveId);
    if (cached) {
      return this.playBlob(this.getPlayerElement(), cached);
    }

    const pending = this.prefetchJobs.get(driveId);
    if (pending) {
      this.showLoading('Loading preview…');
      const prefetched = await pending;
      if (prefetched?.size) {
        return this.playBlob(this.getPlayerElement(), prefetched);
      }
    }

    this.showLoading('Loading preview…');
    const blob = await this.fetchAndCacheBlob(driveId);
    return this.playBlob(this.getPlayerElement(), blob);
  },

  async playFromUrls(audio, sources) {
    for (let i = 0; i < sources.length; i++) {
      audio.src = sources[i];
      try {
        await audio.play();
        return true;
      } catch (err) {
        if (i === sources.length - 1) throw err;
      }
    }
    return false;
  },

  async playSong(song) {
    if (!this.hasPreview(song)) return false;

    try {
      if (this.canUseScriptProxy() && this.getDriveId(song)) {
        return await this.playFromScript(song);
      }

      const audio = this.getPlayerElement();
      const sources = this.getPreviewSources(song);
      if (!audio || !sources.length) return false;

      audio.pause();
      audio.currentTime = 0;
      return await this.playFromUrls(audio, sources);
    } catch (err) {
      console.warn('Preview failed for', song.songTitle, err.message);
      this.showLoading('Preview unavailable — try again or use MP3 download.');
      return false;
    }
  },
};