(function () {
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const logoutBtn = document.getElementById('logout-btn');
  const artistProfile = document.getElementById('artist-profile');
  const artistSongs = document.getElementById('artist-songs');
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
  let artist = null;
  let queue = [];
  let downloadQueue = [];
  let queuePlayIndex = -1;
  let currentPreviewId = null;

  function getArtistSlug() {
    return new URLSearchParams(window.location.search).get('slug') || '';
  }

  function isAuthenticated() {
    return DjAuth.isAuthenticated();
  }

  function updateDownloadSetupNotice() {
    const notice = document.getElementById('download-setup-notice');
    if (!notice) return;
    notice.classList.toggle('hidden', RadioDB.isScriptConfigured());
  }

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    DjAuthUI.updateWelcome();
    updateDownloadSetupNotice();
    loadArtist();
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

  function artistQueuedCount() {
    if (!artist) return 0;
    return artist.songs.filter((song) => queue.some((q) => q.id === song.id)).length;
  }

  function allArtistSongsQueued() {
    return artist && artist.songs.length > 0 && artistQueuedCount() === artist.songs.length;
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
      renderSongs();
    } catch (err) {
      console.warn('Preview failed:', err);
    }
  }

  function renderProfile() {
    if (!artist) return;

    const queued = artistQueuedCount();
    document.title = `${artist.name} — Radio Now`;

    artistProfile.innerHTML = `
      <div class="artist-profile-hero">
        <div class="artist-profile-cover">${renderCover(artist.coverSong)}</div>
        <div class="artist-profile-info">
          <h1>${Utils.escapeHtml(artist.name)}</h1>
          <p class="artist-profile-meta">
            <span>${artist.songCount} song${artist.songCount === 1 ? '' : 's'}</span>
            ${artist.maxYear ? `<span>Latest release ${artist.maxYear}</span>` : ''}
            <span>${queued} in DJ queue</span>
          </p>
          ${artist.website ? `<a class="artist-website" href="${Utils.escapeHtml(artist.website)}" target="_blank" rel="noopener">${Utils.escapeHtml(artist.website)}</a>` : ''}
          <div class="artist-profile-actions">
            <button type="button" class="btn btn-primary" id="queue-all-btn">
              <i class="fa-solid fa-list-ul"></i>
              ${allArtistSongsQueued() ? 'All Songs Queued' : 'Queue All Songs'}
            </button>
            ${artist.songs.some((s) => AudioPlayer.hasPreview(s)) ? `
              <button type="button" class="btn btn-secondary" id="play-first-btn">
                <i class="fa-solid fa-play"></i> Play Newest
              </button>` : ''}
          </div>
        </div>
      </div>`;

    artistProfile.querySelector('#queue-all-btn').addEventListener('click', queueAllSongs);

    const playFirstBtn = artistProfile.querySelector('#play-first-btn');
    if (playFirstBtn && artist.songs[0]) {
      playFirstBtn.addEventListener('click', () => playSongPreview(artist.songs[0].id));
    }
  }

  function renderSongRow(song) {
    const inQueue = queue.some((q) => q.id === song.id);
    const inDownload = downloadQueue.some((d) => d.id === song.id);
    const isPlaying = currentPreviewId === song.id;
    const hasPreview = AudioPlayer.hasPreview(song);

    return `
      <div class="profile-song-row ${isPlaying ? 'is-previewing' : ''} ${inQueue ? 'in-queue' : ''}" data-id="${Utils.escapeHtml(song.id)}">
        <div class="profile-song-cover">${renderCover(song)}</div>
        <div class="profile-song-meta">
          <strong>${Utils.escapeHtml(song.songTitle)}</strong>
          <span>
            ${song.year ? Utils.escapeHtml(song.year) : ''}
            ${song.musicStyle ? ` · ${Utils.escapeHtml(song.musicStyle)}` : ''}
            ${song.songTime ? ` · ${Utils.escapeHtml(song.songTime)}` : ''}
          </span>
        </div>
        <div class="profile-song-actions">
          ${hasPreview ? `
            <button type="button" class="btn btn-secondary btn-sm preview-trigger-btn ${isPlaying ? 'is-playing' : ''}" data-id="${Utils.escapeHtml(song.id)}">
              <i class="fa-solid ${isPlaying ? 'fa-volume-high' : 'fa-play'}"></i> Play
            </button>` : ''}
          <button type="button" class="btn btn-primary btn-sm add-queue-btn ${inQueue ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}">
            <i class="fa-solid ${inQueue ? 'fa-check' : 'fa-plus'}"></i> ${inQueue ? 'Queued' : 'Queue'}
          </button>
          <button type="button" class="btn btn-secondary btn-sm download-toggle ${inDownload ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}">
            <i class="fa-solid fa-download"></i>
          </button>
        </div>
      </div>`;
  }

  function renderSongs() {
    if (!artist) return;

    artistSongs.innerHTML = `
      <div class="profile-songs-header">
        <h2>Songs <span class="profile-songs-count">(${artist.songCount})</span></h2>
        <p class="profile-songs-note">Newest releases listed first.</p>
      </div>
      <div class="profile-song-list">
        ${artist.songs.map((song) => renderSongRow(song)).join('')}
      </div>`;

    renderProfile();

    artistSongs.querySelectorAll('.preview-trigger-btn').forEach((btn) => {
      btn.addEventListener('click', () => playSongPreview(btn.dataset.id));
    });

    artistSongs.querySelectorAll('.add-queue-btn').forEach((btn) => {
      btn.addEventListener('click', () => toggleQueue(btn.dataset.id));
    });

    artistSongs.querySelectorAll('.download-toggle').forEach((btn) => {
      btn.addEventListener('click', () => toggleDownloadQueue(btn.dataset.id));
    });
  }

  function queueAllSongs() {
    if (!artist) return;

    artist.songs.forEach((song) => {
      if (!queue.some((q) => q.id === song.id)) queue.push(song);
    });

    saveQueue();
    renderQueue();
    renderSongs();
  }

  function toggleQueue(id) {
    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    const index = queue.findIndex((q) => q.id === id);
    if (index >= 0) queue.splice(index, 1);
    else queue.push(song);

    saveQueue();
    renderQueue();
    renderSongs();
  }

  function toggleDownloadQueue(id) {
    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    const index = downloadQueue.findIndex((d) => d.id === id);
    if (index >= 0) downloadQueue.splice(index, 1);
    else downloadQueue.push(song);

    saveDownloadQueue();
    renderDownloadQueue();
    renderSongs();
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
      renderSongs();
      return;
    }

    await playSongPreview(queue[queuePlayIndex].id, queuePlayIndex);
  }

  async function loadArtist() {
    const slug = getArtistSlug();
    artistProfile.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading artist…</p>
      </div>`;
    artistSongs.innerHTML = '';

    try {
      allSongs = await RadioDB.getAllSongs();
      const artists = Utils.groupSongsByArtist(allSongs);
      artist = artists.find((entry) => entry.slug === slug);

      if (!artist) {
        artistProfile.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>Artist not found. <a href="artists.html">Back to all artists</a></p>
          </div>`;
        return;
      }

      syncQueuesFromSongs();
      renderProfile();
      renderSongs();
    } catch (err) {
      artistProfile.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Failed to load artist: ${Utils.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  DjAuthUI.init({ onAuthenticated: showApp });
  DjAuthUI.bindLogout(logoutBtn, showLogin);

  clearQueueBtn.addEventListener('click', () => {
    queue = [];
    queuePlayIndex = -1;
    currentPreviewId = null;
    saveQueue();
    renderQueue();
    renderSongs();
    nowPlaying.classList.add('hidden');
  });

  clearDownloadBtn.addEventListener('click', () => {
    downloadQueue = [];
    saveDownloadQueue();
    renderDownloadQueue();
    renderSongs();
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
      renderSongs();
      return;
    }
    playCurrentQueueTrack();
  });

  if (isAuthenticated()) showApp();
  else showLogin();
})();