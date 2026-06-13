const Demo = {
  isActive() {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  },

  applyMode() {
    if (!this.isActive()) return;
    document.body.classList.add('demo-mode');

    const banner = document.getElementById('demo-banner');
    if (banner) banner.classList.remove('hidden');

    const welcome = document.getElementById('dj-welcome');
    if (welcome) {
      welcome.textContent = 'Demo preview';
      welcome.classList.remove('hidden');
    }
  },

  bindExit(button) {
    if (!this.isActive() || !button) return;
    button.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Exit demo';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = 'index.html';
    });
  },

  salesNoteHtml() {
    return `
      <p class="demo-sales-note">
        <i class="fa-solid fa-file-pdf"></i>
        <strong>Free one-sheet PDF</strong> — radio-ready promo, auto-built from your song data. Artists: skip the layout struggle; DJs get a pro sheet in one click.
        <span class="demo-sales-sub">Sign up as a DJ to download MP3 &amp; WAV files.</span>
      </p>`;
  },
};