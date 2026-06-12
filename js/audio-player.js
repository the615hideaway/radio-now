const AudioPlayer = {
  cache: new Map(),
  activeAudio: null,

  getPreviewCandidates(song) {
    const candidates = [];
    const driveId = song.previewDriveId || Utils.extractDriveId(song.previewLink);

    if (CONFIG.googleScriptUrl && driveId) {
      const base = CONFIG.googleScriptUrl.replace(/\/$/, '');
      candidates.push(`${base}?action=stream&id=${encodeURIComponent(driveId)}`);
    }

    if (song.previewStreamUrl) candidates.push(song.previewStreamUrl);
    if (song.previewLink && /^https?:\/\//i.test(song.previewLink)) {
      candidates.push(song.previewLink);
    }

    const resolved = Utils.resolvePreviewUrl(song);
    if (resolved) candidates.push(resolved);

    return [...new Set(candidates.filter(Boolean))];
  },

  songFromElement(el) {
    return {
      id: el.dataset.songId || '',
      previewLink: el.dataset.previewLink || '',
      previewStreamUrl: el.dataset.previewStream || '',
      previewDriveId: el.dataset.previewDriveId || '',
    };
  },

  async isPlayableBlob(blob) {
    if (!blob || !blob.size) return false;
    if (blob.type && blob.type.startsWith('audio/')) return true;

    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
    const isMp3Frame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
    return isId3 || isMp3Frame;
  },

  async fetchBlobUrl(url) {
    const response = await fetch(url, { mode: 'cors', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!(await this.isPlayableBlob(blob))) throw new Error('Not audio');
    return URL.createObjectURL(blob);
  },

  async resolvePlaybackUrl(song) {
    const cacheKey = song.id || song.previewStreamUrl || song.previewLink;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const candidates = this.getPreviewCandidates(song);
    if (!candidates.length) throw new Error('No Preview Link');

    for (const url of candidates) {
      if (url.includes('script.google.com')) {
        this.cache.set(cacheKey, url);
        return url;
      }

      try {
        const blobUrl = await this.fetchBlobUrl(url);
        this.cache.set(cacheKey, blobUrl);
        return blobUrl;
      } catch (err) {
        console.warn('Preview fetch failed:', url, err.message);
      }
    }

    throw new Error('Could not load preview audio');
  },

  pauseOthers(currentAudio) {
    document.querySelectorAll('.preview-audio').forEach((audio) => {
      if (audio !== currentAudio) {
        audio.pause();
        audio.currentTime = 0;
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
    const streamUrl = song.previewStreamUrl || Utils.resolvePreviewUrl(song);
    const driveId = song.previewDriveId || Utils.extractDriveId(previewLink) || '';
    const openUrl = previewLink || streamUrl;

    if (!openUrl) {
      return '<span class="muted">No Preview Link</span>';
    }

    return `
      <div class="preview-player"
        data-song-id="${Utils.escapeHtml(song.id || '')}"
        data-preview-link="${Utils.escapeHtml(previewLink)}"
        data-preview-stream="${Utils.escapeHtml(streamUrl || '')}"
        data-preview-drive-id="${Utils.escapeHtml(driveId)}">
        <div class="preview-controls">
          <button type="button" class="btn btn-secondary btn-sm preview-play-btn">
            <i class="fa-solid fa-play"></i> Play Preview
          </button>
          <a class="preview-open-link" href="${Utils.escapeHtml(openUrl)}" target="_blank" rel="noopener">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
        <audio class="preview-audio" controls preload="none"></audio>
        <div class="preview-status muted" aria-live="polite"></div>
      </div>`;
  },

  async play(song, audioEl, statusWrap) {
    const wrap = statusWrap || audioEl?.closest('.preview-player');
    if (!song.previewLink && !song.previewStreamUrl) {
      this.setStatus(wrap, 'No Preview Link', true);
      return false;
    }

    const audio = audioEl || wrap?.querySelector('.preview-audio');
    if (!audio) return false;

    const btn = wrap?.querySelector('.preview-play-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading…';
    }
    this.setStatus(wrap, 'Loading preview…');

    try {
      this.pauseOthers(audio);
      const src = await this.resolvePlaybackUrl(song);
      audio.src = src;
      audio.classList.add('is-active');
      audio.load();
      this.activeAudio = audio;
      await audio.play();
      this.setStatus(wrap, '');
      return true;
    } catch (err) {
      console.warn('Playback failed:', err);
      this.setStatus(wrap, 'In-page preview blocked — use the open link', true);
      if (song.previewLink) window.open(song.previewLink, '_blank', 'noopener');
      return false;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Play Preview';
      }
    }
  },

  bindPlayer(player) {
    if (!player || player.dataset.bound === 'true') return;
    player.dataset.bound = 'true';

    const btn = player.querySelector('.preview-play-btn');
    const audio = player.querySelector('.preview-audio');

    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.play(this.songFromElement(player), audio, player);
      });
    }

    if (audio) {
      audio.addEventListener('play', () => {
        this.pauseOthers(audio);
        this.activeAudio = audio;
      });
    }
  },

  hydrate(root = document) {
    root.querySelectorAll('.preview-player').forEach((player) => this.bindPlayer(player));
  },

  async playSong(song, audioEl) {
    const wrap = audioEl.closest('.preview-player') || document.getElementById('now-playing');
    return this.play(song, audioEl, wrap);
  },
};