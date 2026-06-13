(function () {
  const loginGate = document.getElementById('login-gate');
  const appShell = document.getElementById('app-shell');
  const logoutBtn = document.getElementById('logout-btn');
  const dashboardTitle = document.getElementById('dashboard-title');
  const dashboardStats = document.getElementById('dashboard-stats');
  const dashboardHistory = document.getElementById('dashboard-history');
  const historyCount = document.getElementById('history-count');

  function showApp() {
    loginGate.classList.add('hidden');
    appShell.classList.remove('hidden');
    ArtistAuthUI.updateWelcome();
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
          <p>No DJ downloads logged yet for your catalog artist name. Activity appears when DJs download your music from Radio Now.</p>
        </div>`;
      return;
    }

    dashboardHistory.innerHTML = `
      <div class="dj-history-list">
        ${activity.map((item) => {
          const djLine = ArtistActivity.formatDjLine(item);
          const emailLine = item.djEmail
            ? `<a href="mailto:${Utils.escapeHtml(item.djEmail)}">${Utils.escapeHtml(item.djEmail)}</a>`
            : '<span class="muted">Email not shared</span>';

          return `
          <article class="dj-history-item artist-history-item">
            <div class="dj-history-main">
              <h3>${Utils.escapeHtml(item.songTitle || 'Untitled')}</h3>
              <p>${Utils.escapeHtml(item.artistName || '')}${item.musicStyle ? ` · ${Utils.escapeHtml(item.musicStyle)}` : ''}</p>
              ${djLine ? `<p class="artist-dj-line"><i class="fa-solid fa-tower-broadcast"></i> ${Utils.escapeHtml(djLine)}</p>` : ''}
              <p class="artist-dj-email">${emailLine}</p>
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
    const artist = ArtistAuth.getArtist();
    dashboardTitle.textContent = artist?.artistName
      ? `${artist.artistName} — radio activity`
      : 'Your radio activity';

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
      const data = await ArtistActivity.fetchDashboard();
      if (data.artist?.artistName) {
        dashboardTitle.textContent = `${data.artist.artistName} — radio activity`;
        ArtistAuth.updateArtistProfile(data.artist);
        ArtistAuthUI.updateWelcome();
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

  ArtistAuthUI.init({ onAuthenticated: showApp });
  ArtistAuthUI.bindLogout(logoutBtn, showLogin);

  if (ArtistAuth.isAuthenticated()) showApp();
  else showLogin();
})();