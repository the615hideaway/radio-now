const AudioPlayer = {
  cache: new Map(),

  getPreviewCandidates(song) {
    const candidates = [];
    const driveId = song.previewDriveId || Utils.extractDriveId(song.previewLink);

    if (CONFIG.googleScriptUrl && driveId) {
      const base = CONFIG.googleScriptUrl.replace(/\/$/, '');
      candidates.push(`${base}?action=stream&id=${encodeURIComponent(driveId)}`);
    }

    if (song.previewStreamUrl) candidates.push(song.previewStreamUrl);

    const resolved = Utils.resolvePreviewUrl(song);
    if (resolved) candidates.push(resolved);

    if (song.previewLink && /^https?:\/\//i.test(song.previewLink)) {
      candidates.push(song.previewLink);
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

  async resolvePlaybackUrl(song) {
    const cacheKey = song.id || song.previewLink || 'preview';
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const candidates = this.getPreviewCandidates(song);
    if (!candidates.length) throw new Error('No Preview Link available');

    for (const url of candidates) {
      if (url.includes('script.google.com') && url.includes('action=stream')) {
        this.cache.set(cacheKey, url);
        return url;
      }

      try {
        const response = await fetch(url, { mode: 'cors', redirect: 'follow' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        if (!(await this.isPlayableBlob(blob))) throw new Error('Not audio');

        const objectUrl = URL.createObjectURL(blob);
        this.cache.set(cacheKey, objectUrl);
        return objectUrl;
      } catch (err) {
        console.warn('Preview candidate failed:', url, err.message);
      }
    }

    throw new Error('Could not load Preview Link');
  },

  render(song) {
    const previewLink = song.previewLink || '';
    const streamUrl = Utils.resolvePreviewUrl(song);
    const openUrl = previewLink || streamUrl;

    if (!openUrl) {
      return '<span class="muted">No Preview Link</span>';
    }

    const payload = encodeURIComponent(JSON.stringify({
      id: song.id,
      previewLink,
      previewStreamUrl: song.previewStreamUrl || streamUrl,
      previewDriveId: song.previewDriveId || Utils.extractDriveId(previewLink) || '',
    }));

    return `
      <div class="preview-wrap">
        <audio class="preview-audio" controls preload="none"
          data-song-preview="${Utils.escapeHtml(payload)}"></audio>
        <div class="preview-status muted" aria-live="polite"></div>
        <a class="preview-open-link" href="${Utils.escapeHtml(openUrl)}" target="_blank" rel="noopener">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Preview
        </a>
      </div>`;
  },

  songFromAudio(audio) {
    try {
      return JSON.parse(decodeURIComponent(audio.dataset.songPreview || '%7B%7D'));
    } catch {
      return {};
    }
  },

  setStatus(audio, message, isError) {
    const status = audio.closest('.preview-wrap')?.querySelector('.preview-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('error', !!isError);
  },

  async prepare(audio) {
    if (!audio || audio.dataset.state === 'ready') return true;

    const song = this.songFromAudio(audio);
    if (!song.previewLink && !song.previewStreamUrl) {
      this.setStatus(audio, 'No Preview Link in catalog', true);
      return false;
    }

    audio.dataset.state = 'loading';
    audio.classList.add('is-loading');
    this.setStatus(audio, 'Loading preview…');

    try {
      audio.src = await this.resolvePlaybackUrl(song);
      audio.dataset.state = 'ready';
      this.setStatus(audio, '');
      return true;
    } catch (err) {
      console.warn('Preview load failed:', err);
      audio.dataset.state = 'error';
      this.setStatus(audio, 'Preview blocked — click Open Preview', true);
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
      } catch (err) {
        console.warn('Playback failed:', err);
        this.setStatus(audio, 'Click Open Preview to listen', true);
      }
    };

    audio.addEventListener('play', (event) => {
      if (audio.dataset.state === 'ready') return;
      event.preventDefault();
      audio.pause();
      loadAndPlay();
    });

    audio.addEventListener('pointerdown', () => {
      if (audio.dataset.state !== 'ready') this.prepare(audio);
    });
  },

  hydrate(root = document) {
    root.querySelectorAll('audio[data-song-preview]').forEach((audio) => this.bind(audio));
  },

  async playSong(song, audioEl) {
    const payload = encodeURIComponent(JSON.stringify({
      id: song.id,
      previewLink: song.previewLink,
      previewStreamUrl: song.previewStreamUrl || Utils.resolvePreviewUrl(song),
      previewDriveId: song.previewDriveId || Utils.extractDriveId(song.previewLink) || '',
    }));

    audioEl.dataset.songPreview = payload;
    audioEl.dataset.state = '';
    delete audioEl.dataset.bound;
    audioEl.removeAttribute('src');
    this.bind(audioEl);
    await this.prepare(audioEl);
    return audioEl.play();
  },
};