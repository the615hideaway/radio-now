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
  let mySubmissions = [];
  let dashboardData = null;
  let editingSubmission = null;
  let existingAssetLinks = { mp3: '', wav: '', cover: '' };

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

  function mountMusicStyleSelect(selected = '') {
    const styles = dashboardData?.musicStyles || SongSubmitConfig?.musicStyles || [];
    const select = document.getElementById('submit-music-style');
    if (!select) return;

    const value = String(selected || '').trim();
    const options = ['<option value="">Select music style</option>'];
    styles.forEach((style) => {
      const sel = style === value ? ' selected' : '';
      options.push(`<option value="${Utils.escapeHtml(style)}"${sel}>${Utils.escapeHtml(style)}</option>`);
    });
    select.innerHTML = options.join('');
    select.required = true;
  }

  function syncIndependentLabel() {
    const independent = document.getElementById('submit-independent');
    const labelInput = document.getElementById('submit-record-label');
    if (!independent || !labelInput) return;

    const isIndependent = independent.checked;
    labelInput.disabled = isIndependent;
    labelInput.required = !isIndependent;
    if (isIndependent) {
      labelInput.value = 'Independent';
    } else if (labelInput.value === 'Independent') {
      labelInput.value = '';
    }
  }

  function bindIndependentLabel() {
    const independent = document.getElementById('submit-independent');
    if (!independent || independent.dataset.bound === 'true') return;
    independent.dataset.bound = 'true';
    independent.addEventListener('change', syncIndependentLabel);
  }

  function renderSubmissionsList() {
    const host = document.getElementById('song-submissions-list');
    if (!host) return;

    const editable = mySubmissions.filter((item) => item.canEdit);
    if (!editable.length) {
      host.classList.add('hidden');
      host.innerHTML = '';
      return;
    }

    host.classList.remove('hidden');
    host.innerHTML = `
      <div class="form-section-label">Your pending submissions</div>
      ${editable.map((item) => `
        <article class="song-submission-item">
          <div>
            <h3>${Utils.escapeHtml(item.songTitle || 'Untitled')}</h3>
            <p>${Utils.escapeHtml(item.artistName || '')}${item.albumName ? ` · Album: ${Utils.escapeHtml(item.albumName)}` : ' · Single'}</p>
            <span class="song-submission-status">${Utils.escapeHtml(item.status || 'pending')}</span>
          </div>
          <button type="button" class="btn btn-secondary" data-edit-submission="${Utils.escapeHtml(item.id)}">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
        </article>
      `).join('')}`;

    host.querySelectorAll('[data-edit-submission]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-submission');
        const submission = mySubmissions.find((item) => item.id === id);
        if (submission) startEditSubmission(submission);
      });
    });
  }

  function setSubmitFormMode(editing) {
    const heading = document.getElementById('song-submit-heading');
    const submitBtn = document.getElementById('song-submit-btn');
    const cancelBtn = document.getElementById('song-cancel-edit-btn');
    const editingId = document.getElementById('submit-editing-id');

    if (heading) {
      heading.innerHTML = editing
        ? '<i class="fa-solid fa-pen"></i> Edit Submission'
        : '<i class="fa-solid fa-cloud-arrow-up"></i> Submit a New Song';
    }
    if (submitBtn) {
      submitBtn.innerHTML = editing
        ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes'
        : '<i class="fa-solid fa-paper-plane"></i> Submit for Review';
    }
    cancelBtn?.classList.toggle('hidden', !editing);
    if (editingId) editingId.value = editing ? (editingSubmission?.id || '') : '';
  }

  function populateSubmissionForm(submission) {
    if (!submission) return;

    document.getElementById('submit-artist-name').value = submission.artistName || '';
    document.getElementById('submit-song-title').value = submission.songTitle || '';
    document.getElementById('submit-year').value = submission.year || '';
    document.getElementById('submit-song-time').value = submission.songTime || '';
    mountMusicStyleSelect(submission.musicStyle || '');
    document.getElementById('submit-songwriter').value = submission.songwriter || '';
    document.getElementById('submit-featured-artist').value = submission.featuredArtist || '';
    document.getElementById('submit-lead-vocals').value = submission.leadVocals || '';

    const harmonies = submission.harmonyVocals || [];
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`submit-harmony-${i}`);
      if (el) el.value = harmonies[i - 1] || '';
    }

    const players = submission.instrumentPlayers || [];
    for (let i = 1; i <= 8; i++) {
      const el = document.getElementById(`submit-instrument-${i}`);
      if (el) el.value = players[i - 1] || '';
    }

    const isIndependent = String(submission.recordLabel || '').toLowerCase() === 'independent';
    const independent = document.getElementById('submit-independent');
    const labelInput = document.getElementById('submit-record-label');
    if (independent) independent.checked = isIndependent;
    if (labelInput) labelInput.value = isIndependent ? '' : (submission.recordLabel || '');
    syncIndependentLabel();

    const releaseType = String(submission.releaseType || '').toLowerCase();
    document.getElementById('submit-release-type').value = releaseType.includes('album') ? 'album_track' : 'single';
    document.getElementById('submit-release-type')?.dispatchEvent(new Event('change'));
    document.getElementById('submit-album-name').value = submission.albumName || '';
    document.getElementById('submit-description').value = submission.description || '';
    document.getElementById('submit-website').value = submission.website || '';
    document.getElementById('submit-contact-email').value = submission.contactEmail || '';

    existingAssetLinks = {
      mp3: submission.mp3Link || '',
      wav: submission.wavLink || '',
      cover: submission.coverLink || '',
    };
    FileUploadField.resetAll(['submit-mp3', 'submit-wav', 'submit-cover']);
    if (existingAssetLinks.mp3) FileUploadField.setOnFileStatus('submit-mp3', 'MP3 on file — choose a new file only if replacing');
    if (existingAssetLinks.wav) FileUploadField.setOnFileStatus('submit-wav', 'WAV on file — choose a new file only if replacing');
    if (existingAssetLinks.cover) FileUploadField.setOnFileStatus('submit-cover', 'Cover on file — choose a new file only if replacing');
  }

  function startEditSubmission(submission) {
    editingSubmission = submission;
    setSubmitFormMode(true);
    populateSubmissionForm(submission);
    document.getElementById('song-submit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelEditSubmission() {
    editingSubmission = null;
    existingAssetLinks = { mp3: '', wav: '', cover: '' };
    const form = document.getElementById('song-submit-form');
    form?.reset();
    FileUploadField.resetAll(['submit-mp3', 'submit-wav', 'submit-cover']);
    setSubmitFormMode(false);
    configureSongSubmitForm(ArtistAuth.getArtist());
  }

  function collectSubmissionFormFields() {
    const independent = !!document.getElementById('submit-independent')?.checked;
    const labelValue = document.getElementById('submit-record-label')?.value || '';

    return {
      artistName: document.getElementById('submit-artist-name')?.value || '',
      songTitle: document.getElementById('submit-song-title')?.value || '',
      year: document.getElementById('submit-year')?.value || '',
      songTime: document.getElementById('submit-song-time')?.value || '',
      musicStyle: document.getElementById('submit-music-style')?.value || '',
      songwriter: document.getElementById('submit-songwriter')?.value || '',
      featuredArtist: document.getElementById('submit-featured-artist')?.value || '',
      leadVocals: document.getElementById('submit-lead-vocals')?.value || '',
      harmonyVocals: [1, 2, 3, 4].map((i) => document.getElementById(`submit-harmony-${i}`)?.value || ''),
      instrumentPlayers: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => document.getElementById(`submit-instrument-${i}`)?.value || ''),
      recordLabel: independent ? 'Independent' : labelValue,
      independent,
      releaseType: document.getElementById('submit-release-type')?.value || 'single',
      albumName: document.getElementById('submit-album-name')?.value || '',
      description: document.getElementById('submit-description')?.value || '',
      website: document.getElementById('submit-website')?.value || '',
      contactEmail: document.getElementById('submit-contact-email')?.value || '',
    };
  }

  function configureSongSubmitForm(account) {
    const panel = document.getElementById('song-submit-panel');
    const form = document.getElementById('song-submit-form');
    if (!panel || !form || isDemoMode || !account) {
      panel?.classList.add('hidden');
      return;
    }

    if (!editingSubmission) {
      panel.classList.remove('hidden');
    }

    const isLabel = String(account.accountType || '').toLowerCase() === 'label';
    const artistInput = document.getElementById('submit-artist-name');
    const labelInput = document.getElementById('submit-record-label');
    const labelField = document.getElementById('submit-label-field');
    const independentWrap = document.getElementById('submit-independent-wrap');
    const contactInput = document.getElementById('submit-contact-email');

    updateSubmitArtistOptions();
    mountMusicStyleSelect();
    bindIndependentLabel();

    if (!editingSubmission && artistInput) {
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
      labelField.classList.remove('hidden');
      if (isLabel) {
        independentWrap?.classList.add('hidden');
        labelInput.readOnly = true;
        labelInput.disabled = false;
        labelInput.required = true;
        if (!editingSubmission) labelInput.value = account.artistName || '';
        const independent = document.getElementById('submit-independent');
        if (independent) independent.checked = false;
      } else {
        independentWrap?.classList.remove('hidden');
        labelInput.readOnly = false;
        syncIndependentLabel();
      }
    }

    if (!editingSubmission && contactInput && !contactInput.value && account.email) {
      contactInput.value = account.email;
    }

    renderSubmissionsList();
  }

  function mountSongUploadFields() {
    const host = document.getElementById('song-upload-fields');
    if (!host || host.dataset.mounted === 'true' || typeof FileUploadField === 'undefined') return;
    host.dataset.mounted = 'true';
    host.innerHTML = [
      FileUploadField.render({
        id: 'submit-mp3',
        label: 'MP3',
        accept: 'audio/mpeg,.mp3',
        hint: 'Required — MP3 audio file for DJs and radio.',
      }),
      FileUploadField.render({
        id: 'submit-wav',
        label: 'WAV',
        accept: 'audio/wav,.wav,audio/x-wav',
        hint: 'Required — high-quality WAV audio file.',
      }),
      FileUploadField.render({
        id: 'submit-cover',
        label: 'Cover art',
        accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
        hint: 'Required — square cover image (JPG or PNG).',
      }),
    ].join('');
    FileUploadField.bind(host);
  }

  function bindReleaseTypeField() {
    const releaseType = document.getElementById('submit-release-type');
    const albumInput = document.getElementById('submit-album-name');
    const albumHelp = document.getElementById('submit-album-help');
    if (!releaseType || releaseType.dataset.bound === 'true') return;
    releaseType.dataset.bound = 'true';

    const sync = () => {
      const isAlbumTrack = releaseType.value === 'album_track';
      if (albumInput) albumInput.required = isAlbumTrack;
      if (albumHelp) {
        albumHelp.textContent = isAlbumTrack
          ? 'Required — use the same album name on every track for this album.'
          : 'Optional for singles — use the same album name on each track when building a full album later.';
      }
    };

    releaseType.addEventListener('change', sync);
    sync();
  }

  const UPLOAD_CHUNK_BYTES = 1536 * 1024;

  function makeUploadId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    return String(Date.now()) + Math.random().toString(36).slice(2, 10);
  }

  function readFileSliceBase64(file, start, end) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file.slice(start, end));
    });
  }

  function setUploadStatus(statusEl, html) {
    if (!statusEl) return;
    statusEl.innerHTML = html;
    statusEl.classList.add('is-uploading');
  }

  async function uploadSubmissionAsset(assetType, fieldId, artistName, songTitle, statusEl) {
    const file = FileUploadField.getFile(fieldId);
    if (!file) return '';

    setUploadStatus(
      statusEl,
      `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Uploading ${Utils.escapeHtml(file.name)}…`,
    );

    let result;
    if (file.size <= UPLOAD_CHUNK_BYTES) {
      const fileBase64 = await FileUploadField.readBase64(fieldId);
      result = await ArtistAuth.uploadSubmissionAsset({
        artistName,
        songTitle,
        assetType,
        fileName: file.name,
        mimeType: file.type,
        fileBase64,
      });
    } else {
      const uploadId = makeUploadId();
      const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_BYTES);

      await ArtistAuth.uploadSubmissionAssetStart({
        uploadId,
        artistName,
        songTitle,
        assetType,
        fileName: file.name,
        mimeType: file.type,
        totalChunks,
      });

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * UPLOAD_CHUNK_BYTES;
        const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size);
        setUploadStatus(
          statusEl,
          `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Uploading ${Utils.escapeHtml(file.name)} (part ${chunkIndex + 1} of ${totalChunks})…`,
        );
        const chunkBase64 = await readFileSliceBase64(file, start, end);
        await ArtistAuth.uploadSubmissionAssetChunk({
          uploadId,
          chunkIndex,
          totalChunks,
          chunkBase64,
        });
      }

      result = await ArtistAuth.uploadSubmissionAssetFinish({ uploadId });
    }

    if (statusEl) {
      statusEl.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${Utils.escapeHtml(file.name)} uploaded`;
      statusEl.classList.remove('is-uploading');
      statusEl.classList.add('has-file');
    }

    return result.link || result.downloadLink || '';
  }

  function bindSongSubmitForm() {
    const form = document.getElementById('song-submit-form');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    mountSongUploadFields();
    bindReleaseTypeField();

    const errorEl = document.getElementById('song-submit-error');
    const successEl = document.getElementById('song-submit-success');

    document.getElementById('song-cancel-edit-btn')?.addEventListener('click', cancelEditSubmission);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl?.classList.remove('show');
      successEl?.classList.add('hidden');

      const fields = collectSubmissionFormFields();
      const { artistName, songTitle, releaseType, albumName } = fields;
      const isEditing = !!editingSubmission?.id;
      const hasMp3 = FileUploadField.hasFile('submit-mp3') || !!existingAssetLinks.mp3;
      const hasWav = FileUploadField.hasFile('submit-wav') || !!existingAssetLinks.wav;
      const hasCover = FileUploadField.hasFile('submit-cover') || !!existingAssetLinks.cover;

      if (!artistName || !songTitle) {
        errorEl.textContent = 'Artist name and song title are required.';
        errorEl.classList.add('show');
        return;
      }

      if (!hasMp3 || !hasWav || !hasCover) {
        errorEl.textContent = 'MP3, WAV, and cover art are all required.';
        errorEl.classList.add('show');
        return;
      }

      if (releaseType === 'album_track' && !albumName.trim()) {
        errorEl.textContent = 'Album name is required for album tracks.';
        errorEl.classList.add('show');
        return;
      }

      const submitBtn = document.getElementById('song-submit-btn');
      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading files…';

      try {
        const cover = FileUploadField.hasFile('submit-cover')
          ? await uploadSubmissionAsset('cover', 'submit-cover', artistName, songTitle, document.getElementById('submit-cover-status'))
          : existingAssetLinks.cover;
        const mp3 = FileUploadField.hasFile('submit-mp3')
          ? await uploadSubmissionAsset('mp3', 'submit-mp3', artistName, songTitle, document.getElementById('submit-mp3-status'))
          : existingAssetLinks.mp3;
        const wav = FileUploadField.hasFile('submit-wav')
          ? await uploadSubmissionAsset('wav', 'submit-wav', artistName, songTitle, document.getElementById('submit-wav-status'))
          : existingAssetLinks.wav;

        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${isEditing ? 'Saving…' : 'Submitting…'}`;

        const payload = { ...fields, mp3Link: mp3, wavLink: wav, coverLink: cover };
        const result = isEditing
          ? await ArtistAuth.updateSong(editingSubmission.id, payload)
          : await ArtistAuth.submitSong(payload);

        cancelEditSubmission();
        await loadDashboard();

        if (successEl) {
          const submission = result.submission || {};
          successEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>${Utils.escapeHtml(submission.songTitle || 'Song')}</strong> ${isEditing ? 'updated' : 'submitted'} — Radio Now will review and add it to the catalog.`;
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
      mySubmissions = data.submissions || [];
      mountMusicStyleSelect();
      renderSubmissionsList();

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
        { limit: 5 },
      );
      Charts.renderList(
        document.getElementById('dashboard-chart-month'),
        charts.month,
        'No downloads yet this month.',
        { limit: 5 },
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