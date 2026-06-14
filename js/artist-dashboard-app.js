(function () {
  const isDemoMode = Demo.isActive();
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const logoutBtn = document.getElementById('logout-btn');
  const artistDisplayName = document.getElementById('artist-display-name');
  const dashboardSubtitle = document.getElementById('dashboard-subtitle');
  const dashboardStats = document.getElementById('dashboard-stats');
  const dashboardHistory = document.getElementById('dashboard-history');
  const historyCount = document.getElementById('history-count');
  const artistPromoContent = document.getElementById('artist-promo-content');
  const artistPromoSetupNotice = document.getElementById('artist-promo-setup-notice');

  let mySongs = [];

  function normalizeArtistName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function songsForArtist(artistName, songs) {
    const target = normalizeArtistName(artistName);
    if (!target) return [];
    return songs.filter((song) => normalizeArtistName(song.artistName) === target);
  }

  function renderCover(song) {
    const url = Utils.resolveCoverUrl(song);
    if (url) {
      return `<img src="${Utils.escapeHtml(url)}" alt="" loading="lazy" onerror="this.classList.add('broken')">`;
    }
    return '<div class="cover-fallback"><i class="fa-solid fa-compact-disc"></i></div>';
  }

  function updatePromoSetupNotice() {
    if (!artistPromoSetupNotice) return;
    artistPromoSetupNotice.classList.toggle('hidden', RadioDB.isScriptConfigured());
  }

  function setArtistHeader(artistName, options = {}) {
    const name = String(artistName || '').trim();
    if (artistDisplayName) {
      artistDisplayName.textContent = name || 'Your artist dashboard';
    }

    if (dashboardSubtitle) {
      if (options.demo) {
        dashboardSubtitle.textContent = 'Read-only preview of a real artist dashboard. Create your account to track your own downloads and share promo folders.';
        return;
      }

      dashboardSubtitle.textContent = name
        ? `${name} — download turn-key promo folders and track when DJs grab your music on Radio Now.`
        : 'Download your turn-key promo folders and track when DJs grab your music on Radio Now.';
    }
  }

  function renderPromoFolders(artistName) {
    if (!artistPromoContent) return;

    if (!mySongs.length) {
      artistPromoContent.innerHTML = `
        <div class="empty-state dj-empty-state">
          <i class="fa-solid fa-folder-open"></i>
          <p>No promo folders yet for <strong>${Utils.escapeHtml(artistName)}</strong>. After you pay and Radio Now adds your song to the catalog, your turn-key ZIP downloads will show up here.</p>
        </div>`;
      return;
    }

    const previewSong = isDemoMode ? mySongs[0] : null;
    const demoNote = isDemoMode
      ? `<p class="artist-promo-demo-note">Demo preview — download one sample one-sheet for <strong>${Utils.escapeHtml(previewSong?.songTitle || 'your music')}</strong>. Create an account for full turn-key promo ZIPs with audio and cover art.</p>`
      : '';
    const downloadAllLabel = `Download All (${mySongs.length} song${mySongs.length === 1 ? '' : 's'})`;
    const filesHint = isDemoMode
      ? 'Included in your turn-key promo folder'
      : 'Song Title - Artist Name.mp3 · .jpg · OneSheet.pdf';

    artistPromoContent.innerHTML = `
      <div class="artist-promo-actions">
        ${demoNote}
        ${isDemoMode ? `
        <button type="button" class="btn btn-primary" id="preview-onesheet-btn">
          <i class="fa-solid fa-file-pdf"></i>
          Preview One-Sheet
        </button>` : `
        <button type="button" class="btn btn-primary" id="download-all-promo-btn">
          <i class="fa-solid fa-file-zipper"></i>
          ${downloadAllLabel}
        </button>`}
      </div>
      <div class="artist-promo-list">
        ${mySongs.map((song) => `
          <article class="artist-promo-item" data-id="${Utils.escapeHtml(song.id)}">
            <div class="artist-promo-cover">${renderCover(song)}</div>
            <div class="artist-promo-copy">
              <h3>${Utils.escapeHtml(song.songTitle || 'Untitled')}</h3>
              <p>${Utils.escapeHtml(song.year || '')}${song.musicStyle ? ` · ${Utils.escapeHtml(song.musicStyle)}` : ''}</p>
              <p class="artist-promo-files muted">${filesHint}</p>
            </div>
            ${isDemoMode ? '' : `
            <div class="artist-promo-buttons">
              <button type="button" class="btn btn-secondary btn-sm download-promo-btn" data-id="${Utils.escapeHtml(song.id)}">
                <i class="fa-solid fa-file-zipper"></i> ZIP
              </button>
              <button type="button" class="btn btn-ghost btn-sm download-onesheet-btn" data-id="${Utils.escapeHtml(song.id)}">
                <i class="fa-solid fa-file-pdf"></i> One-sheet
              </button>
            </div>`}
          </article>
        `).join('')}
      </div>`;

    artistPromoContent.querySelector('#preview-onesheet-btn')?.addEventListener('click', async () => {
      if (!previewSong) return;
      const btn = document.getElementById('preview-onesheet-btn');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating PDF…';
      try {
        await OneSheet.downloadOneSheet(previewSong);
      } catch (err) {
        alert(err.message || 'Could not download one-sheet PDF.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    artistPromoContent.querySelector('#download-all-promo-btn')?.addEventListener('click', () => {
      downloadPromoZip(mySongs, document.getElementById('download-all-promo-btn'));
    });

    artistPromoContent.querySelectorAll('.download-promo-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const song = mySongs.find((s) => s.id === btn.dataset.id);
        if (song) downloadPromoZip([song], btn);
      });
    });

    artistPromoContent.querySelectorAll('.download-onesheet-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const song = mySongs.find((s) => s.id === btn.dataset.id);
        if (!song) return;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
          await OneSheet.downloadOneSheet(song);
        } catch (err) {
          alert(err.message || 'Could not download one-sheet PDF.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      });
    });
  }

  async function downloadPromoZip(songs, button) {
    if (!songs.length || !button) return;

    const total = songs.length;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing 0/${total}…`;

    try {
      await RadioDB.downloadZip(songs, 'mp3', (progress) => {
        if (progress.status === 'onesheet') {
          button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> One-sheets ${progress.current}/${progress.total}…`;
          return;
        }
        if (progress.status === 'zipping') {
          button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating ZIP…';
          return;
        }
        if (progress.status === 'done') {
          button.innerHTML = '<i class="fa-solid fa-check"></i> ZIP ready';
          return;
        }
        button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing ${progress.current}/${progress.total}…`;
      });
    } catch (err) {
      alert(err.message || 'Could not download promo ZIP.');
    } finally {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }

  async function loadPromoFolders(artistName) {
    if (!artistPromoContent) return;

    artistPromoContent.innerHTML = `
      <div class="empty-state dj-empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading your promo folders…</p>
      </div>`;

    try {
      const allSongs = await RadioDB.getAllSongs();
      mySongs = songsForArtist(artistName, allSongs);
      renderPromoFolders(artistName);
    } catch (err) {
      artistPromoContent.innerHTML = `
        <div class="empty-state dj-empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>${Utils.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    if (isDemoMode) {
      Demo.applyMode();
      Demo.bindExit(logoutBtn);
    } else {
      ArtistAuthUI.updateWelcome();
      SiteNav.init('artistDashboard');
      if (typeof TurnkeyPitch !== 'undefined') TurnkeyPitch.hideAppPromo();
    }
    updatePromoSetupNotice();
    loadDashboard();
  }

  function showLogin() {
    loginGate.classList.remove('hidden');
    appShell.classList.add('hidden');
  }

  function renderStats(stats) {
    const items = [
      { label: 'Total Downloads', value: stats.totalDownloads || 0 },
      { label: 'This Week', value: stats.thisWeek || 0 },
      { label: 'This Month', value: stats.thisMonth || 0 },
      { label: 'Songs Downloaded', value: stats.uniqueSongs || 0 },
    ];

    dashboardStats.innerHTML = items.map((item) => `
      <div class="dj-stat-card">
        <span class="dj-stat-value">${item.value}</span>
        <label>${item.label}</label>
      </div>`).join('');
  }

  function renderHistory(activity) {
    historyCount.textContent = `${activity.length} logged`;

    if (!activity.length) {
      dashboardHistory.innerHTML = `
        <div class="empty-state dj-empty-state">
          <i class="fa-solid fa-tower-broadcast"></i>
          <p>No DJ downloads logged yet on Radio Now. Share your turn-key ZIP folders above with programmers — activity shows up when DJs download from the catalog.</p>
        </div>`;
      return;
    }

    dashboardHistory.innerHTML = `
      <div class="dj-history-list">
        ${activity.map((item) => {
          const djLine = ArtistActivity.formatDjLine(item);
          const djProfile = ArtistActivity.renderDjProfileHtml(item);
          const emailLine = item.djEmail
            ? `<a href="mailto:${Utils.escapeHtml(item.djEmail)}">${Utils.escapeHtml(item.djEmail)}</a>`
            : '<span class="muted">Email not shared</span>';

          return `
          <article class="dj-history-item artist-history-item">
            <div class="dj-history-main">
              <h3>${Utils.escapeHtml(item.songTitle || 'Untitled')}</h3>
              <p>${Utils.escapeHtml(item.artistName || '')}${item.musicStyle ? ` · ${Utils.escapeHtml(item.musicStyle)}` : ''}</p>
              ${djLine ? `<p class="artist-dj-line"><i class="fa-solid fa-tower-broadcast"></i> ${Utils.escapeHtml(djLine)}</p>` : ''}
              ${djProfile}
              <p class="artist-dj-email"><span class="artist-dj-email-label">Contact</span> ${emailLine}</p>
            </div>
            <div class="dj-history-meta">
              <span class="dj-history-type">${Utils.escapeHtml(ArtistActivity.formatLabel(item.eventType, item.format))}</span>
              <span class="dj-history-date">${Utils.escapeHtml(ArtistActivity.formatTimestamp(item.timestamp))}</span>
            </div>
          </article>`;
        }).join('')}
      </div>`;
  }

  async function loadDashboard() {
    const artist = isDemoMode ? null : ArtistAuth.getArtist();
    const artistName = artist?.artistName || '';

    setArtistHeader(artistName, { demo: isDemoMode });

    dashboardStats.innerHTML = `
      <div class="dj-stat-card">
        <span class="dj-stat-value"><i class="fa-solid fa-spinner fa-spin"></i></span>
        <label>Loading</label>
      </div>`;
    dashboardHistory.innerHTML = `
      <div class="empty-state dj-empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading your dashboard…</p>
      </div>`;

    if (artistName) loadPromoFolders(artistName);

    try {
      const data = isDemoMode
        ? await ArtistActivity.fetchDemoDashboard()
        : await ArtistActivity.fetchDashboard();

      const resolvedName = data.artist?.artistName || artistName;
      if (resolvedName) {
        setArtistHeader(resolvedName, { demo: isDemoMode });
        if (!isDemoMode) {
          ArtistAuth.updateArtistProfile(data.artist);
          ArtistAuthUI.updateWelcome();
      SiteNav.init('artistDashboard');
        }
        if (!mySongs.length || normalizeArtistName(resolvedName) !== normalizeArtistName(artistName)) {
          loadPromoFolders(resolvedName);
        }
      }

      renderStats(data.stats || {});
      renderHistory(data.activity || []);

      const charts = data.charts || {};
      Charts.renderList(
        document.getElementById('dashboard-chart-week'),
        charts.week,
        'No downloads yet this week.',
      );
      Charts.renderList(
        document.getElementById('dashboard-chart-month'),
        charts.month,
        'No downloads yet this month.',
      );
    } catch (err) {
      dashboardStats.innerHTML = '';
      dashboardHistory.innerHTML = `
        <div class="empty-state dj-empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>${Utils.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  if (isDemoMode) {
    showApp();
  } else {
    ArtistAuthUI.init({ onAuthenticated: showApp });
    SiteNav.bindLogout(logoutBtn, showLogin);

    if (ArtistAuth.isAuthenticated()) showApp();
    else showLogin();
  }
})();