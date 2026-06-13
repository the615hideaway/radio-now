const TurnkeyPitch = {
  namingExample: 'Song Title - Artist Name',

  demoPickerHtml(page) {
    if (page === 'artist') {
      return `
        <div class="pitch-action-picker" aria-label="Try turn-key promo">
          <a href="index.html?demo=1" class="pitch-action-card pitch-action-card--primary">
            <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>
            <span class="pitch-action-title">Try free one-sheet demo</span>
            <span class="pitch-action-desc">Play previews &amp; download a sample PDF — see what DJs get</span>
          </a>
          <a href="index.html" class="pitch-action-card">
            <i class="fa-solid fa-tower-broadcast" aria-hidden="true"></i>
            <span class="pitch-action-title">DJ account</span>
            <span class="pitch-action-desc">Browse the catalog &amp; download turn-key folders</span>
          </a>
        </div>`;
    }

    return `
      <div class="pitch-action-picker" aria-label="Try turn-key promo">
        <a href="index.html?demo=1" class="pitch-action-card pitch-action-card--primary">
          <i class="fa-solid fa-compact-disc" aria-hidden="true"></i>
          <span class="pitch-action-title">Try demo catalog</span>
          <span class="pitch-action-desc">Play previews &amp; free one-sheet PDF — no sign-in</span>
        </a>
        <a href="dj-dashboard.html?demo=1" class="pitch-action-card">
          <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
          <span class="pitch-action-title">Preview DJ dashboard</span>
          <span class="pitch-action-desc">See download history &amp; charts — real sample data</span>
        </a>
      </div>`;
  },

  loginPitchHtml(page = 'dj') {
    return `
      <section class="turnkey-pitch turnkey-pitch--login" aria-label="Turn-key radio promo">
        <p class="turnkey-eyebrow"><i class="fa-solid fa-bolt"></i> Turn-key radio promo</p>
        <h2 class="turnkey-headline turnkey-headline--login">Named, packed &amp; ready for air</h2>
        <p class="turnkey-lead-short">Every folder: <strong>MP3</strong>, <strong>cover art</strong>, <strong>PDF one-sheet</strong> — labeled <em>${this.namingExample}</em>.</p>
        <div class="turnkey-file-chips">
          <span><i class="fa-solid fa-music"></i> .mp3</span>
          <span><i class="fa-solid fa-image"></i> .jpg</span>
          <span><i class="fa-solid fa-file-pdf"></i> OneSheet.pdf</span>
        </div>
        <p class="turnkey-price-line">Artists: full setup from <strong class="turnkey-price">$5</strong> · no layout struggle</p>
        ${this.demoPickerHtml(page)}
      </section>`;
  },

  catalogStripHtml() {
    return `
      <section class="turnkey-pitch turnkey-pitch--strip" aria-label="Turn-key downloads">
        <div class="turnkey-strip-main">
          <span class="turnkey-strip-badge"><i class="fa-solid fa-folder-open"></i> Turn-key folders</span>
          <p>Each song downloads as <strong>${this.namingExample}</strong> — MP3, cover art &amp; PDF one-sheet, named right and ready for your library.</p>
        </div>
        <p class="turnkey-strip-artist">Artists: full promo setup from <strong class="turnkey-price">$5</strong>. No tech required.</p>
      </section>`;
  },

  queueNoteHtml() {
    return `
      <p class="turnkey-queue-note">
        <i class="fa-solid fa-box-archive"></i>
        <span>Your ZIP unpacks into <strong>one folder per song</strong> — audio, cover, and one-sheet PDF, each named <em>${this.namingExample}</em>. Unzip and go.</span>
      </p>`;
  },

  detailNoteHtml(isDemo = false) {
    if (isDemo) {
      return `
        <div class="turnkey-detail-note turnkey-detail-note--demo">
          <p class="turnkey-detail-kicker"><i class="fa-solid fa-wand-magic-sparkles"></i> Try it free</p>
          <p class="turnkey-detail-title">We build your radio one-sheet for you</p>
          <p class="turnkey-detail-copy">Artists who hate tech: skip the layout struggle. Download a sample PDF below — the same pro sheet DJs get in every turn-key folder (<strong>${this.namingExample} OneSheet.pdf</strong>).</p>
          <p class="turnkey-detail-price">Full turn-key promo — audio, cover &amp; one-sheet, all named right — from <strong class="turnkey-price">$5</strong>.</p>
        </div>`;
    }

    return `
      <div class="turnkey-detail-note">
        <p class="turnkey-detail-kicker"><i class="fa-solid fa-folder-open"></i> Turn-key download</p>
        <p class="turnkey-detail-copy">Add to your download queue for a ZIP folder with <strong>${this.namingExample}.mp3</strong>, cover art, and <strong>OneSheet.pdf</strong> — named and ready for air.</p>
      </div>`;
  },

  mount() {
    const loginSlot = document.getElementById('turnkey-pitch-login');
    if (loginSlot) {
      const page = loginSlot.dataset.page || 'dj';
      loginSlot.innerHTML = this.loginPitchHtml(page);
    }

    const catalogSlot = document.getElementById('turnkey-pitch-catalog');
    if (catalogSlot) catalogSlot.innerHTML = this.catalogStripHtml();

    const queueSlot = document.getElementById('turnkey-pitch-queue');
    if (queueSlot) queueSlot.innerHTML = this.queueNoteHtml();
  },
};

TurnkeyPitch.mount();