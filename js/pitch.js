const TurnkeyPitch = {
  namingExample: 'Song Title - Artist Name',

  loginHeroHtml() {
    return `
      <section class="turnkey-pitch turnkey-pitch--hero" aria-label="Turn-key radio promo">
        <div class="turnkey-pitch-inner">
          <p class="turnkey-eyebrow"><i class="fa-solid fa-bolt"></i> Turn-key radio promo</p>
          <h2 class="turnkey-headline">Every folder named, packed &amp; ready for air</h2>
          <p class="turnkey-lead">
            No renaming. No missing art. No wrestling with one-sheet layouts.
            Radio Now builds each download folder with <strong>audio, cover art, and a radio one-sheet PDF</strong> —
            all labeled <em>${this.namingExample}</em> so DJs can drop straight into their library.
          </p>
          <ul class="turnkey-file-list">
            <li><i class="fa-solid fa-music"></i><span><strong>${this.namingExample}.mp3</strong> — broadcast-ready audio</span></li>
            <li><i class="fa-solid fa-image"></i><span><strong>${this.namingExample}.jpg</strong> — cover art</span></li>
            <li><i class="fa-solid fa-file-pdf"></i><span><strong>${this.namingExample} OneSheet.pdf</strong> — pro radio promo</span></li>
          </ul>
          <p class="turnkey-artist-callout">
            <i class="fa-solid fa-star"></i>
            <span><strong>Artists:</strong> hate tech? Full turn-key setup from <strong class="turnkey-price">$5</strong>. <a href="artist-dashboard.html">Artist dashboard</a> — download your ZIP folders and send them to any DJ, plus see who downloaded on Radio Now.</span>
          </p>
          <p class="turnkey-dj-callout">
            <i class="fa-solid fa-tower-broadcast"></i>
            <span><strong>DJs:</strong> queue tracks, download one ZIP — every song in its own folder, show-prep done.</span>
          </p>
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
    if (loginSlot) loginSlot.innerHTML = this.loginHeroHtml();

    const catalogSlot = document.getElementById('turnkey-pitch-catalog');
    if (catalogSlot) catalogSlot.innerHTML = this.catalogStripHtml();

    const queueSlot = document.getElementById('turnkey-pitch-queue');
    if (queueSlot) queueSlot.innerHTML = this.queueNoteHtml();
  },
};

TurnkeyPitch.mount();