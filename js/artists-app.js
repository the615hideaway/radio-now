(function () {
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const artistSearch = document.getElementById('artist-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const artistsGrid = document.getElementById('artists-grid');
  const statArtists = document.getElementById('stat-artists');
  const statSongs = document.getElementById('stat-songs');
  const connectionBanner = document.getElementById('connection-banner');

  let allArtists = [];
  let filteredArtists = [];

  function isAuthenticated() {
    return sessionStorage.getItem(CONFIG.authKey) === 'true';
  }

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    loadArtists();
  }

  function showLogin() {
    loginGate.classList.remove('hidden');
    appShell.classList.add('hidden');
  }

  function renderCover(song) {
    const url = Utils.resolveCoverUrl(song);
    if (url) {
      return `<img src="${Utils.escapeHtml(url)}" alt="" loading="lazy" onerror="this.classList.add('broken')">`;
    }
    return '<div class="cover-fallback"><i class="fa-solid fa-compact-disc"></i></div>';
  }

  function renderArtistCard(artist) {
    return `
      <a class="artist-card" href="artist.html?slug=${encodeURIComponent(artist.slug)}">
        <div class="artist-card-cover">${renderCover(artist.coverSong)}</div>
        <div class="artist-card-body">
          <h3>${Utils.escapeHtml(artist.name)}</h3>
          <p class="artist-card-meta">
            <span>${artist.songCount} song${artist.songCount === 1 ? '' : 's'}</span>
            ${artist.maxYear ? `<span>Latest ${artist.maxYear}</span>` : ''}
          </p>
        </div>
        <span class="artist-card-arrow" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>
      </a>`;
  }

  function renderArtists() {
    statArtists.textContent = filteredArtists.length;
    statSongs.textContent = filteredArtists.reduce((sum, artist) => sum + artist.songCount, 0);

    if (!filteredArtists.length) {
      artistsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-user-music"></i>
          <p>No artists match your search.</p>
        </div>`;
      return;
    }

    artistsGrid.innerHTML = filteredArtists.map((artist) => renderArtistCard(artist)).join('');
  }

  function filterArtists() {
    const q = artistSearch.value.trim().toLowerCase();
    filteredArtists = q
      ? allArtists.filter((artist) => artist.name.toLowerCase().includes(q))
      : [...allArtists];
    renderArtists();
  }

  async function checkConnection() {
    try {
      const meta = await RadioDB.getCatalogMeta();
      connectionBanner.className = 'connection-banner success';
      connectionBanner.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <div><strong>Catalog loaded</strong> — ${meta.songCount} songs, last synced ${Utils.formatSyncDate(meta.syncedAt)}.</div>`;
    } catch (err) {
      connectionBanner.className = 'connection-banner error';
      connectionBanner.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div><strong>Catalog JSON missing.</strong> ${Utils.escapeHtml(err.message)}</div>`;
    }
    connectionBanner.classList.remove('hidden');
  }

  async function loadArtists() {
    artistsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading artists…</p>
      </div>`;

    try {
      const songs = await RadioDB.getAllSongs();
      allArtists = Utils.groupSongsByArtist(songs);
      filteredArtists = [...allArtists];
      renderArtists();
      checkConnection();
    } catch (err) {
      artistsGrid.innerHTML = `
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

  if (isAuthenticated()) showApp();
  else showLogin();
})();