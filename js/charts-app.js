(function () {
  const weekEl = document.getElementById('charts-week');
  const monthEl = document.getElementById('charts-month');
  const djWelcome = document.getElementById('dj-welcome');
  const logoutBtn = document.getElementById('logout-btn');
  const signInLink = document.getElementById('charts-signin-link');

  let allSongs = [];
  let queue = [];

  function isDjSignedIn() {
    return typeof DjAuth !== 'undefined' && DjAuth.isAuthenticated();
  }

  function loadQueueFromStorage() {
    try {
      const ids = JSON.parse(localStorage.getItem(CONFIG.queueKey) || '[]');
      queue = ids.map((id) => allSongs.find((song) => song.id === id)).filter(Boolean);
    } catch {
      queue = [];
    }
  }

  function saveQueue() {
    localStorage.setItem(CONFIG.queueKey, JSON.stringify(queue.map((song) => song.id)));
  }

  function toggleQueue(songId) {
    const song = allSongs.find((item) => item.id === songId);
    if (!song) return;

    const index = queue.findIndex((item) => item.id === songId);
    if (index >= 0) queue.splice(index, 1);
    else queue.push(song);

    saveQueue();
    renderCharts();
  }

  function updateHeaderAuth() {
    if (isDjSignedIn()) {
      DjAuthUI.updateWelcome();
      signInLink?.classList.add('hidden');
      logoutBtn?.classList.remove('hidden');
      return;
    }

    if (djWelcome) {
      djWelcome.classList.add('hidden');
      djWelcome.textContent = '';
    }
    signInLink?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');
  }

  async function renderCharts() {
    const queueIds = new Set(queue.map((song) => song.id));

    await Charts.loadInto(weekEl, monthEl, {
      limit: 50,
      showQueue: isDjSignedIn(),
      isQueued: (songId) => queueIds.has(songId),
      onQueueToggle: (songId) => toggleQueue(songId),
    });
  }

  async function init() {
    weekEl.innerHTML = '<p class="charts-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading charts…</p>';
    monthEl.innerHTML = '';

    try {
      allSongs = await RadioDB.getAllSongs();
      loadQueueFromStorage();
      updateHeaderAuth();
      await renderCharts();
    } catch (err) {
      weekEl.innerHTML = `<p class="charts-empty">${Utils.escapeHtml(err.message)}</p>`;
      monthEl.innerHTML = '';
    }
  }

  logoutBtn?.addEventListener('click', () => {
    DjAuth.logout();
    DjAuthUI.updateWelcome();
    updateHeaderAuth();
    renderCharts();
  });

  init();
})();