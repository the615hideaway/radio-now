const Charts = {
  async fetch(limit = 10) {
    const scriptUrl = String(CONFIG.googleScriptUrl || '').trim();
    if (!scriptUrl.includes('script.google.com')) {
      throw new Error('Charts need Apps Script setup.');
    }

    const url = `${scriptUrl.replace(/\/$/, '')}?action=charts&limit=${encodeURIComponent(limit)}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Charts unavailable');
    return data;
  },

  renderList(container, items, emptyMessage) {
    if (!container) return;

    if (!items?.length) {
      container.innerHTML = `<p class="charts-empty">${Utils.escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = `
      <ol class="charts-list">
        ${items.map((item, index) => `
          <li class="charts-item">
            <span class="charts-rank">${index + 1}</span>
            <div class="charts-copy">
              <strong>${Utils.escapeHtml(item.songTitle || 'Untitled')}</strong>
              <span>${Utils.escapeHtml(item.artistName || 'Unknown Artist')}${item.musicStyle ? ` · ${Utils.escapeHtml(item.musicStyle)}` : ''}</span>
            </div>
            <span class="charts-count" title="Downloads">${item.count}</span>
          </li>
        `).join('')}
      </ol>`;
  },

  async loadInto(weekEl, monthEl, limit = 10) {
    try {
      const data = await this.fetch(limit);
      this.renderList(weekEl, data.week, 'No downloads yet this week.');
      this.renderList(monthEl, data.month, 'No downloads yet this month.');
    } catch (err) {
      const message = err.message || 'Charts unavailable';
      if (weekEl) weekEl.innerHTML = `<p class="charts-empty">${Utils.escapeHtml(message)}</p>`;
      if (monthEl) monthEl.innerHTML = '';
    }
  },
};