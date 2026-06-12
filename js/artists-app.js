(function () {
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const artistSearch = document.getElementById('artist-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const artistsList = document.getElementById('artists-list');
  const artistJumpNav = document.getElementById('artist-jump-nav');
  const statArtists = document.getElementById('stat-artists');
  const statSongs = document.getElementById('stat-songs');
  const statQueue = document.getElementById('stat-queue');
  const connectionBanner = document.getElementById('connection-banner');
  const queueList = document.getElementById('queue-list');
  const queueEmpty = document.getElementById('queue-empty');
  const clearQueueBtn = document.getElementById('clear-queue-btn');
  const downloadList = document.getElementById('download-list');
  const downloadEmpty = document.getElementById('download-empty');
  const clearDownloadBtn = document.getElementById('clear-download-btn');
  const downloadZipBtn = document.getElementById('download-zip-btn');
  const downloadFormat = document.getElementById('download-format');
  const nowPlaying = document.getElementById('now-playing');
  const nowPlayingTitle = document.getElementById('now-playing-title');
  const nowPlayingArtist = document.getElementById('now-playing-artist');
  const playQueueBtn = document.getElementById('play-queue-btn');
  const skipQueueBtn = document.getElementById('skip-queue-btn');

  let allSongs = [];
  let allArtists = [];
  let filteredArtists = [];
  let queue = [];
  let downloadQueue = [];
  let queuePlayIndex = -1;
  let currentPreviewId = null;

  function isAuthenticated() {
    return sessionStorage.getItem(CONFIG.authKey) === 'true';
  }

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    loadSongs();
  }

  function showLogin() {
    loginGate.classList.remove('hidden');
    appShell.classList.add('hidden');
  }

  function saveQueue() {
    localStorage.setItem(CONFIG.queueKey, JSON.stringify(queue.map((s) => s.id)));
  }

  function saveDownloadQueue() {
    localStorage.setItem(CONFIG.downloadQueueKey, JSON.stringify(downloadQueue.map((s) => s.id)));
  }

  function syncQueuesFromSongs() {
    const storedQueueIds = JSON.parse(localStorage.getItem(CONFIG.queueKey) || '[]');
    queue = storedQueueIds.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    renderQueue();

    const storedDownloadIds = JSON.parse(localStorage.getItem(CONFIG.downloadQueueKey) || '[]');
    downloadQueue = storedDownloadIds.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    renderDownloadQueue();
    downloadZipBtn.disabled = downloadQueue.length === 0;
  }

  function renderCover(song) {
    const url = Utils.resolveCoverUrl(song);
    if (url) {
      return `<img src="${Utils.escapeHtml(url)}" alt="" loading="lazy" onerror="this.classList.add('broken')">`;
    }
    return '<div class="cover-fallback"><i class="fa-solid fa-compact-disc"></i></div>';
  }

  async function playSongPreview(id, fromQueueIndex = -1) {
    const song = allSongs.find((s) => s.id === id);
    if (!song || !AudioPlayer.hasPreview(song)) return;

    currentPreviewId = id;
    if (fromQueueIndex >= 0) queuePlayIndex = fromQueueIndex;

    nowPlayingTitle.textContent = song.songTitle;
    nowPlayingArtist.textContent = song.artistName;

    try {
      await AudioPlayer.playSong(song);
      nowPlaying.classList.remove('hidden');
      renderArtists();
    } catch (err) {
      console.warn('Preview failed:', err);
    }
  }

  function renderSongRow(song) {
    const inQueue = queue.some((q) => q.id === song.id);
    const inDownload = downloadQueue.some((d) => d.id === song.id);
    const isPlaying = currentPreviewId === song.id;
    const hasPreview = AudioPlayer.hasPreview(song);

    return `
      <div class="artist-song-row ${isPlaying ? 'is-previewing' : ''}" data-id="${Utils.escapeHtml(song.id)}">
        <div class="artist-song-cover">${renderCover(song)}</div>
        <div class="artist-song-meta">
          <strong>${Utils.escapeHtml(song.songTitle)}</strong>
          <span>
            ${song.year ? `${Utils.escapeHtml(song.year)}` : ''}
            ${song.musicStyle ? ` · ${Utils.escapeHtml(song.musicStyle)}` : ''}
            ${song.songTime ? ` · ${Utils.escapeHtml(song.songTime)}` : ''}
          </span>
        </div>
        <div class="artist-song-actions">
          ${hasPreview ? `
            <button type="button" class="btn-icon preview-trigger-btn ${isPlaying ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}" title="Play preview">
              <i class="fa-solid ${isPlaying ? 'fa-volume-high' : 'fa-play'}"></i>
            </button>` : ''}
          <button type="button" class="btn-icon download-toggle ${inDownload ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}" title="${inDownload ? 'Remove from download queue' : 'Add to download queue'}">
            <i class="fa-solid ${inDownload ? 'fa-check' : 'fa-download'}"></i>
          </button>
          <button type="button" class="btn-icon add-queue-btn ${inQueue ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}" title="${inQueue ? 'Remove from queue' : 'Add to queue'}">
            <i class="fa-solid ${inQueue ? 'fa-check' : 'fa-plus'}"></i>
          </button>
        </div>
      </div>`;
  }

  function renderArtistSection(artist) {
    return `
      <section class="artist-section" id="${Utils.escapeHtml(artist.slug)}">
        <div class="artist-section-header">
          <div class="artist-section-cover">${renderCover(artist.coverSong)}</div>
          <div class="artist-section-info">
            <h2>${Utils.escapeHtml(artist.name)}</h2>
            <p class="artist-section-meta">
              <span>${artist.songCount} song${artist.songCount === 1 ? '' : 's'}</span>
              ${artist.maxYear ? `<span>Latest: ${artist.maxYear}</span>` : ''}
            </p>
            ${artist.website ? `<a class="artist-website" href="${Utils.escapeHtml(artist.website)}" target="_blank" rel="noopener">${Utils.escapeHtml(artist.website)}</a>` : ''}
          </div>
        </div>
        <div class="artist-song-list">
          ${artist.songs.map((song) => renderSongRow(song)).join('')}
        </div>
      </section>`;
  }

  function renderJumpNav() {
    if (!filteredArtists.length) {
      artistJumpNav.classList.add('hidden');
      artistJumpNav.innerHTML = '';
      return;
    }

    artistJumpNav.classList.remove('hidden');
    artistJumpNav.innerHTML = `
      <span class="artist-jump-label">Jump to:</span>
      <div class="artist-jump-pills">
        ${filteredArtists.map((artist) => `
          <a class="artist-jump-pill" href="#${Utils.escapeHtml(artist.slug)}">${Utils.escapeHtml(artist.name)}</a>
        `).join('')}
      </div>`;
  }

  function renderArtists() {
    statArtists.textContent = filteredArtists.length;
    statSongs.textContent = filteredArtists.reduce((sum, artist) => sum + artist.songCount, 0);
    statQueue.textContent = queue.length;

    if (!filteredArtists.length) {
      artistsList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-user-music"></i>
          <p>No artists match your search.</p>
        </div>`;
      renderJumpNav();
      return;
    }

    artistsList.innerHTML = filteredArtists.map((artist) => renderArtistSection(artist)).join('');
    renderJumpNav();
    bindArtistEvents();
  }

  function bindArtistEvents() {
    artistsList.querySelectorAll('.preview-trigger-btn').forEach((btn) => {
      btn.addEventListener('click', () => playSongPreview(btn.dataset.id));
    });

    artistsList.querySelectorAll('.add-queue-btn').forEach((btn) => {
      btn.addEventListener('click', () => toggleQueue(btn.dataset.id));
    });

    artistsList.querySelectorAll('.download-toggle').forEach((btn) => {
      btn.addEventListener('click', () => toggleDownloadQueue(btn.dataset.id));
    });
  }

  function filterArtists() {
    const q = artistSearch.value.trim().toLowerCase();
    filteredArtists = q
      ? allArtists.filter((artist) => artist.name.toLowerCase().includes(q))
      : [...allArtists];
    renderArtists();
  }

  function toggleQueue(id) {
    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    const index = queue.findIndex((q) => q.id === id);
    if (index >= 0) queue.splice(index, 1);
    else queue.push(song);

    saveQueue();
    renderQueue();
    renderArtists();
  }

  function toggleDownloadQueue(id) {
    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    const index = downloadQueue.findIndex((d) => d.id === id);
    if (index >= 0) downloadQueue.splice(index, 1);
    else downloadQueue.push(song);

    saveDownloadQueue();
    renderDownloadQueue();
    renderArtists();
    downloadZipBtn.disabled = downloadQueue.length === 0;
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
        const index = queue.findIndex((s) => s.id === btn.dataset.id);
        playSongPreview(btn.dataset.id, index);
      });
    });
  }

  function renderDownloadQueue() {
    if (!downloadQueue.length) {
      downloadList.innerHTML = '';
      downloadEmpty.classList.remove('hidden');
      return;
    }

    downloadEmpty.classList.add('hidden');
    downloadList.innerHTML = downloadQueue.map((song, index) => `
      <div class="queue-item download-item" data-id="${Utils.escapeHtml(song.id)}">
        <span class="queue-index">${index + 1}</span>
        <div class="queue-cover">${renderCover(song)}</div>
        <div class="queue-meta">
          <strong>${Utils.escapeHtml(song.songTitle)}</strong>
          <span>${Utils.escapeHtml(song.artistName)}</span>
        </div>
        <div class="queue-item-actions">
          <button class="btn-icon remove-download-btn" data-id="${Utils.escapeHtml(song.id)}" title="Remove">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `).join('');

    downloadList.querySelectorAll('.remove-download-btn').forEach((btn) => {
      btn.addEventListener('click', () => toggleDownloadQueue(btn.dataset.id));
    });
  }

  async function playCurrentQueueTrack() {
    if (queuePlayIndex < 0 || queuePlayIndex >= queue.length) {
      currentPreviewId = null;
      nowPlaying.classList.add('hidden');
      renderArtists();
      return;
    }

    await playSongPreview(queue[queuePlayIndex].id, queuePlayIndex);
  }

  async function checkConnection() {
    try {
      const meta = await RadioDB.getCatalogMeta();
      connectionBanner.className = 'connection-banner success';
      connectionBanner.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <div><strong>Catalog loaded from JSON</strong> — ${meta.songCount} songs, last synced ${Utils.formatSyncDate(meta.syncedAt)}.</div>`;
    } catch (err) {
      connectionBanner.className = 'connection-banner error';
      connectionBanner.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div><strong>Catalog JSON missing.</strong> ${Utils.escapeHtml(err.message)}</div>`;
    }
    connectionBanner.classList.remove('hidden');
  }

  async function loadSongs() {
    artistsList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading artists…</p>
      </div>`;

    try {
      allSongs = await RadioDB.getAllSongs();
      allArtists = Utils.groupSongsByArtist(allSongs);
      filteredArtists = [...allArtists];
      syncQueuesFromSongs();
      renderArtists();
      checkConnection();
    } catch (err) {
      artistsList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Failed to load catalog: ${Utils.escapeHtml(err.message)}</p>
        </div>`;
    }
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

  artistSearch.addEventListener('input', Utils.debounce(filterArtists, 180));
  clearSearchBtn.addEventListener('click', () => {
    artistSearch.value = '';
    filterArtists();
  });

  clearQueueBtn.addEventListener('click', () => {
    queue = [];
    queuePlayIndex = -1;
    currentPreviewId = null;
    saveQueue();
    renderQueue();
    renderArtists();
    nowPlaying.classList.add('hidden');
  });

  clearDownloadBtn.addEventListener('click', () => {
    downloadQueue = [];
    saveDownloadQueue();
    renderDownloadQueue();
    renderArtists();
    downloadZipBtn.disabled = true;
  });

  downloadZipBtn.addEventListener('click', async () => {
    if (!downloadQueue.length) return;

    const total = downloadQueue.length;
    downloadZipBtn.disabled = true;
    downloadZipBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing 0/${total}…`;

    try {
      await RadioDB.downloadZip(downloadQueue, downloadFormat.value, (progress) => {
        if (progress.status === 'zipping') {
          downloadZipBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating ZIP…';
          return;
        }
        if (progress.status === 'done') {
          downloadZipBtn.innerHTML = '<i class="fa-solid fa-check"></i> ZIP ready';
          return;
        }
        downloadZipBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing ${progress.current}/${progress.total}…`;
      });
    } catch (err) {
      alert(err.message);
    } finally {
      downloadZipBtn.disabled = downloadQueue.length === 0;
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
      currentPreviewId = null;
      nowPlaying.classList.add('hidden');
      renderArtists();
      return;
    }
    playCurrentQueueTrack();
  });

  if (isAuthenticated()) showApp();
  else showLogin();
})();