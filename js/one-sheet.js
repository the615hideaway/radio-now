const OneSheet = {
  decodeText(value) {
    if (!value) return '';
    const div = document.createElement('div');
    div.innerHTML = String(value);
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  },

  escapeHtml(str) {
    return Utils.escapeHtml(str || '');
  },

  formatInstrumentLine(value) {
    const text = this.decodeText(value);
    if (!text) return '';
    const match = text.match(/^(.+?)\s*-\s*(.+)$/);
    if (match) return `${match[1].trim()}: ${match[2].trim()}`;
    return text;
  },

  buildBandMemberLines(song) {
    if (Array.isArray(song.bandMemberLines) && song.bandMemberLines.length) {
      return song.bandMemberLines
        .map((line) => this.decodeText(line))
        .filter(Boolean);
    }

    const text = this.decodeText(song.bandMembers);
    if (!text) return [];

    return text
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => this.formatInstrumentLine(line));
  },

  promoStyles() {
    return `
    * { box-sizing: border-box; }
    .promo-sheet {
      width: 7.5in;
      padding: 0.45in 0.5in;
      font-family: Georgia, "Times New Roman", serif;
      color: #111;
      background: #fff;
      line-height: 1.45;
    }
    .promo-brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #d4a017;
      padding-bottom: 0.3rem;
      margin-bottom: 0.85rem;
      font-family: Arial, Helvetica, sans-serif;
    }
    .promo-brand strong {
      font-size: 0.95rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9a7b0a;
    }
    .promo-brand span {
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #666;
    }
    .promo-hero {
      display: grid;
      grid-template-columns: 2.35in 1fr;
      gap: 0.85rem;
      align-items: start;
      margin-bottom: 0.75rem;
    }
    .promo-cover {
      width: 2.35in;
      height: 2.35in;
      object-fit: cover;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f3f3f3;
      display: block;
    }
    .promo-cover-placeholder {
      width: 2.35in;
      height: 2.35in;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f3f3f3;
      display: grid;
      place-items: center;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.75rem;
      color: #999;
      text-align: center;
      padding: 0.5rem;
    }
    .promo-titles h1 {
      margin: 0 0 0.35rem;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 1.85rem;
      line-height: 1.1;
      font-weight: 700;
      color: #111;
    }
    .promo-titles h2 {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 1.25rem;
      font-weight: 400;
      color: #444;
    }
    .promo-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      margin-bottom: 0.85rem;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid #ddd;
      font-family: Arial, Helvetica, sans-serif;
    }
    .promo-meta-item label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      margin-bottom: 0.1rem;
    }
    .promo-meta-item span {
      font-size: 0.9rem;
      font-weight: 600;
      color: #111;
    }
    .promo-section {
      margin-bottom: 0.75rem;
    }
    .promo-section h3 {
      margin: 0 0 0.35rem;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #888;
    }
    .promo-section p {
      margin: 0;
      font-size: 0.9rem;
      color: #333;
    }
    .promo-lines {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.84rem;
      color: #222;
      line-height: 1.5;
    }
    .promo-line { margin: 0; }
    .promo-credits {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem 1rem;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.82rem;
      color: #222;
      border-top: 1px solid #ddd;
      padding-top: 0.7rem;
    }
    .promo-credit label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      margin-bottom: 0.12rem;
    }
    .promo-credit span,
    .promo-credit a {
      color: #111;
      word-break: break-word;
      text-decoration: none;
    }
    .promo-footer {
      margin-top: 0.85rem;
      padding-top: 0.55rem;
      border-top: 1px solid #eee;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.68rem;
      color: #777;
      letter-spacing: 0.04em;
    }`;
  },

  renderMetaItem(label, value) {
    if (!value) return '';
    return `<div class="promo-meta-item"><label>${this.escapeHtml(label)}</label><span>${this.escapeHtml(value)}</span></div>`;
  },

  renderPromoBody(song, options = {}) {
    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const description = this.decodeText(song.description);
    const bandLines = this.buildBandMemberLines(song);
    const coverSrc = options.coverSrc || '';
    const coverHtml = coverSrc
      ? `<img class="promo-cover" src="${this.escapeHtml(coverSrc)}" alt="${this.escapeHtml(title)} cover art">`
      : '<div class="promo-cover-placeholder">Cover art<br>not available</div>';

    const metaHtml = [
      this.renderMetaItem('Year', this.decodeText(song.year)),
      this.renderMetaItem('Song Time', this.decodeText(song.songTime)),
      this.renderMetaItem('Music Style', this.decodeText(song.musicStyle)),
    ].filter(Boolean).join('');

    const bandHtml = bandLines.length
      ? `<section class="promo-section">
          <h3>Band Members</h3>
          <div class="promo-lines">${bandLines.map((line) => `<p class="promo-line">${this.escapeHtml(line)}</p>`).join('')}</div>
        </section>`
      : '';

    const website = this.decodeText(song.website);
    const email = this.decodeText(song.contactEmail);
    const songwriter = this.decodeText(song.songwriter);
    const label = this.decodeText(song.recordLabel);

    return `
    <div class="promo-sheet">
      <div class="promo-brand">
        <strong>Radio Now</strong>
        <span>(615) Hideaway Entertainment</span>
      </div>
      <div class="promo-hero">
        ${coverHtml}
        <div class="promo-titles">
          <h1>${this.escapeHtml(title)}</h1>
          <h2>${this.escapeHtml(artist)}</h2>
        </div>
      </div>
      ${metaHtml ? `<div class="promo-meta">${metaHtml}</div>` : ''}
      ${description ? `
      <section class="promo-section">
        <h3>Description</h3>
        <p>${this.escapeHtml(description)}</p>
      </section>` : ''}
      ${bandHtml}
      <section class="promo-section promo-credits">
        ${songwriter ? `<div class="promo-credit"><label>Songwriter</label><span>${this.escapeHtml(songwriter)}</span></div>` : ''}
        ${label ? `<div class="promo-credit"><label>Record Label</label><span>${this.escapeHtml(label)}</span></div>` : ''}
        ${website ? `<div class="promo-credit"><label>Website</label><a href="${this.escapeHtml(website)}">${this.escapeHtml(website)}</a></div>` : ''}
        ${email ? `<div class="promo-credit"><label>Contact Email</label><a href="mailto:${this.escapeHtml(email)}">${this.escapeHtml(email)}</a></div>` : ''}
      </section>
      <div class="promo-footer">Radio Now DJ One-Sheet — For radio programmer use only</div>
    </div>`;
  },

  resolveCoverSrc(song, options = {}) {
    if (options.coverFile) return options.coverFile;
    if (options.coverDataUrl) return options.coverDataUrl;
    return Utils.resolveCoverUrl(song) || '';
  },

  generateHtml(song, options = {}) {
    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const coverSrc = this.resolveCoverSrc(song, {
      coverFile: options.hasCover ? (options.coverFile || 'cover.jpg') : '',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(artist)} — ${this.escapeHtml(title)} | Radio Now One-Sheet</title>
  <style>${this.promoStyles()}</style>
</head>
<body>
  ${this.renderPromoBody(song, { coverSrc })}
</body>
</html>`;
  },

  pdfFilename(song) {
    const base = Utils.zipFolderName(song.artistName, song.songTitle);
    return `${base} - One-Sheet.pdf`.replace(/[<>:"/\\|?*]/g, '');
  },

  async loadCoverDataUrl(song) {
    if (typeof RadioDB !== 'undefined' && RadioDB.fetchCoverBlob) {
      try {
        const blob = await RadioDB.fetchCoverBlob(song);
        if (blob?.size) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read cover image'));
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        console.warn('Cover embed failed for PDF:', err.message);
      }
    }

    return Utils.resolveCoverUrl(song) || '';
  },

  async downloadPdf(song) {
    if (!window.html2pdf) {
      throw new Error('PDF library not loaded. Refresh the page and try again.');
    }

    const coverSrc = await this.loadCoverDataUrl(song);
    const mount = document.createElement('div');
    mount.style.position = 'fixed';
    mount.style.left = '-10000px';
    mount.style.top = '0';
    mount.style.width = '7.5in';
    mount.innerHTML = `<style>${this.promoStyles()}</style>${this.renderPromoBody(song, { coverSrc })}`;
    document.body.appendChild(mount);

    const element = mount.querySelector('.promo-sheet');

    try {
      await html2pdf()
        .set({
          margin: [0.35, 0.4, 0.35, 0.4],
          filename: this.pdfFilename(song),
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
          },
          jsPDF: {
            unit: 'in',
            format: 'letter',
            orientation: 'portrait',
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(element)
        .save();
    } finally {
      mount.remove();
    }
  },
};