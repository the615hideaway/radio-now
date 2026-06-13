(function () {
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const logoutBtn = document.getElementById('logout-btn');
  const dashboardTitle = document.getElementById('dashboard-title');
  const dashboardStats = document.getElementById('dashboard-stats');
  const dashboardHistory = document.getElementById('dashboard-history');
  const historyCount = document.getElementById('history-count');
  const shareEmailToggle = document.getElementById('share-email-toggle');
  const shareEmailStatus = document.getElementById('share-email-status');

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    DjAuthUI.updateWelcome();
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
      { label: 'Unique Songs', value: stats.uniqueSongs || 0 },
    ];

    dashboardStats.innerHTML = items.map((item) => `
      <div class="dj-stat-card">
        <span class="dj-stat-value">${item.value}</span>
        <label>${item.label}</label>
      </div>`).join('');
  }

  function renderHistory(activity) {
    historyCount.textContent = `${activity.length} recorded`;

    if (!activity.length) {
      dashboardHistory.innerHTML = `
        <div class="empty-state dj-empty-state">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <p>No downloads logged yet. Grab a song from the catalog and it will show up here.</p>
        </div>`;
      return;
    }

    dashboardHistory.innerHTML = `
      <div class="dj-history-list">
        ${activity.map((item) => `
          <article class="dj-history-item">
            <div class="dj-history-main">
              <h3>${Utils.escapeHtml(item.songTitle || 'Untitled')}</h3>
              <p>${Utils.escapeHtml(item.artistName || 'Unknown Artist')}</p>
            </div>
            <div class="dj-history-meta">
              <span class="dj-history-type">${Utils.escapeHtml(DjActivity.formatLabel(item.eventType, item.format))}</span>
              <span class="dj-history-date">${Utils.escapeHtml(DjActivity.formatTimestamp(item.timestamp))}</span>
            </div>
          </article>
        `).join('')}
      </div>`;
  }

  function updateShareEmailUi(dj) {
    const enabled = !!dj?.shareEmail;
    shareEmailToggle.checked = enabled;
    shareEmailStatus.textContent = enabled
      ? 'Artists can see your email on future downloads.'
      : 'Your email is hidden from artists.';
  }

  async function loadDashboard() {
    const dj = DjAuth.getDj();
    dashboardTitle.textContent = dj?.name ? `${dj.name}, your download history` : 'Your download history';
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

    try {
      const data = await DjActivity.fetchDashboard();
      DjAuth.updateDjProfile(data.dj);
      renderStats(data.stats || {});
      renderHistory(data.activity || []);
      updateShareEmailUi(data.dj);
    } catch (err) {
      dashboardStats.innerHTML = '';
      dashboardHistory.innerHTML = `
        <div class="empty-state dj-empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>${Utils.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  shareEmailToggle?.addEventListener('change', async () => {
    const previous = shareEmailToggle.checked;
    shareEmailToggle.disabled = true;
    try {
      const dj = await DjActivity.updateShareEmail(shareEmailToggle.checked);
      updateShareEmailUi(dj);
    } catch (err) {
      shareEmailToggle.checked = !previous;
      alert(err.message);
    } finally {
      shareEmailToggle.disabled = false;
    }
  });

  DjAuthUI.init({ onAuthenticated: showApp });
  DjAuthUI.bindLogout(logoutBtn, showLogin);

  if (DjAuth.isAuthenticated()) showApp();
  else showLogin();
})();