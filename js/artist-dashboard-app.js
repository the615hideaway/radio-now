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
  let managedProfiles = [];
  let dashboardData = null;

  function normalizeArtistName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function songsForArtist(artistName, songs) {
    const target = normalizeArtistName(artistName);
    if (!target) return [];
    return songs.filter((song) => normalizeArtistName(song.artistName) === target);
  }

  function songsForLabel(labelName, songs) {
    const target = normalizeArtistName(labelName);
    if (!target) return [];
    return songs.filter((song) => normalizeArtistName(song.recordLabel) === target);
  }

  function songsForAccount(account, songs) {
    if (!account) return [];
    if (String(account.accountType || '').toLowerCase() === 'label') {
      return songsForLabel(account.artistName, songs);
    }
    return songsForArtist(account.artistName, songs);
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
    const isLabel = options.isLabel;

    if (artistDisplayName) {
      if (isLabel) {
        artistDisplayName.textContent = name ? `${name} label dashboard` : 'Your label dashboard';
      } else {
        artistDisplayName.textContent = name || 'Your artist dashboard';
      }
    }

    if (dashboardSubtitle) {
      if (options.demo) {
        dashboardSubtitle.textContent = 'Read-only preview of a real artist dashboard. Create your account to track your own downloads and share promo folders.';
        return;
      }

      if (isLabel) {
        dashboardSubtitle.textContent = name
          ? `${name} — submit new releases, download promo folders, and track DJ activity for your roster.`
          : 'Submit new releases, download promo folders, and track DJ activity for your roster.';
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

  function formatChartRank(rank) {
    if (!rank || rank < 1) return '—';
    return `#${rank}`;
  }

  function renderChartHistory(items) {
    const panel = document.getElementById('chart-history-panel');
    const content = document.getElementById('chart-history-content');
    if (!panel || !content) return;

    if (!items?.length) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    content.innerHTML = `
      <div class="chart-history-table-wrap">
        <table class="chart-history-table">
          <thead>
            <tr>
              <th>Song</th>
              <th>Best week</th>
              <th>Best month</th>
              <th>Milestones</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => {
              const milestones = [];
              if (item.hitTop1) milestones.push('<span class="chart-milestone chart-milestone--1">#1</span>');
              if (item.hitTop5) milestones.push('<span class="chart-milestone chart-milestone--5">Top 5</span>');
              if (item.hitTop10) milestones.push('<span class="chart-milestone chart-milestone--10">Top 10</span>');
              return `
              <tr>
                <td><strong>${Utils.escapeHtml(item.songTitle || 'Untitled')}</strong></td>
                <td>${formatChartRank(item.bestWeekRank)}${item.bestWeekPeriod ? ` <span class="muted">${Utils.escapeHtml(item.bestWeekPeriod)}</span>` : ''}</td>
                <td>${formatChartRank(item.bestMonthRank)}${item.bestMonthPeriod ? ` <span class="muted">${Utils.escapeHtml(item.bestMonthPeriod)}</span>` : ''}</td>
                <td class="chart-milestones">${milestones.join(' ') || '<span class="muted">—</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderLabelAccess(items, onRevoke) {
    const panel = document.getElementById('label-access-panel');
    const list = document.getElementById('label-access-list');
    if (!panel || !list) return;

    if (!items?.length) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    list.innerHTML = `
      <div class="label-access-list">
        ${items.map((item) => `
          <article class="label-access-item">
            <div>
              <strong>${Utils.escapeHtml(item.labelName || 'Label')}</strong>
              <p class="muted">Access since ${Utils.escapeHtml(ArtistActivity.formatTimestamp(item.grantedAt))}</p>
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-sm revoke-label-btn"
              data-label-id="${Utils.escapeHtml(item.labelAccountId)}"
            >
              Remove access
            </button>
          </article>`).join('')}
      </div>`;

    list.querySelectorAll('.revoke-label-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Remove ${btn.closest('.label-access-item')?.querySelector('strong')?.textContent || 'this label'}? They will lose access to submit songs and view your dashboard data.`)) {
          return;
        }
        btn.disabled = true;
        try {
          await onRevoke(btn.dataset.labelId);
        } catch (err) {
          alert(err.message || 'Could not remove label access.');
          btn.disabled = false;
        }
      });
    });
  }

  function renderLabelRoster(items) {
    const panel = document.getElementById('label-roster-panel');
    const list = document.getElementById('label-roster-list');
    if (!panel || !list) return;

    panel.classList.remove('hidden');

    if (!items?.length) {
      list.innerHTML = `
        <div class="empty-state dj-empty-state">
          <i class="fa-solid fa-users"></i>
          <p>No artist profiles yet. Create one below — artists can claim it later and keep their chart history.</p>
        </div>`;
      return;
    }

    list.innerHTML = `
      <div class="label-roster-list">
        ${items.map((entry) => {
          const profile = entry.profile || {};
          const status = profile.ownershipStatus === 'claimed' ? 'Claimed by artist' : 'Unclaimed — artist can claim';
          return `
          <article class="label-roster-item">
            <div>
              <strong>${Utils.escapeHtml(profile.artistName || 'Artist')}</strong>
              <p class="muted">${Utils.escapeHtml(status)}</p>
            </div>
          </article>`;
        }).join('')}
      </div>`;
  }

  function updateSubmitArtistOptions() {
    const datalist = document.getElementById('submit-artist-options');
    if (!datalist) return;

    const names = managedProfiles
      .map((entry) => entry.profile?.artistName)
      .filter(Boolean);

    datalist.innerHTML = names
      .map((name) => `<option value="${Utils.escapeHtml(name)}"></option>`)
      .join('');
  }

  async function handleRevokeLabelAccess(labelAccountId) {
    const result = await ArtistAuth.revokeLabelAccess(labelAccountId);
    renderLabelAccess(result.labelAccess || [], handleRevokeLabelAccess);
  }

  function bindCreateProfileForm() {
    const form = document.getElementById('create-profile-form');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    const errorEl = document.getElementById('create-profile-error');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl?.classList.remove('show');

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating…';

      try {
        await ArtistAuth.createArtistProfile({
          artistName: document.getElementById('create-profile-artist-name')?.value || '',
          claimEmail: document.getElementById('create-profile-claim-email')?.value || '',
        });
        form.reset();
        await loadDashboard();
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.add('show');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    });
  }

  function configureSongSubmitForm(account) {
    const panel = document.getElementById('song-submit-panel');
    const form = document.getElementById('song-submit-form');
    if (!panel || !form || isDemoMode || !account) {
      panel?.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');

    const isLabel = String(account.accountType || '').toLowerCase() === 'label';
    const artistInput = document.getElementById('submit-artist-name');
    const labelInput = document.getElementById('submit-record-label');
    const labelField = document.getElementById('submit-label-field');
    const contactInput = document.getElementById('submit-contact-email');

    updateSubmitArtistOptions();

    if (artistInput) {
      if (isLabel) {
        artistInput.readOnly = false;
        artistInput.value = managedProfiles.length === 1 ? (managedProfiles[0].profile?.artistName || '') : '';
        artistInput.placeholder = 'Pick a roster artist or type name';
      } else {
        artistInput.readOnly = true;
        artistInput.value = account.artistName || '';
      }
    }

    if (labelField && labelInput) {
      if (isLabel) {
        labelField.classList.remove('hidden');
        labelInput.readOnly = true;
        labelInput.value = account.artistName || '';
      } else {
        labelField.classList.add('hidden');
        labelInput.value = '';
      }
    }

    if (contactInput && !contactInput.value && account.email) {
      contactInput.value = account.email;
    }
  }

  function bindSongSubmitForm() {
    const form = document.getElementById('song-submit-form');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    const errorEl = document.getElementById('song-submit-error');
    const successEl = document.getElementById('song-submit-success');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl?.classList.remove('show');
      successEl?.classList.add('hidden');

      const mp3 = document.getElementById('submit-mp3-link')?.value || '';
      const wav = document.getElementById('submit-wav-link')?.value || '';
      if (!mp3 && !wav) {
        if (errorEl) {
          errorEl.textContent = 'Add at least one audio link (MP3 or WAV Google Drive link).';
          errorEl.classList.add('show');
        }
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

      try {
        const result = await ArtistAuth.submitSong({
          artistName: document.getElementById('submit-artist-name')?.value || '',
          songTitle: document.getElementById('submit-song-title')?.value || '',
          year: document.getElementById('submit-year')?.value || '',
          musicStyle: document.getElementById('submit-music-style')?.value || '',
          songwriter: document.getElementById('submit-songwriter')?.value || '',
          recordLabel: document.getElementById('submit-record-label')?.value || '',
          description: document.getElementById('submit-description')?.value || '',
          website: document.getElementById('submit-website')?.value || '',
          contactEmail: document.getElementById('submit-contact-email')?.value || '',
          mp3Link: mp3,
          wavLink: wav,
          coverLink: document.getElementById('submit-cover-link')?.value || '',
        });

        form.reset();
        configureSongSubmitForm(ArtistAuth.getArtist());

        if (successEl) {
          const submission = result.submission || {};
          successEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>${Utils.escapeHtml(submission.songTitle || 'Song')}</strong> submitted — Radio Now will review and add it to the catalog.`;
          successEl.classList.remove('hidden');
        }
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.add('show');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    });
  }

  async function loadPromoFolders(artistName, account) {
    if (!artistPromoContent) return;

    artistPromoContent.innerHTML = `
      <div class="empty-state dj-empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading your promo folders…</p>
      </div>`;

    try {
      const allSongs = await RadioDB.getAllSongs();
      mySongs = account
        ? songsForAccount(account, allSongs)
        : songsForArtist(artistName, allSongs);
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
          <p>No spins logged yet on Radio Now. Share your turn-key ZIP folders above with programmers — spins show up when DJs download from the catalog.</p>
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
    const isLabel = String(artist?.accountType || '').toLowerCase() === 'label';

    setArtistHeader(artistName, { demo: isDemoMode, isLabel });
    configureSongSubmitForm(artist);
    bindSongSubmitForm();

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

    if (artistName) loadPromoFolders(artistName, artist);

    try {
      const data = isDemoMode
        ? await ArtistActivity.fetchDemoDashboard()
        : await ArtistActivity.fetchDashboard();

      const resolvedAccount = data.artist || artist;
      const resolvedName = resolvedAccount?.artistName || artistName;
      const resolvedIsLabel = String(resolvedAccount?.accountType || '').toLowerCase() === 'label';
      if (resolvedName) {
        setArtistHeader(resolvedName, { demo: isDemoMode, isLabel: resolvedIsLabel });
        if (!isDemoMode) {
          ArtistAuth.updateArtistProfile(resolvedAccount);
          ArtistAuthUI.updateWelcome();
          configureSongSubmitForm(ArtistAuth.getArtist());
          SiteNav.init('artistDashboard');
        }
        if (!mySongs.length || normalizeArtistName(resolvedName) !== normalizeArtistName(artistName)) {
          loadPromoFolders(resolvedName, resolvedAccount);
        }
      }

      dashboardData = data;
      managedProfiles = data.managedProfiles || [];

      renderStats(data.stats || {});
      renderHistory(data.activity || []);
      renderChartHistory(data.chartHistory || []);
      renderLabelAccess(data.labelAccess || [], handleRevokeLabelAccess);

      if (resolvedIsLabel) {
        renderLabelRoster(managedProfiles);
        bindCreateProfileForm();
        configureSongSubmitForm(ArtistAuth.getArtist());
      }

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