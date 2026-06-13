const TurnkeyPitch = {
  namingExample: 'Song Title - Artist Name',

  benefitItem(icon, text) {
    return `<li><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${text}</span></li>`;
  },

  infographicCard(type, page) {
    const isDj = type === 'dj';
    const isActive = (isDj && page === 'dj') || (!isDj && page === 'artist');
    const activeClass = isActive ? ' is-highlighted' : '';

    if (isDj) {
      return `
        <article class="pitch-infographic-card pitch-infographic-card--dj${activeClass}">
          <header class="pitch-infographic-card-head">
            <span class="pitch-infographic-icon" aria-hidden="true"><i class="fa-solid fa-tower-broadcast"></i></span>
            <div>
              <p class="pitch-infographic-kicker">For radio programmers</p>
              <h3 class="pitch-infographic-title">DJs get this</h3>
            </div>
          </header>
          <ul class="pitch-benefit-list">
            ${this.benefitItem('fa-compact-disc', '<strong>Free DJ account</strong> — browse the full catalog')}
            ${this.benefitItem('fa-headphones', '<strong>Preview tracks</strong> before you commit')}
            ${this.benefitItem('fa-folder-open', '<strong>Turn-key ZIP</strong> per song — MP3, cover &amp; one-sheet PDF')}
            ${this.benefitItem('fa-file-zipper', 'Named <em>' + this.namingExample + '</em> — drop straight into your library')}
            ${this.benefitItem('fa-chart-line', '<strong>Dashboard</strong> — track what you already downloaded')}
          </ul>
          <div class="pitch-infographic-ctas">
            <a href="index.html?demo=1" class="pitch-cta-btn pitch-cta-btn--primary">
              <i class="fa-solid fa-play" aria-hidden="true"></i>
              <span>Try demo catalog</span>
              <small>No sign-in — play &amp; preview one-sheet</small>
            </a>
            <a href="dj-dashboard.html?demo=1" class="pitch-cta-btn">
              <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
              <span>Preview DJ dashboard</span>
              <small>Real sample stats &amp; history</small>
            </a>
          </div>
        </article>`;
    }

    return `
      <article class="pitch-infographic-card pitch-infographic-card--artist${activeClass}">
        <header class="pitch-infographic-card-head">
          <span class="pitch-infographic-icon pitch-infographic-icon--artist" aria-hidden="true"><i class="fa-solid fa-microphone"></i></span>
          <div>
            <p class="pitch-infographic-kicker">For artists &amp; labels</p>
            <h3 class="pitch-infographic-title">Artists get this</h3>
          </div>
        </header>
        <ul class="pitch-benefit-list">
          ${this.benefitItem('fa-wand-magic-sparkles', '<strong>We build your promo</strong> — turn-key from <strong class="turnkey-price">$5</strong>')}
          ${this.benefitItem('fa-file-zipper', '<strong>Download your ZIP folders</strong> — same package DJs get')}
          ${this.benefitItem('fa-paper-plane', '<strong>Email or share</strong> with DJs not on Radio Now')}
          ${this.benefitItem('fa-tower-broadcast', '<strong>See who downloaded</strong> — station &amp; DJ info when shared')}
          ${this.benefitItem('fa-share-nodes', '<strong>Charts to screenshot</strong> — post your radio momentum')}
        </ul>
        <div class="pitch-infographic-ctas">
          <a href="index.html?demo=1" class="pitch-cta-btn pitch-cta-btn--primary pitch-cta-btn--artist">
            <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>
            <span>Try free one-sheet demo</span>
            <small>See the PDF DJs receive — no sign-in</small>
          </a>
          <a href="artist-dashboard.html" class="pitch-cta-btn pitch-cta-btn--artist-outline">
            <i class="fa-solid fa-microphone" aria-hidden="true"></i>
            <span>Artist dashboard</span>
            <small>ZIP downloads + download stats</small>
          </a>
        </div>
      </article>`;
  },

  loginHeroHtml(page = 'dj') {
    return `
      <section class="turnkey-pitch turnkey-pitch--hero" aria-label="Radio Now for DJs and artists">
        <div class="turnkey-pitch-inner">
          <p class="turnkey-eyebrow"><i class="fa-solid fa-bolt"></i> One platform · Two audiences</p>
          <h2 class="turnkey-headline">Turn-key radio promo — built for DJs &amp; artists</h2>
          <p class="turnkey-lead turnkey-lead--center">
            Every song = one folder with <strong>MP3, cover art &amp; PDF one-sheet</strong>, labeled <em>${this.namingExample}</em>.
            DJs download for airplay. Artists download to share anywhere.
          </p>
          <div class="pitch-infographic-grid">
            ${this.infographicCard('dj', page)}
            ${this.infographicCard('artist', page)}
          </div>
          <p class="pitch-infographic-footer">Pick your account type below to sign in or create a free account.</p>
        </div>
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
      loginSlot.innerHTML = this.loginHeroHtml(page);
    }

    const catalogSlot = document.getElementById('turnkey-pitch-catalog');
    if (catalogSlot) catalogSlot.innerHTML = this.catalogStripHtml();

    const queueSlot = document.getElementById('turnkey-pitch-queue');
    if (queueSlot) queueSlot.innerHTML = this.queueNoteHtml();
  },
};

TurnkeyPitch.mount();