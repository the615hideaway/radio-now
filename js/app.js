(function () {
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const logoutBtn = document.getElementById('logout-btn');
  const searchInput = document.getElementById('search-input');
  const styleFilter = document.getElementById('style-filter');
  const yearFilter = document.getElementById('year-filter');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const catalogGrid = document.getElementById('catalog-grid');
  const statTotal = document.getElementById('stat-total');
  const statQueue = document.getElementById('stat-queue');
  const statDownload = document.getElementById('stat-download');
  const connectionBanner = document.getElementById('connection-banner');
  const queueList = document.getElementById('queue-list');
  const queueEmpty = document.getElementById('queue-empty');
  const clearQueueBtn = document.getElementById('clear-queue-btn');
  const downloadList = document.getElementById('download-list');
  const downloadEmpty = document.getElementById('download-empty');
  const clearDownloadBtn = document.getElementById('clear-download-btn');
  const downloadZipBtn = document.getElementById('download-zip-btn');
  const detailPanel = document.getElementById('detail-panel');
  const nowPlaying = document.getElementById('now-playing');

  const nowPlayingTitle = document.getElementById('now-playing-title');
  const nowPlayingArtist = document.getElementById('now-playing-artist');
  const playQueueBtn = document.getElementById('play-queue-btn');
  const skipQueueBtn = document.getElementById('skip-queue-btn');

  let allSongs = [];
  let filteredSongs = [];
  let queue = [];
  let downloadQueue = [];
  let queuePlayIndex = -1;
  let expandedDetailId = null;
  let currentPreviewId = null;

  function isAuthenticated() {
    return DjAuth.isAuthenticated();
  }

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    DjAuthUI.updateWelcome();
    updateDownloadSetupNotice();
    loadQueuesFromStorage();
    checkConnection();
    loadSongs();
  }

  function showLogin() {
    loginGate.classList.remove('hidden');
    appShell.classList.add('hidden');
  }

  function triggerTrackedDownload(song, format) {
    const url = format === 'wav' ? song.wav : song.mp3;
    if (!url) return;
    RadioDB.triggerFileDownload(url, Utils.safeFilename(song.artistName, song.songTitle, format));
    DjActivity.log(song, format === 'wav' ? 'download_wav' : 'download_mp3', format);
  }

  function saveQueue() {
    localStorage.setItem(CONFIG.queueKey, JSON.stringify(queue.map((s) => s.id)));
  }

  function saveDownloadQueue() {
    localStorage.setItem(CONFIG.downloadQueueKey, JSON.stringify(downloadQueue.map((s) => s.id)));
  }

  function loadQueuesFromStorage() {
    try {
      const ids = JSON.parse(localStorage.getItem(CONFIG.queueKey) || '[]');
      queue = ids.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    } catch {
      queue = [];
    }

    try {
      const ids = JSON.parse(localStorage.getItem(CONFIG.downloadQueueKey) || '[]');
      downloadQueue = ids.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    } catch {
      downloadQueue = [];
    }
  }

  function renderCover(song) {
    const url = Utils.resolveCoverUrl(song);
    if (url) {
      return `<img src="${Utils.escapeHtml(url)}" alt="" loading="lazy" onerror="this.classList.add('broken')">`;
    }
    return '<div class="cover-fallback"><i class="fa-solid fa-compact-disc"></i></div>';
  }

  function renderPlayButton(song) {
    if (!AudioPlayer.hasPreview(song)) {
      return '<span class="muted">No preview available</span>';
    }
    const isPlaying = currentPreviewId === song.id;
    return `
      <button type="button" class="btn btn-secondary btn-full preview-trigger-btn ${isPlaying ? 'is-playing' : ''}" data-id="${Utils.escapeHtml(song.id)}">
        <i class="fa-solid ${isPlaying ? 'fa-volume-high' : 'fa-play'}"></i>
        ${isPlaying ? 'Playing in Bottom Player' : 'Play Preview'}
      </button>`;
  }

  async function playSongPreview(id, fromQueueIndex = -1) {
    const song = allSongs.find((s) => s.id === id);
    if (!song || !AudioPlayer.hasPreview(song)) return;

    currentPreviewId = id;
    if (fromQueueIndex >= 0) queuePlayIndex = fromQueueIndex;

    nowPlayingTitle.textContent = song.songTitle;
    nowPlayingArtist.textContent = song.artistName;

    nowPlaying.classList.remove('hidden');

    const started = await AudioPlayer.playSong(song);
    if (!started) {
      console.warn('Preview failed:', song.songTitle);
    }

    renderCatalog();
    refreshDetailPanelIfOpen();
  }

  function bindPreviewButtons(root) {
    root.querySelectorAll('.preview-trigger-btn').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        const song = allSongs.find((s) => s.id === btn.dataset.id);
        if (song) AudioPlayer.prefetch(song);
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSongPreview(btn.dataset.id);
      });
    });
  }

  function updateDownloadSetupNotice() {
    const notice = document.getElementById('download-setup-notice');
    if (!notice) return;
    notice.classList.toggle('hidden', RadioDB.isScriptConfigured());
  }

  function updateStats() {
    statTotal.textContent = filteredSongs.length;
    statQueue.textContent = queue.length;
    statDownload.textContent = downloadQueue.length;
    downloadZipBtn.disabled = downloadQueue.length === 0;
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

    if (expandedDetailId && !filteredSongs.some((s) => s.id === expandedDetailId)) {
      expandedDetailId = null;
      hideDetailPanel();
    }

    renderCatalog();
    updateStats();
  }

  function hideDetailPanel() {
    detailPanel.classList.add('hidden');
    detailPanel.innerHTML = '';
  }

  function renderDetailPanel(song, shouldScroll = true) {
    const inQueue = queue.some((q) => q.id === song.id);
    const inDownload = downloadQueue.some((d) => d.id === song.id);

    detailPanel.innerHTML = `
      <div class="detail-panel-inner">
        <div class="detail-panel-header">
          <div class="detail-hero">
            <div class="detail-cover">${renderCover(song)}</div>
            <div class="detail-heading">
              <h2>${Utils.escapeHtml(song.songTitle)}</h2>
              <p class="detail-artist">${Utils.escapeHtml(song.artistName)}</p>
              <div class="song-tags">
                ${song.year ? `<span>${Utils.escapeHtml(song.year)}</span>` : ''}
                ${song.songTime ? `<span>${Utils.escapeHtml(song.songTime)}</span>` : ''}
                ${song.musicStyle ? `<span>${Utils.escapeHtml(song.musicStyle)}</span>` : ''}
              </div>
            </div>
          </div>
          <button class="btn btn-ghost detail-close-btn" id="detail-close-btn" aria-label="Close details">
            <i class="fa-solid fa-xmark"></i> Close
          </button>
        </div>
        <div class="detail-preview">
          ${renderPlayButton(song)}
        </div>
        <div class="detail-queue-actions">
          <button class="btn btn-secondary add-download-detail-btn ${inDownload ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}">
            <i class="fa-solid fa-download"></i> ${inDownload ? 'In Download Queue' : 'Add to Download Queue'}
          </button>
          <button class="btn btn-primary add-queue-detail-btn" data-id="${Utils.escapeHtml(song.id)}">
            <i class="fa-solid fa-list-ul"></i> ${inQueue ? 'In DJ Queue' : 'Add to DJ Queue'}
          </button>
        </div>
        <div class="detail-description">
          <label>Description</label>
          <p>${Utils.escapeHtml(song.description || '—')}</p>
        </div>
        <div class="detail-grid">
          <div><label>Band Members</label>${OneSheet.renderBandMembersHtml(song)}</div>
          <div><label>Songwriter</label><p>${Utils.escapeHtml(song.songwriter || '—')}</p></div>
          <div><label>Featured Artist</label><p>${Utils.escapeHtml(song.featuredArtist || '—')}</p></div>
          <div><label>Record Label</label><p>${Utils.escapeHtml(song.recordLabel || '—')}</p></div>
          <div><label>Contact E-Mail</label><p>${song.contactEmail ? `<a href="mailto:${Utils.escapeHtml(song.contactEmail)}">${Utils.escapeHtml(song.contactEmail)}</a>` : '—'}</p></div>
          <div><label>Website</label><p>${song.website ? `<a href="${Utils.escapeHtml(song.website)}" target="_blank" rel="noopener">${Utils.escapeHtml(song.website)}</a>` : '—'}</p></div>
        </div>
        <div class="detail-downloads">
          <button class="btn btn-secondary download-onesheet-btn" type="button">
            <i class="fa-solid fa-file-pdf"></i> Download One-Sheet
          </button>
          ${song.mp3 ? `<button type="button" class="btn btn-secondary download-track-btn" data-format="mp3"><i class="fa-solid fa-download"></i> MP3</button>` : ''}
          ${song.wav ? `<button type="button" class="btn btn-secondary download-track-btn" data-format="wav"><i class="fa-solid fa-download"></i> WAV</button>` : ''}
        </div>
        <div class="detail-panel-footer">
          <button class="btn btn-ghost detail-close-btn detail-close-btn--bottom" aria-label="Close details">
            <i class="fa-solid fa-xmark"></i> Close
          </button>
        </div>
      </div>`;

    detailPanel.querySelectorAll('.detail-close-btn').forEach((btn) => {
      btn.addEventListener('click', closeDetail);
    });
    detailPanel.querySelector('.add-queue-detail-btn').addEventListener('click', () => {
      toggleQueue(song.id);
      renderDetailPanel(allSongs.find((s) => s.id === song.id));
    });
    detailPanel.querySelector('.add-download-detail-btn').addEventListener('click', () => {
      toggleDownloadQueue(song.id);
      renderDetailPanel(allSongs.find((s) => s.id === song.id));
    });

    detailPanel.querySelectorAll('.download-track-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const format = btn.dataset.format;
        if (format === 'wav') {
          const originalHtml = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading WAV…';
          try {
            await RadioDB.downloadSingleTrack(song, 'wav');
            DjActivity.log(song, 'download_wav', 'wav');
          } catch (err) {
            alert(err.message || 'Could not download WAV.');
          } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
          }
          return;
        }
        triggerTrackedDownload(song, format);
      });
    });

    const downloadBtn = detailPanel.querySelector('.download-onesheet-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        const originalHtml = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating PDF…';
        try {
          await OneSheet.downloadOneSheet(song);
          DjActivity.log(song, 'download_onesheet', 'pdf');
        } catch (err) {
          alert(err.message || 'Could not download one-sheet PDF.');
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = originalHtml;
        }
      });
    }

    bindPreviewButtons(detailPanel);
    detailPanel.classList.remove('hidden');
    if (shouldScroll) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function openDetail(id) {
    if (expandedDetailId === id) {
      closeDetail();
      return;
    }

    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    expandedDetailId = id;
    renderDetailPanel(song);
    renderCatalog();
  }

  function closeDetail() {
    expandedDetailId = null;
    hideDetailPanel();
    renderCatalog();
  }

  function refreshDetailPanelIfOpen() {
    if (!expandedDetailId) return;
    const song = allSongs.find((s) => s.id === expandedDetailId);
    if (song) renderDetailPanel(song, false);
    else closeDetail();
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
      const inDownload = downloadQueue.some((d) => d.id === song.id);
      return `
        <article class="song-card ${inDownload ? 'in-download' : ''} ${expandedDetailId === song.id ? 'details-open' : ''} ${currentPreviewId === song.id ? 'is-previewing' : ''}" data-id="${Utils.escapeHtml(song.id)}">
          <div class="song-card-top">
            <div class="song-card-top-actions">
              <button class="btn-icon download-toggle ${inDownload ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}" title="${inDownload ? 'Remove from download queue' : 'Add to download queue'}">
                <i class="fa-solid ${inDownload ? 'fa-check' : 'fa-download'}"></i>
              </button>
              <button class="btn btn-primary btn-sm add-queue-btn top-queue-btn" data-id="${Utils.escapeHtml(song.id)}">
                <i class="fa-solid fa-list-ul"></i> ${inQueue ? 'Queued' : 'Queue'}
              </button>
            </div>
          </div>
          <div class="song-cover">${renderCover(song)}</div>
          <div class="song-meta">
            <h3>${Utils.escapeHtml(song.songTitle)}</h3>
            <p class="artist">${Utils.escapeHtml(song.artistName)}</p>
            <div class="song-tags">
              ${song.year ? `<span>${Utils.escapeHtml(song.year)}</span>` : ''}
              ${song.songTime ? `<span>${Utils.escapeHtml(song.songTime)}</span>` : ''}
              ${song.musicStyle ? `<span>${Utils.escapeHtml(song.musicStyle)}</span>` : ''}
            </div>
          </div>
          <div class="song-preview">${renderPlayButton(song)}</div>
          <div class="song-actions">
            <button class="btn btn-secondary btn-sm details-btn ${expandedDetailId === song.id ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}">
              <i class="fa-solid fa-circle-info"></i> Song Details
            </button>
            <button class="btn btn-secondary btn-sm add-download-btn ${inDownload ? 'active' : ''}" data-id="${Utils.escapeHtml(song.id)}">
              <i class="fa-solid fa-download"></i> ${inDownload ? 'Queued' : 'Download'}
            </button>
          </div>
        </article>`;
    }).join('');

    catalogGrid.querySelectorAll('.details-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetail(btn.dataset.id);
      });
    });

    bindPreviewButtons(catalogGrid);

    catalogGrid.querySelectorAll('.add-queue-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleQueue(btn.dataset.id);
      });
    });

    catalogGrid.querySelectorAll('.add-download-btn, .download-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDownloadQueue(btn.dataset.id);
      });
    });

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
    refreshDetailPanelIfOpen();
    updateStats();
  }

  function toggleDownloadQueue(id) {
    const song = allSongs.find((s) => s.id === id);
    if (!song) return;

    const index = downloadQueue.findIndex((d) => d.id === id);
    if (index >= 0) downloadQueue.splice(index, 1);
    else downloadQueue.push(song);

    saveDownloadQueue();
    renderDownloadQueue();
    renderCatalog();
    refreshDetailPanelIfOpen();
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
      renderCatalog();
      return;
    }

    await playSongPreview(queue[queuePlayIndex].id, queuePlayIndex);
  }

  async function checkConnection() {
    try {
      await RadioDB.getCatalogMeta();
      connectionBanner.classList.add('hidden');
      connectionBanner.innerHTML = '';
    } catch (err) {
      connectionBanner.className = 'connection-banner error';
      connectionBanner.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div><strong>Catalog unavailable.</strong> ${Utils.escapeHtml(err.message)}</div>`;
      connectionBanner.classList.remove('hidden');
    }
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
      syncQueuesWithStorage();
      filterSongs();
    } catch (err) {
      catalogGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Failed to load catalog: ${Utils.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  function syncQueuesWithStorage() {
    const storedQueueIds = JSON.parse(localStorage.getItem(CONFIG.queueKey) || '[]');
    queue = storedQueueIds.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    renderQueue();

    const storedDownloadIds = JSON.parse(localStorage.getItem(CONFIG.downloadQueueKey) || '[]');
    downloadQueue = storedDownloadIds.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
    renderDownloadQueue();
  }

  DjAuthUI.init({ onAuthenticated: showApp });
  DjAuthUI.bindLogout(logoutBtn, showLogin);

  searchInput.addEventListener('input', Utils.debounce(filterSongs, 180));
  styleFilter.addEventListener('change', filterSongs);
  yearFilter.addEventListener('change', filterSongs);
  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    styleFilter.value = '';
    yearFilter.value = '';
    filterSongs();
  });

  clearQueueBtn.addEventListener('click', () => {
    queue = [];
    queuePlayIndex = -1;
    currentPreviewId = null;
    saveQueue();
    renderQueue();
    renderCatalog();
    updateStats();
    nowPlaying.classList.add('hidden');
  });

  clearDownloadBtn.addEventListener('click', () => {
    downloadQueue = [];
    saveDownloadQueue();
    renderDownloadQueue();
    renderCatalog();
    updateStats();
  });

  downloadZipBtn.addEventListener('click', async () => {
    if (!downloadQueue.length) return;

    const total = downloadQueue.length;
    downloadZipBtn.disabled = true;
    downloadZipBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing 0/${total}…`;

    try {
      const zipFormat = 'mp3';
      await RadioDB.downloadZip(downloadQueue, zipFormat, (progress) => {
        if (progress.status === 'onesheet') {
          downloadZipBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Adding PDF one-sheets ${progress.current}/${progress.total}…`;
          return;
        }
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
      DjActivity.logMany(downloadQueue, 'download_zip', zipFormat);
    } catch (err) {
      alert(err.message);
    } finally {
      downloadZipBtn.disabled = downloadQueue.length === 0;
      downloadZipBtn.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Download MP3 ZIP';
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
      renderCatalog();
      return;
    }
    playCurrentQueueTrack();
  });

  if (isAuthenticated()) showApp();
  else showLogin();
})();