const AudioPlayer = {
  cache: new Map(),

  render(song) {
    const src = Utils.resolvePreviewUrl(song);
    if (!src) return '<span class="muted">No preview</span>';
    const id = Utils.escapeHtml(song.id || src);
    return `<audio class="preview-audio" controls preload="none" data-preview-src="${Utils.escapeHtml(src)}" data-song-id="${id}"></audio>`;
  },

  async resolveUrl(url) {
    if (!url) throw new Error('Missing preview URL');
    if (this.cache.has(url)) return this.cache.get(url);

    const response = await fetch(url, { mode: 'cors', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    if (!blob.size) throw new Error('Empty audio file');

    const type = blob.type || '';
    if (type && !type.startsWith('audio/') && type !== 'application/octet-stream') {
      throw new Error('Unexpected file type');
    }

    const objectUrl = URL.createObjectURL(blob);
    this.cache.set(url, objectUrl);
    return objectUrl;
  },

  async prepare(audio) {
    if (!audio || audio.dataset.ready === 'true') return true;

    const sourceUrl = audio.dataset.previewSrc;
    if (!sourceUrl) return false;

    audio.classList.add('is-loading');

    try {
      audio.src = await this.resolveUrl(sourceUrl);
      audio.dataset.ready = 'true';
      return true;
    } catch (err) {
      console.warn('Preview blob load failed, trying direct URL:', err);
      audio.src = sourceUrl;
      audio.dataset.ready = 'fallback';
      return false;
    } finally {
      audio.classList.remove('is-loading');
    }
  },

  bind(audio) {
    if (!audio || audio.dataset.bound === 'true') return;
    audio.dataset.bound = 'true';

    const prime = async () => {
      if (audio.dataset.ready) return;
      await this.prepare(audio);
    };

    audio.addEventListener('play', async (event) => {
      if (audio.dataset.ready) return;

      event.preventDefault();
      audio.pause();

      const ok = await this.prepare(audio);
      if (!ok && !audio.src) return;

      try {
        await audio.play();
      } catch (playErr) {
        console.warn('Preview playback failed:', playErr);
      }
    });

    audio.addEventListener('pointerdown', prime, { once: true });
  },

  hydrate(root = document) {
    root.querySelectorAll('audio[data-preview-src]').forEach((audio) => this.bind(audio));
  },
};