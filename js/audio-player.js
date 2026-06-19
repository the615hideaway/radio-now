const AudioPlayer = {
  PREVIEW_LIMIT_SEC: 20,
  activeAudio: null,
  previewTimer: null,
  onPreviewEnd: null,

  getDriveId(song) {
    return song.previewDriveId || Utils.extractDriveId(song.mp3) || Utils.extractDriveId(song.previewLink) || '';
  },

  getEmbedUrl(driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  },

  getStreamUrl(song) {
    return Utils.resolvePreviewUrl(song) || '';
  },

  hasPreview(song) {
    return !!(this.getStreamUrl(song) || this.getDriveId(song) || song.previewLink);
  },

  clearPreviewTimer() {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
  },

  clearActivePlayback() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.removeAttribute('src');
      this.activeAudio.load();
      this.activeAudio = null;
    }
    this.clearPreviewTimer();
  },

  stopPreview() {
    this.clearActivePlayback();
    const container = document.getElementById('now-playing-player');
    if (container) container.innerHTML = '';
    if (typeof this.onPreviewEnd === 'function') this.onPreviewEnd();
  },

  bindPreviewLimit(audio) {
    const enforceLimit = () => {
      if (audio.currentTime >= this.PREVIEW_LIMIT_SEC) this.stopPreview();
    };
    audio.addEventListener('timeupdate', enforceLimit);
    audio.addEventListener('seeked', enforceLimit);
    audio.addEventListener('ended', () => this.stopPreview());
    audio.addEventListener('error', () => {
      console.warn('Preview audio failed');
      this.stopPreview();
    });
  },

  renderAudioPlayer(song, streamUrl) {
    const container = document.getElementById('now-playing-player');
    if (!container) return false;

    const title = Utils.escapeHtml(song.songTitle || 'track');
    container.innerHTML = `
      <audio class="preview-audio preview-audio--now-playing is-active"
        controls autoplay
        src="${Utils.escapeHtml(streamUrl)}"
        title="20-second preview: ${title}"></audio>`;

    const audio = container.querySelector('audio');
    this.activeAudio = audio;
    this.bindPreviewLimit(audio);
    return true;
  },

  renderIframePlayer(song, driveId) {
    const container = document.getElementById('now-playing-player');
    if (!container) return false;

    const title = Utils.escapeHtml(song.songTitle || 'track');
    container.innerHTML = `
      <div class="preview-embed-host preview-embed-host--now-playing">
        <iframe class="preview-iframe preview-iframe--now-playing"
          src="${Utils.escapeHtml(this.getEmbedUrl(driveId))}"
          title="Now playing: ${title}"
          sandbox="allow-scripts allow-same-origin"
          allow="autoplay"
          referrerpolicy="no-referrer-when-downgrade"></iframe>
        <div class="preview-popout-shield" aria-hidden="true" title=""></div>
      </div>`;

    this.previewTimer = setTimeout(() => this.stopPreview(), this.PREVIEW_LIMIT_SEC * 1000);
    return true;
  },

  renderNowPlaying(song) {
    const streamUrl = this.getStreamUrl(song);
    if (streamUrl && this.renderAudioPlayer(song, streamUrl)) return;
    const driveId = this.getDriveId(song);
    if (driveId && this.renderIframePlayer(song, driveId)) return;

    const container = document.getElementById('now-playing-player');
    if (!container) return;
    container.innerHTML = `
      <div class="now-playing-fallback muted">
        <i class="fa-solid fa-circle-exclamation"></i>
        Preview unavailable for this track.
      </div>`;
  },

  async playSong(song) {
    if (!this.hasPreview(song)) return false;

    this.clearActivePlayback();
    this.renderNowPlaying(song);

    if (this.activeAudio) {
      try {
        await this.activeAudio.play();
      } catch (err) {
        console.warn('Preview autoplay blocked:', err);
      }
    }

    return true;
  },
};