const AudioPlayer = {
  cache: new Map(),
  activeAudio: null,

  getDriveId(song) {
    return song.previewDriveId || Utils.extractDriveId(song.previewLink) || '';
  },

  getEmbedUrl(driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  },

  getStreamCandidates(song) {
    const candidates = [];
    const driveId = this.getDriveId(song);

    if (CONFIG.googleScriptUrl && driveId) {
      const base = CONFIG.googleScriptUrl.replace(/\/$/, '');
      candidates.push(`${base}?action=stream&id=${encodeURIComponent(driveId)}`);
    }

    if (song.previewStreamUrl) candidates.push(song.previewStreamUrl);

    const resolved = Utils.resolvePreviewUrl(song);
    if (resolved) candidates.push(resolved);

    return [...new Set(candidates.filter(Boolean))];
  },

  isDirectAudioUrl(url) {
    return /^https?:\/\//i.test(url) && !url.includes('drive.google.com/file/') && !url.includes('drive.google.com/open');
  },

  async isPlayableBlob(blob) {
    if (!blob || !blob.size) return false;
    if (blob.type && blob.type.startsWith('audio/')) return true;

    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
    const isMp3Frame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
    return isId3 || isMp3Frame;
  },

  async tryDirectAudio(audio, url) {
    return new Promise((resolve) => {
      const onReady = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onReady);
        audio.removeEventListener('canplay', onReady);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('loadedmetadata', onReady, { once: true });
      audio.addEventListener('canplay', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.src = url;
      audio.load();
    });
  },

  async fetchBlobUrl(url) {
    const response = await fetch(url, { mode: 'cors', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!(await this.isPlayableBlob(blob))) throw new Error('Not audio');
    return URL.createObjectURL(blob);
  },

  async resolveAudioSrc(song) {
    const cacheKey = song.id || song.previewStreamUrl || song.previewLink;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    for (const url of this.getStreamCandidates(song)) {
      if (url.includes('script.google.com')) {
        this.cache.set(cacheKey, url);
        return url;
      }

      try {
        const blobUrl = await this.fetchBlobUrl(url);
        this.cache.set(cacheKey, blobUrl);
        return blobUrl;
      } catch (err) {
        console.warn('Blob fetch failed:', url, err.message);
      }
    }

    return null;
  },

  pauseOthers(currentAudio) {
    document.querySelectorAll('.preview-audio').forEach((audio) => {
      if (audio !== currentAudio) {
        audio.pause();
      }
    });
  },

  setStatus(wrap, message, isError) {
    const status = wrap?.querySelector('.preview-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('error', !!isError);
  },

  render(song) {
    const previewLink = song.previewLink || '';
    const driveId = this.getDriveId(song);
    const directUrl = this.isDirectAudioUrl(previewLink) ? previewLink : '';

    if (!driveId && !directUrl) {
      return '<span class="muted">No Preview Link</span>';
    }

    if (driveId) {
      const embedUrl = this.getEmbedUrl(driveId);
      return `
        <div class="preview-player preview-player--embed"
          data-song-id="${Utils.escapeHtml(song.id || '')}"
          data-preview-drive-id="${Utils.escapeHtml(driveId)}">
          <iframe class="preview-iframe"
            src="${Utils.escapeHtml(embedUrl)}"
            title="Preview: ${Utils.escapeHtml(song.songTitle)}"
            allow="autoplay"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>`;
    }

    return `
      <div class="preview-player preview-player--audio"
        data-song-id="${Utils.escapeHtml(song.id || '')}"
        data-preview-link="${Utils.escapeHtml(previewLink)}"
        data-preview-stream="${Utils.escapeHtml(song.previewStreamUrl || '')}"
        data-preview-drive-id="">
        <audio class="preview-audio is-active" controls preload="none"
          src="${Utils.escapeHtml(directUrl)}"></audio>
        <div class="preview-status muted" aria-live="polite"></div>
      </div>`;
  },

  songFromElement(el) {
    return {
      id: el.dataset.songId || '',
      previewLink: el.dataset.previewLink || '',
      previewStreamUrl: el.dataset.previewStream || '',
      previewDriveId: el.dataset.previewDriveId || '',
    };
  },

  async playInAudio(song, audioEl, wrap) {
    if (!audioEl) return false;

    this.pauseOthers(audioEl);
    this.setStatus(wrap, 'Loading preview…');

    const candidates = this.getStreamCandidates(song);
    if (song.previewLink && this.isDirectAudioUrl(song.previewLink)) {
      candidates.unshift(song.previewLink);
    }

    for (const url of candidates) {
      const ok = await this.tryDirectAudio(audioEl, url);
      if (ok) {
        audioEl.classList.add('is-active');
        this.setStatus(wrap, '');
        try {
          await audioEl.play();
          this.activeAudio = audioEl;
          return true;
        } catch (err) {
          console.warn('Direct play failed:', err);
        }
      }
    }

    const blobSrc = await this.resolveAudioSrc(song);
    if (blobSrc) {
      const ok = await this.tryDirectAudio(audioEl, blobSrc);
      if (ok) {
        audioEl.classList.add('is-active');
        this.setStatus(wrap, '');
        try {
          await audioEl.play();
          this.activeAudio = audioEl;
          return true;
        } catch (err) {
          console.warn('Blob play failed:', err);
        }
      }
    }

    this.setStatus(wrap, 'Could not play preview in browser', true);
    return false;
  },

  renderNowPlaying(song) {
    const driveId = this.getDriveId(song);
    const container = document.getElementById('now-playing-player');
    if (!container) return;

    if (driveId) {
      container.innerHTML = `
        <iframe class="preview-iframe preview-iframe--queue"
          src="${Utils.escapeHtml(this.getEmbedUrl(driveId))}"
          title="Now playing: ${Utils.escapeHtml(song.songTitle)}"
          allow="autoplay"
          loading="lazy"></iframe>`;
      return;
    }

    container.innerHTML = `<audio class="preview-audio is-active" controls preload="none" id="now-playing-audio-el"></audio>`;
    const audio = document.getElementById('now-playing-audio-el');
    if (audio) this.playInAudio(song, audio, container);
  },

  hydrate(root = document) {
    root.querySelectorAll('.preview-player--audio .preview-audio').forEach((audio) => {
      audio.addEventListener('play', () => {
        this.pauseOthers(audio);
        this.activeAudio = audio;
      });
    });
  },

  async playSong(song) {
    this.renderNowPlaying(song);
    return true;
  },
};