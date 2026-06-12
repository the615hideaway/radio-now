(function () {
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const searchInput = document.getElementById('search-input');
  const styleFilter = document.getElementById('style-filter');
  const yearFilter = document.getElementById('year-filter');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const catalogGrid = document.getElementById('catalog-grid');
  const statTotal = document.getElementById('stat-total');
  const statQueue = document.getElementById('stat-queue');
  const statSelected = document.getElementById('stat-selected');
  const connectionBanner = document.getElementById('connection-banner');
  const queueList = document.getElementById('queue-list');
  const queueEmpty = document.getElementById('queue-empty');
  const clearQueueBtn = document.getElementById('clear-queue-btn');
  const downloadZipBtn = document.getElementById('download-zip-btn');
  const downloadFormat = document.getElementById('download-format');
  const selectAllBtn = document.getElementById('select-all-btn');
  const detailModal = document.getElementById('detail-modal');
  const modalClose = document.getElementById('modal-close');
  const modalBody = document.getElementById('modal-body');
  const nowPlaying = document.getElementById('now-playing');
  const nowPlayingAudio = document.getElementById('now-playing-audio');
  const nowPlayingTitle = document.getElementById('now-playing-title');
  const nowPlayingArtist = document.getElementById('now-playing-artist');
  const playQueueBtn = document.getElementById('play-queue-btn');
  const skipQueueBtn = document.getElementById('skip-queue-btn');

  let allSongs = [];
  let filteredSongs = [];
  let queue = [];
  const selectedIds = new Set();
  let queuePlayIndex = -1;

  function isAuthenticated() {
    return sessionStorage.getItem(CONFIG.authKey) === 'true';
  }

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    loadQueueFromStorage();
    checkConnection();
    loadSongs();
  }

  function showLogin() {
    loginGate.classList.remove('hidden');
    appShell.classList.add('hidden');
  }

  function saveQueue() {
    localStorage.setItem(CONFIG.queueKey, JSON.stringify(queue.map((s) => s.id)));
  }

  function loadQueueFromStorage() {
    try {
      const ids = JSON.parse(localStorage.getItem(CONFIG.queueKey) || '[]');
      queue = ids.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    } catch {
      queue = [];
    }
  }

  function renderCover(song) {
    const url = Utils.resolveCoverUrl(song);
    if (url) {
      return `<img src="${Utils.escapeHtml(url)}" alt="" loading="lazy" onerror="this.classList.add('broken')">`;
    }
    return '<div class="cover-fallback"><i class="fa-solid fa-compact-disc"></i></div>';
  }

  function renderPreview(song) {
    return AudioPlayer.render(song);
  }

  function updateStats() {
    statTotal.textContent = filteredSongs.length;
    statQueue.textContent = queue.length;
    statSelected.textContent = selectedIds.size;
    downloadZipBtn.disabled = selectedIds.size === 0;
    selectAllBtn.textContent = selectedIds.size === filteredSongs.length && filteredSongs.length
      ? 'Deselect All'
      : 'Select All Visible';
  }

  function populateFilters() {
    const styles = [...new Set(allSongs.map((s) => s.musicStyle).filter(Boolean))].sort();
    const years = [...new Set(allSongs.map((s) => s.year).filter(Boolean))].sort((a, b) => b - a);

    styleFilter.innerHTML = '<option value="">All styles</option>' +
      styles.map((s) => `<option value="${Utils.escapeHtml(s)}">${Utils.escapeHtml(s)}</option>`).join('');

    yearFilter.innerHTML = '<option value="">All years</option>' +
      years.map((y) => `<option value="${Utils.escapeHtml(y)}">${Utils.escapeHtml(y)}</option>`).join('');
  }

  function filterSongs() {
    const q = searchInput.value.trim().toLowerCase();
    const style = styleFilter.value;
    const year = yearFilter.value;

    filteredSongs = allSongs.filter((song) => {
      const haystack = [
        song.artistName,
        song.songTitle,
        song.musicStyle,
        song.songwriter,
        song.recordLabel,
        song.bandMembers,
        song.description,
      ].join(' ').toLowerCase();

      const matchesSearch = !q || haystack.includes(q);
      const matchesStyle = !style || song.musicStyle === style;
      const matchesYear = !year || song.year === year;
      return matchesSearch && matchesStyle && matchesYear;
    });

    renderCatalog();
    updateStats();
  }

  function renderCatalog() {
    if (!filteredSongs.length) {
      catalogGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-music"></i>
          <p>No songs match your search.</p>
        </div>`;
      return;
    }

    catalogGrid.innerHTML = filteredSongs.map((song) => {
      const inQueue = queue.some((q) => q.id === song.id);
      const selected = selectedIds.has(song.id);
      return `
        <article class="song-card ${selected ? 'selected' : ''}" data-id="${Utils.escapeHtml(song.id)}">
          <div class="song-card-top">
            <label class="song-select">
              <input type="checkbox" class="row-checkbox" data-id="${Utils.escapeHtml(song.id)}" ${selected ? 'checked' : ''}>
              <span class="checkmark"></span>
            </label>
            <button class="btn-icon queue-toggle ${inQueue ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}" title="${inQueue ? 'Remove from queue' : 'Add to queue'}">
              <i class="fa-solid ${inQueue ? 'fa-check' : 'fa-plus'}"></i>
            </button>
          </div>
          <button class="song-cover-btn" data-id="${Utils.escapeHtml(song.id)}">
            <div class="song-cover">${renderCover(song)}</div>
          </button>
          <div class="song-meta">
            <h3>${Utils.escapeHtml(song.songTitle)}</h3>
            <p class="artist">${Utils.escapeHtml(song.artistName)}</p>
            <div class="song-tags">
              ${song.year ? `<span>${Utils.escapeHtml(song.year)}</span>` : ''}
              ${song.songTime ? `<span>${Utils.escapeHtml(song.songTime)}</span>` : ''}
              ${song.musicStyle ? `<span>${Utils.escapeHtml(song.musicStyle)}</span>` : ''}
            </div>
          </div>
          <div class="song-preview">${renderPreview(song)}</div>
          <div class="song-actions">
            <button class="btn btn-secondary btn-sm details-btn" data-id="${Utils.escapeHtml(song.id)}">
              <i class="fa-solid fa-circle-info"></i> Details
            </button>
            <button class="btn btn-primary btn-sm add-queue-btn" data-id="${Utils.escapeHtml(song.id)}">
              <i class="fa-solid fa-list-ul"></i> ${inQueue ? 'Queued' : 'Queue'}
            </button>
          </div>
        </article>`;
    }).join('');

    catalogGrid.querySelectorAll('.row-checkbox').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) selectedIds.add(cb.dataset.id);
        else selectedIds.delete(cb.dataset.id);
        cb.closest('.song-card').classList.toggle('selected', cb.checked);
        updateStats();
      });
    });

    catalogGrid.querySelectorAll('.details-btn, .song-cover-btn').forEach((btn) => {
      btn.addEventListener('click', () => openDetail(btn.dataset.id));
    });

    catalogGrid.querySelectorAll('.add-queue-btn, .queue-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleQueue(btn.dataset.id);
      });
    });

    AudioPlayer.hydrate(catalogGrid);
  }

  function toggleQueue(id) {
    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    const index = queue.findIndex((q) => q.id === id);
    if (index >= 0) queue.splice(index, 1);
    else queue.push(song);

    saveQueue();
    renderQueue();
    renderCatalog();
    updateStats();
  }

  function renderQueue() {
    if (!queue.length) {
      queueList.innerHTML = '';
      queueEmpty.classList.remove('hidden');
      playQueueBtn.disabled = true;
      return;
    }

    queueEmpty.classList.add('hidden');
    playQueueBtn.disabled = false;

    queueList.innerHTML = queue.map((song, index) => `
      <div class="queue-item" data-id="${Utils.escapeHtml(song.id)}">
        <span class="queue-index">${index + 1}</span>
        <div class="queue-cover">${renderCover(song)}</div>
        <div class="queue-meta">
          <strong>${Utils.escapeHtml(song.songTitle)}</strong>
          <span>${Utils.escapeHtml(song.artistName)}</span>
        </div>
        <div class="queue-item-actions">
          <button class="btn-icon play-one-btn" data-id="${Utils.escapeHtml(song.id)}" title="Play preview">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="btn-icon remove-queue-btn" data-id="${Utils.escapeHtml(song.id)}" title="Remove">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `).join('');

    queueList.querySelectorAll('.remove-queue-btn').forEach((btn) => {
      btn.addEventListener('click', () => toggleQueue(btn.dataset.id));
    });

    queueList.querySelectorAll('.play-one-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        queuePlayIndex = queue.findIndex((s) => s.id === btn.dataset.id);
        playCurrentQueueTrack();
      });
    });
  }

  async function playCurrentQueueTrack() {
    if (queuePlayIndex < 0 || queuePlayIndex >= queue.length) {
      nowPlaying.classList.add('hidden');
      nowPlayingAudio.pause();
      return;
    }

    const song = queue[queuePlayIndex];
    const src = Utils.resolvePreviewUrl(song);
    if (!src) return;

    nowPlayingTitle.textContent = song.songTitle;
    nowPlayingArtist.textContent = song.artistName;
    nowPlayingAudio.dataset.previewSrc = src;
    nowPlayingAudio.dataset.ready = '';
    delete nowPlayingAudio.dataset.bound;
    nowPlayingAudio.removeAttribute('src');
    AudioPlayer.bind(nowPlayingAudio);

    try {
      await AudioPlayer.prepare(nowPlayingAudio);
      await nowPlayingAudio.play();
      nowPlaying.classList.remove('hidden');
    } catch (err) {
      console.warn('Queue preview failed:', err);
    }
  }

  function openDetail(id) {
    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    modalBody.innerHTML = `
      <div class="detail-hero">
        <div class="detail-cover">${renderCover(song)}</div>
        <div>
          <h2>${Utils.escapeHtml(song.songTitle)}</h2>
          <p class="detail-artist">${Utils.escapeHtml(song.artistName)}</p>
          <div class="song-tags">
            ${song.year ? `<span>${Utils.escapeHtml(song.year)}</span>` : ''}
            ${song.songTime ? `<span>${Utils.escapeHtml(song.songTime)}</span>` : ''}
            ${song.musicStyle ? `<span>${Utils.escapeHtml(song.musicStyle)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="detail-preview">
        <label>Preview</label>
        ${renderPreview(song)}
      </div>
      <div class="detail-grid">
        <div><label>Description</label><p>${Utils.escapeHtml(song.description || '—')}</p></div>
        <div><label>Band Members</label><p>${Utils.escapeHtml(song.bandMembers || '—')}</p></div>
        <div><label>Songwriter</label><p>${Utils.escapeHtml(song.songwriter || '—')}</p></div>
        <div><label>Featured Artist</label><p>${Utils.escapeHtml(song.featuredArtist || '—')}</p></div>
        <div><label>Record Label</label><p>${Utils.escapeHtml(song.recordLabel || '—')}</p></div>
        <div><label>Contact E-Mail</label><p>${song.contactEmail ? `<a href="mailto:${Utils.escapeHtml(song.contactEmail)}">${Utils.escapeHtml(song.contactEmail)}</a>` : '—'}</p></div>
        <div><label>Website</label><p>${song.website ? `<a href="${Utils.escapeHtml(song.website)}" target="_blank" rel="noopener">${Utils.escapeHtml(song.website)}</a>` : '—'}</p></div>
      </div>
      <div class="detail-downloads">
        ${song.mp3 ? `<a class="btn btn-secondary" href="${Utils.escapeHtml(song.mp3)}" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> MP3</a>` : ''}
        ${song.wav ? `<a class="btn btn-secondary" href="${Utils.escapeHtml(song.wav)}" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> WAV</a>` : ''}
        <button class="btn btn-primary add-queue-modal-btn" data-id="${Utils.escapeHtml(song.id)}">
          <i class="fa-solid fa-list-ul"></i> Add to Queue
        </button>
      </div>`;

    modalBody.querySelector('.add-queue-modal-btn').addEventListener('click', () => {
      toggleQueue(song.id);
      detailModal.classList.remove('open');
    });

    AudioPlayer.hydrate(modalBody);
    detailModal.classList.add('open');
  }

  async function checkConnection() {
    if (RadioDB.isScriptConfigured()) {
      try {
        await RadioDB.testConnection();
        connectionBanner.className = 'connection-banner success';
        connectionBanner.innerHTML = '<i class="fa-solid fa-circle-check"></i><div><strong>Connected to Google Sheets</strong> via Apps Script</div>';
      } catch (err) {
        connectionBanner.className = 'connection-banner error';
        connectionBanner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><div><strong>Connection issue.</strong> ${Utils.escapeHtml(err.message)}</div>`;
      }
      connectionBanner.classList.remove('hidden');
      return;
    }

    if (RadioDB.isGvizConfigured()) {
      try {
        await RadioDB.testConnection();
        connectionBanner.className = 'connection-banner success';
        connectionBanner.innerHTML = '<i class="fa-solid fa-circle-check"></i><div><strong>Connected to Google Sheets</strong> — live catalog sync</div>';
      } catch (err) {
        connectionBanner.className = 'connection-banner error';
        connectionBanner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><div><strong>Google Sheet error.</strong> ${Utils.escapeHtml(err.message)}</div>`;
      }
      connectionBanner.classList.remove('hidden');
      return;
    }

    connectionBanner.className = 'connection-banner info';
    connectionBanner.innerHTML = '<i class="fa-solid fa-database"></i><div><strong>Using local catalog data.</strong> Add your Google Apps Script URL in <code>js/config.js</code> to connect your sheet.</div>';
    connectionBanner.classList.remove('hidden');
  }

  async function loadSongs() {
    catalogGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading catalog…</p>
      </div>`;

    try {
      allSongs = await RadioDB.getAllSongs();
      populateFilters();
      syncQueueWithStorage();
      filterSongs();
    } catch (err) {
      catalogGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Failed to load catalog: ${Utils.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  function syncQueueWithStorage() {
    const storedIds = JSON.parse(localStorage.getItem(CONFIG.queueKey) || '[]');
    queue = storedIds.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    renderQueue();
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    if (password === CONFIG.password) {
      sessionStorage.setItem(CONFIG.authKey, 'true');
      loginError.classList.remove('show');
      showApp();
    } else {
      loginError.classList.add('show');
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(CONFIG.authKey);
    document.getElementById('password').value = '';
    showLogin();
  });

  searchInput.addEventListener('input', Utils.debounce(filterSongs, 180));
  styleFilter.addEventListener('change', filterSongs);
  yearFilter.addEventListener('change', filterSongs);
  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    styleFilter.value = '';
    yearFilter.value = '';
    filterSongs();
  });

  selectAllBtn.addEventListener('click', () => {
    const allSelected = filteredSongs.every((s) => selectedIds.has(s.id));
    filteredSongs.forEach((s) => {
      if (allSelected) selectedIds.delete(s.id);
      else selectedIds.add(s.id);
    });
    renderCatalog();
    updateStats();
  });

  clearQueueBtn.addEventListener('click', () => {
    queue = [];
    queuePlayIndex = -1;
    saveQueue();
    renderQueue();
    renderCatalog();
    updateStats();
    nowPlaying.classList.add('hidden');
    nowPlayingAudio.pause();
  });

  downloadZipBtn.addEventListener('click', async () => {
    const selected = allSongs.filter((s) => selectedIds.has(s.id));
    if (!selected.length) return;

    downloadZipBtn.disabled = true;
    downloadZipBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Building ZIP…';

    try {
      await RadioDB.downloadZip(selected, downloadFormat.value);
    } catch (err) {
      alert(err.message);
    } finally {
      downloadZipBtn.disabled = selectedIds.size === 0;
      downloadZipBtn.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Download ZIP';
    }
  });

  playQueueBtn.addEventListener('click', () => {
    if (!queue.length) return;
    queuePlayIndex = 0;
    playCurrentQueueTrack();
  });

  skipQueueBtn.addEventListener('click', () => {
    if (!queue.length) return;
    queuePlayIndex += 1;
    if (queuePlayIndex >= queue.length) {
      queuePlayIndex = -1;
      nowPlaying.classList.add('hidden');
      nowPlayingAudio.pause();
      return;
    }
    playCurrentQueueTrack();
  });

  nowPlayingAudio.addEventListener('ended', () => {
    queuePlayIndex += 1;
    if (queuePlayIndex >= queue.length) {
      queuePlayIndex = -1;
      nowPlaying.classList.add('hidden');
      return;
    }
    playCurrentQueueTrack();
  });

  modalClose.addEventListener('click', () => detailModal.classList.remove('open'));
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) detailModal.classList.remove('open');
  });

  if (isAuthenticated()) showApp();
  else showLogin();
})();