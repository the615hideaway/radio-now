(function () {
  const isDemoMode = Demo.isActive();
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const logoutBtn = document.getElementById('logout-btn');
  const searchInput = document.getElementById('search-input');
  const styleFilter = document.getElementById('style-filter');
  const yearFilter = document.getElementById('year-filter');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const catalogGrid = document.getElementById('catalog-grid');
  const spotlightList = document.getElementById('spotlight-list');
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
  let catalogVisibleCount = CONFIG.catalogPageSize || 40;

  function isAuthenticated() {
    return DjAuth.isAuthenticated();
  }

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    if (isDemoMode) {
      Demo.applyMode();
      Demo.bindExit(logoutBtn);
      SiteNav.init('catalog');
    } else {
      DjAuthUI.updateWelcome();
      SiteNav.init('catalog');
      TurnkeyPitch.hideAppPromo();
    }
    updateDownloadSetupNotice();
    loadQueuesFromStorage();
    checkConnection();
    loadSongs();
  }

  function showLogin() {
    loginGate.classList.remove('hidden');
    appShell.classList.add('hidden');
    if (!isDemoMode) TurnkeyPitch.mountCatalogPromo();
  }

  function triggerTrackedDownload(song, format) {
    if (isDemoMode) {
      alert('Sign up for a free DJ account to download MP3 files.');
      return;
    }
    if (!song.mp3) return;
    RadioDB.triggerFileDownload(song.mp3, Utils.safeFilename(song.artistName, song.songTitle, 'mp3'));
    DjActivity.log(song, 'download_mp3', 'mp3');
  }

  function renderWavRequestHtml(song) {
    const mailto = Utils.wavRequestMailto(song);
    const contactLine = song.contactEmail
      ? `<a href="mailto:${Utils.escapeHtml(song.contactEmail)}">${Utils.escapeHtml(song.contactEmail)}</a>`
      : 'the artist or label listed on this track';
    return `
      <div class="detail-wav-request">
        <label><i class="fa-solid fa-envelope"></i> Need WAV for airplay?</label>
        <p>Radio Now turn-key folders include <strong>MP3</strong>, cover art, and a one-sheet PDF. Broadcast WAV files are available on request — contact ${contactLine}.</p>
        ${mailto
    ? `<a href="${Utils.escapeHtml(mailto)}" class="btn btn-secondary detail-wav-request-btn">
            <i class="fa-solid fa-paper-plane"></i> Email WAV request
          </a>`
    : ''}
      </div>`;
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
      <button type="button" class="btn btn-secondary preview-trigger-btn ${isPlaying ? 'is-playing' : ''}" data-id="${Utils.escapeHtml(song.id)}">
        <i class="fa-solid ${isPlaying ? 'fa-volume-high' : 'fa-play'}"></i>
        ${isPlaying ? 'Playing' : 'Play Preview'}
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

    filteredSongs = Spotlight.sortSongs(filteredSongs);
    filteredSongs = DjFavorites.sortSongs(filteredSongs);

    if (expandedDetailId && !filteredSongs.some((s) => s.id === expandedDetailId)) {
      expandedDetailId = null;
      hideDetailPanel();
    }

    catalogVisibleCount = CONFIG.catalogPageSize || 40;
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
        ${renderWavRequestHtml(song)}
        <div class="detail-downloads">
          ${isDemoMode ? Demo.salesNoteHtml() : (isAuthenticated() ? '' : TurnkeyPitch.detailNoteHtml(false))}
          <button class="btn btn-secondary download-onesheet-btn" type="button">
            <i class="fa-solid fa-file-pdf"></i> Download One-Sheet
          </button>
          ${song.mp3 ? `<button type="button" class="btn btn-secondary download-track-btn" data-format="mp3"><i class="fa-solid fa-download"></i> MP3</button>` : ''}
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
      btn.addEventListener('click', () => triggerTrackedDownload(song, 'mp3'));
    });

    const downloadBtn = detailPanel.querySelector('.download-onesheet-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        const originalHtml = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating PDF…';
        try {
          await OneSheet.downloadOneSheet(song);
          if (!isDemoMode) DjActivity.log(song, 'download_onesheet', 'pdf');
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

  function renderCatalogRow(song) {
    const isPlaying = currentPreviewId === song.id;
    const isOpen = expandedDetailId === song.id;
    const badge = Spotlight.badge(song);
    const hasPreview = AudioPlayer.hasPreview(song);

    return `
      <article class="catalog-row ${isOpen ? 'is-open' : ''} ${isPlaying ? 'is-previewing' : ''}" data-id="${Utils.escapeHtml(song.id)}">
        <div class="catalog-row-cover" aria-hidden="true">${renderCover(song)}</div>
        <div class="catalog-row-main">
          <p class="catalog-row-line">
            <span class="catalog-row-artist">${Utils.escapeHtml(song.artistName || 'Unknown Artist')}</span>
            <span class="catalog-row-sep" aria-hidden="true">—</span>
            <span class="catalog-row-title">${Utils.escapeHtml(song.songTitle || 'Untitled')}</span>
          </p>
          ${badge ? `<span class="catalog-row-badge">${Utils.escapeHtml(badge)}</span>` : ''}
        </div>
        <div class="catalog-row-actions">
          ${hasPreview ? `
            <button
              type="button"
              class="btn-icon preview-trigger-btn ${isPlaying ? 'is-playing' : ''}"
              data-id="${Utils.escapeHtml(song.id)}"
              title="${isPlaying ? 'Playing preview' : 'Play preview'}"
              aria-label="${isPlaying ? 'Playing preview' : 'Play preview'}"
            >
              <i class="fa-solid ${isPlaying ? 'fa-volume-high' : 'fa-play'}" aria-hidden="true"></i>
            </button>` : `
            <span class="catalog-row-no-preview" title="No preview available">—</span>`}
          <button
            type="button"
            class="btn btn-secondary btn-sm details-btn ${isOpen ? 'active' : ''}"
            data-id="${Utils.escapeHtml(song.id)}"
          >
            Song Details
          </button>
        </div>
      </article>`;
  }

  function bindCatalogRows(root) {
    if (!root) return;

    root.querySelectorAll('.details-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        openDetail(btn.dataset.id);
      });
    });

    bindPreviewButtons(root);
  }

  function renderCatalog() {
    if (!filteredSongs.length) {
      if (spotlightList) {
        spotlightList.classList.add('hidden');
        spotlightList.innerHTML = '';
      }
      catalogGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-music"></i>
          <p>No songs match your search.</p>
        </div>`;
      return;
    }

    const spotlightSongs = filteredSongs.filter((song) => Spotlight.score(song) > 0);
    const catalogSongs = filteredSongs.filter((song) => Spotlight.score(song) === 0);

    if (spotlightList) {
      if (spotlightSongs.length) {
        spotlightList.classList.remove('hidden');
        spotlightList.innerHTML = `
          <div class="catalog-spotlight-header">
            <h2>Spotlight</h2>
          </div>
          <div class="catalog-list-inner">
            ${spotlightSongs.map((song) => renderCatalogRow(song)).join('')}
          </div>`;
        bindCatalogRows(spotlightList);
      } else {
        spotlightList.classList.add('hidden');
        spotlightList.innerHTML = '';
      }
    }

    if (catalogSongs.length) {
      const pageSize = CONFIG.catalogPageSize || 40;
      const visibleSongs = catalogSongs.slice(0, catalogVisibleCount);
      const hiddenCount = catalogSongs.length - visibleSongs.length;
      const loadMoreHtml = hiddenCount > 0
        ? `<div class="catalog-load-more">
            <button type="button" class="btn btn-secondary" id="catalog-load-more-btn">
              Show ${Math.min(pageSize, hiddenCount)} more (${hiddenCount} remaining)
            </button>
          </div>`
        : '';

      catalogGrid.innerHTML = `
        ${spotlightSongs.length ? '<div class="catalog-list-header"><h2>All Tracks</h2></div>' : ''}
        <div class="catalog-list-inner">
          ${visibleSongs.map((song) => renderCatalogRow(song)).join('')}
        </div>
        ${loadMoreHtml}`;

      const loadMoreBtn = catalogGrid.querySelector('#catalog-load-more-btn');
      loadMoreBtn?.addEventListener('click', () => {
        catalogVisibleCount += pageSize;
        renderCatalog();
      });
    } else {
      catalogGrid.innerHTML = '';
    }

    bindCatalogRows(catalogGrid);
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

  if (isDemoMode) {
    showApp();
  } else {
    DjAuthUI.init({ onAuthenticated: showApp });
    SiteNav.bindLogout(logoutBtn, showLogin);
    if (DjAuth.isAuthenticated()) showApp();
    else showLogin();
  }

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
    if (isDemoMode) {
      alert('Sign up for a free DJ account to download MP3 ZIP files.');
      return;
    }
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
      DjActivity.logMany(downloadQueue, 'downloaded', zipFormat);
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

})();