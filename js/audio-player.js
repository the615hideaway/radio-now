const AudioPlayer = {
  cache: new Map(),
  activePlayer: null,

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

  pauseOthers(currentWrap) {
    document.querySelectorAll('.preview-player.is-playing').forEach((wrap) => {
      if (wrap !== currentWrap) this.resetPlayer(wrap);
    });
  },

  setStatus(wrap, message, isError) {
    const status = wrap?.querySelector('.preview-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('error', !!isError);
    status.classList.toggle('visible', !!message);
  },

  resetPlayer(wrap) {
    if (!wrap) return;
    wrap.classList.remove('is-playing', 'is-loading');

    const host = wrap.querySelector('.preview-embed-host');
    if (host) host.innerHTML = '';

    const audio = wrap.querySelector('.preview-audio');
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.classList.remove('is-active');
      audio.load();
    }

    const playBtn = wrap.querySelector('.preview-play-btn');
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.classList.remove('is-hidden');
    }

    this.setStatus(wrap, '');
    if (this.activePlayer === wrap) this.activePlayer = null;
  },

  render(song) {
    const previewLink = song.previewLink || '';
    const driveId = this.getDriveId(song);
    const directUrl = this.isDirectAudioUrl(previewLink) ? previewLink : '';

    if (!driveId && !directUrl) {
      return '<span class="muted">No Preview Link</span>';
    }

    const title = Utils.escapeHtml(song.songTitle || 'Preview');

    return `
      <div class="preview-player preview-player--lazy"
        data-song-id="${Utils.escapeHtml(song.id || '')}"
        data-song-title="${title}"
        data-preview-link="${Utils.escapeHtml(previewLink)}"
        data-preview-stream="${Utils.escapeHtml(song.previewStreamUrl || '')}"
        data-preview-drive-id="${Utils.escapeHtml(driveId)}"
        data-direct-url="${Utils.escapeHtml(directUrl)}">
        <div class="preview-shell">
          <button type="button" class="preview-play-btn" aria-label="Play ${title}">
            <span class="preview-play-icon"><i class="fa-solid fa-play"></i></span>
            <span class="preview-play-label">Play Preview</span>
          </button>
          <div class="preview-waveform" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <div class="preview-embed-host"></div>
        <div class="preview-status muted" aria-live="polite"></div>
      </div>`;
  },

  songFromElement(el) {
    return {
      id: el.dataset.songId || '',
      songTitle: el.dataset.songTitle || '',
      previewLink: el.dataset.previewLink || '',
      previewStreamUrl: el.dataset.previewStream || '',
      previewDriveId: el.dataset.previewDriveId || '',
    };
  },

  async loadEmbed(wrap, song) {
    const driveId = this.getDriveId(song);
    const host = wrap.querySelector('.preview-embed-host');
    if (!host || !driveId) return false;

    host.innerHTML = `
      <iframe class="preview-iframe"
        src="${Utils.escapeHtml(this.getEmbedUrl(driveId))}"
        title="Preview: ${Utils.escapeHtml(song.songTitle || 'track')}"
        allow="autoplay"
        referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    return true;
  },

  async loadAudio(wrap, song) {
    const host = wrap.querySelector('.preview-embed-host');
    if (!host) return false;

    host.innerHTML = `<audio class="preview-audio" controls preload="none"></audio>`;
    const audio = host.querySelector('.preview-audio');
    return this.playInAudio(song, audio, wrap);
  },

  async activatePlayer(wrap) {
    const song = this.songFromElement(wrap);
    const driveId = this.getDriveId(song);
    const directUrl = wrap.dataset.directUrl || '';

    this.pauseOthers(wrap);
    this.activePlayer = wrap;
    wrap.classList.add('is-loading');

    const playBtn = wrap.querySelector('.preview-play-btn');
    if (playBtn) playBtn.disabled = true;
    this.setStatus(wrap, 'Loading preview…');

    try {
      let ok = false;

      if (driveId) {
        ok = await this.loadEmbed(wrap, song);
      } else if (directUrl) {
        ok = await this.loadAudio(wrap, { ...song, previewLink: directUrl });
      } else {
        ok = await this.loadAudio(wrap, song);
      }

      if (!ok) {
        this.setStatus(wrap, 'Could not play preview', true);
        wrap.classList.remove('is-loading');
        if (playBtn) playBtn.disabled = false;
        return false;
      }

      wrap.classList.remove('is-loading');
      wrap.classList.add('is-playing');
      if (playBtn) playBtn.classList.add('is-hidden');
      this.setStatus(wrap, '');
      return true;
    } catch (err) {
      console.warn('Preview load failed:', err);
      this.setStatus(wrap, 'Could not play preview', true);
      wrap.classList.remove('is-loading');
      if (playBtn) playBtn.disabled = false;
      return false;
    }
  },

  async playInAudio(song, audioEl, wrap) {
    if (!audioEl) return false;

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
    const container = document.getElementById('now-playing-player');
    if (!container) return;

    const driveId = this.getDriveId(song);
    const title = Utils.escapeHtml(song.songTitle || 'track');

    container.innerHTML = `
      <div class="preview-player preview-player--lazy preview-player--now-playing is-loading"
        data-song-id="${Utils.escapeHtml(song.id || '')}"
        data-song-title="${title}"
        data-preview-link="${Utils.escapeHtml(song.previewLink || '')}"
        data-preview-stream="${Utils.escapeHtml(song.previewStreamUrl || '')}"
        data-preview-drive-id="${Utils.escapeHtml(driveId)}"
        data-direct-url="">
        <div class="preview-embed-host"></div>
        <div class="preview-status visible muted" aria-live="polite">Loading preview…</div>
      </div>`;

    const wrap = container.querySelector('.preview-player');
    if (wrap) this.activatePlayer(wrap);
  },

  hydrate(root = document) {
    root.querySelectorAll('.preview-player--lazy .preview-play-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.preview-player');
        if (!wrap || wrap.classList.contains('is-playing')) return;
        this.activatePlayer(wrap);
      });
    });

    root.querySelectorAll('.preview-player .preview-audio').forEach((audio) => {
      audio.addEventListener('play', () => {
        const wrap = audio.closest('.preview-player');
        if (wrap) {
          this.pauseOthers(wrap);
          this.activePlayer = wrap;
        }
      });
    });
  },

  async playSong(song) {
    this.renderNowPlaying(song);
    return true;
  },
};