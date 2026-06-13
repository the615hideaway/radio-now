const AudioPlayer = {
  audioEl: null,

  getDriveId(song) {
    return song.previewDriveId || Utils.extractDriveId(song.mp3) || Utils.extractDriveId(song.previewLink) || '';
  },

  hasPreview(song) {
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

  getPlayerElement() {
    const container = document.getElementById('now-playing-player');
    if (!container) return null;

    if (!this.audioEl || !container.contains(this.audioEl)) {
      container.innerHTML = `
        <audio class="preview-audio preview-audio--now-playing" controls playsinline preload="metadata"
          title="Radio Now preview player"></audio>`;
      this.audioEl = container.querySelector('audio');
    }

    return this.audioEl;
  },

  async playSong(song) {
    const audio = this.getPlayerElement();
    const sources = this.getPreviewSources(song);
    if (!audio || !sources.length) return false;

    audio.pause();
    audio.currentTime = 0;

    for (let i = 0; i < sources.length; i++) {
      audio.src = sources[i];
      try {
        await audio.play();
        return true;
      } catch (err) {
        if (i === sources.length - 1) {
          console.warn('Preview failed for', song.songTitle, err.message);
        }
      }
    }

    return false;
  },
};