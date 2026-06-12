const AudioPlayer = {
  cache: new Map(),

  getDriveId(songOrUrl) {
    if (typeof songOrUrl === 'string') return Utils.extractDriveId(songOrUrl);
    return (
      songOrUrl.previewDriveId ||
      Utils.extractDriveId(songOrUrl.previewLink) ||
      Utils.extractDriveId(songOrUrl.mp3)
    );
  },

  getStreamCandidates(songOrUrl) {
    const driveId = this.getDriveId(songOrUrl);
    const candidates = [];

    if (CONFIG.googleScriptUrl && driveId) {
      const base = CONFIG.googleScriptUrl.replace(/\/$/, '');
      candidates.push(`${base}?action=stream&id=${encodeURIComponent(driveId)}`);
    }

    if (typeof songOrUrl === 'string') {
      candidates.push(songOrUrl);
    } else {
      const preview = Utils.resolvePreviewUrl(songOrUrl);
      if (preview) candidates.push(preview);
    }

    if (driveId) {
      candidates.push(`https://drive.usercontent.google.com/download?id=${driveId}&export=download`);
      candidates.push(`https://drive.google.com/uc?export=download&id=${driveId}`);
      candidates.push(`https://docs.google.com/uc?export=open&id=${driveId}`);
    }

    return [...new Set(candidates.filter(Boolean))];
  },

  async isPlayableBlob(blob) {
    if (!blob || !blob.size) return false;
    if (blob.type && blob.type.startsWith('audio/')) return true;

    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
    const isMp3Frame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
    return isId3 || isMp3Frame;
  },

  async resolveUrl(songOrUrl) {
    const cacheKey = typeof songOrUrl === 'string' ? songOrUrl : JSON.stringify(this.getStreamCandidates(songOrUrl));
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const candidates = typeof songOrUrl === 'string'
      ? [songOrUrl]
      : this.getStreamCandidates(songOrUrl);

    let lastError = null;

    for (const url of candidates) {
      if (url.includes('script.google.com') && url.includes('action=stream')) {
        return url;
      }

      try {
        const response = await fetch(url, { mode: 'cors', redirect: 'follow' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        if (!(await this.isPlayableBlob(blob))) {
          throw new Error('Response was not audio');
        }

        const objectUrl = URL.createObjectURL(blob);
        this.cache.set(cacheKey, objectUrl);
        return objectUrl;
      } catch (err) {
        lastError = err;
      }
    }

    const streamUrl = candidates.find((url) => url.includes('action=stream'));
    if (streamUrl) return streamUrl;

    throw lastError || new Error('Could not load preview');
  },

  render(song) {
    const driveId = this.getDriveId(song);
    const fallbackUrl = Utils.resolvePreviewUrl(song);

    if (!fallbackUrl && !driveId) {
      return '<span class="muted">No preview</span>';
    }

    const openUrl = fallbackUrl || `https://drive.google.com/file/d/${driveId}/view`;
    const songId = Utils.escapeHtml(song.id || driveId || 'preview');

    return `
      <div class="preview-wrap">
        <audio class="preview-audio" controls preload="none"
          data-song-id="${songId}"
          data-preview-drive-id="${Utils.escapeHtml(driveId || '')}"
          data-preview-fallback="${Utils.escapeHtml(fallbackUrl || '')}"></audio>
        <div class="preview-status muted" aria-live="polite"></div>
        <a class="preview-open-link" href="${Utils.escapeHtml(openUrl)}" target="_blank" rel="noopener">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open MP3
        </a>
      </div>`;
  },

  setStatus(audio, message, isError) {
    const status = audio.closest('.preview-wrap')?.querySelector('.preview-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('error', !!isError);
  },

  songFromAudio(audio) {
    return {
      id: audio.dataset.songId,
      previewDriveId: audio.dataset.previewDriveId,
      previewLink: audio.dataset.previewFallback,
      mp3: audio.dataset.previewFallback,
    };
  },

  async prepare(audio) {
    if (!audio || audio.dataset.state === 'ready') return true;

    const song = this.songFromAudio(audio);
    const candidates = this.getStreamCandidates(song);
    if (!candidates.length) {
      this.setStatus(audio, 'No preview available', true);
      return false;
    }

    audio.dataset.state = 'loading';
    audio.classList.add('is-loading');
    this.setStatus(audio, 'Loading preview…');

    try {
      const src = await this.resolveUrl(song);
      audio.src = src;
      audio.dataset.state = 'ready';
      this.setStatus(audio, '');
      return true;
    } catch (err) {
      console.warn('Preview load failed:', err);
      audio.dataset.state = 'error';
      this.setStatus(audio, 'Preview blocked — use Open MP3 or deploy Apps Script (see setup guide)', true);
      return false;
    } finally {
      audio.classList.remove('is-loading');
    }
  },

  bind(audio) {
    if (!audio || audio.dataset.bound === 'true') return;
    audio.dataset.bound = 'true';

    const loadAndPlay = async () => {
      const wasReady = audio.dataset.state === 'ready';
      const ok = await this.prepare(audio);
      if (!ok || wasReady) return;

      try {
        await audio.play();
      } catch (playErr) {
        console.warn('Playback failed:', playErr);
        this.setStatus(audio, 'Tap Open MP3 if playback is blocked', true);
      }
    };

    audio.addEventListener('play', (event) => {
      if (audio.dataset.state === 'ready') return;
      event.preventDefault();
      audio.pause();
      loadAndPlay();
    });

    audio.addEventListener('pointerdown', () => {
      if (!audio.dataset.state) this.prepare(audio);
    });
  },

  hydrate(root = document) {
    root.querySelectorAll('audio[data-preview-fallback], audio[data-preview-drive-id]').forEach((audio) => {
      this.bind(audio);
    });
  },
};