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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #fff; color: #111; }
    .promo-sheet {
      width: 7.5in;
      padding: 0.4in 0.45in 0.5in;
      font-family: Georgia, "Times New Roman", serif;
      color: #111;
      background: #fff;
      line-height: 1.45;
    }
    .promo-brand {
      border-bottom: 3px solid #d4a017;
      padding-bottom: 8px;
      margin-bottom: 16px;
      font-family: Arial, Helvetica, sans-serif;
    }
    .promo-brand-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9a7b0a;
    }
    .promo-brand-sub {
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #666;
      text-align: right;
    }
    .hero-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .hero-table td { vertical-align: top; padding: 0; }
    .cover-cell { width: 2.2in; padding-right: 14px !important; }
    .promo-cover {
      width: 2.1in;
      height: 2.1in;
      object-fit: cover;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f3f3f3;
      display: block;
    }
    .promo-cover-placeholder {
      width: 2.1in;
      height: 2.1in;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f3f3f3;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #999;
      text-align: center;
      padding: 12px;
    }
    .promo-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 28px;
      line-height: 1.1;
      font-weight: 700;
      color: #111;
      margin-bottom: 8px;
    }
    .promo-artist {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 18px;
      font-weight: 400;
      color: #444;
    }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border-bottom: 1px solid #ddd; }
    .meta-table td { padding: 0 18px 10px 0; vertical-align: top; font-family: Arial, Helvetica, sans-serif; }
    .meta-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      margin-bottom: 3px;
    }
    .meta-value {
      font-size: 13px;
      font-weight: 600;
      color: #111;
    }
    .promo-block { margin-bottom: 14px; page-break-inside: avoid; }
    .promo-block h3 {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #888;
      margin-bottom: 6px;
    }
    .promo-block p,
    .promo-line {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #333;
      line-height: 1.5;
      margin: 0 0 3px;
    }
    .credits-table { width: 100%; border-collapse: collapse; border-top: 1px solid #ddd; }
    .credits-table td {
      width: 50%;
      padding: 10px 12px 0 0;
      vertical-align: top;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
    }
    .credit-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      margin-bottom: 3px;
    }
    .credit-value { color: #111; word-break: break-word; }
    .credit-value a { color: #111; text-decoration: none; }
    .promo-footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #eee;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      color: #777;
      letter-spacing: 0.04em;
    }`;
  },

  renderMetaRow(song) {
    const items = [
      { label: 'Year', value: this.decodeText(song.year) },
      { label: 'Song Time', value: this.decodeText(song.songTime) },
      { label: 'Music Style', value: this.decodeText(song.musicStyle) },
    ].filter((item) => item.value);

    if (!items.length) return '';

    const cells = items.map((item) => `
      <td>
        <div class="meta-label">${this.escapeHtml(item.label)}</div>
        <div class="meta-value">${this.escapeHtml(item.value)}</div>
      </td>`).join('');

    return `<table class="meta-table"><tr>${cells}</tr></table>`;
  },

  renderCreditsBlock(song) {
    const items = [
      { label: 'Songwriter', value: this.decodeText(song.songwriter), isLink: false },
      { label: 'Record Label', value: this.decodeText(song.recordLabel), isLink: false },
      { label: 'Website', value: this.decodeText(song.website), isLink: true },
      { label: 'Contact Email', value: this.decodeText(song.contactEmail), isEmail: true },
    ].filter((item) => item.value);

    if (!items.length) return '';

    const cells = items.map((item) => {
      let valueHtml = this.escapeHtml(item.value);
      if (item.isEmail) valueHtml = `<a href="mailto:${valueHtml}">${valueHtml}</a>`;
      if (item.isLink) valueHtml = `<a href="${valueHtml}">${valueHtml}</a>`;
      return `<td>
        <div class="credit-label">${this.escapeHtml(item.label)}</div>
        <div class="credit-value">${valueHtml}</div>
      </td>`;
    });

    const rows = [];
    for (let i = 0; i < cells.length; i += 2) {
      rows.push(`<tr>${cells[i]}${cells[i + 1] || '<td></td>'}</tr>`);
    }

    return `<table class="credits-table">${rows.join('')}</table>`;
  },

  renderPromoBody(song, options = {}) {
    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const description = this.decodeText(song.description);
    const bandLines = this.buildBandMemberLines(song);
    const coverSrc = options.coverSrc || '';

    const coverHtml = coverSrc
      ? `<img class="promo-cover" src="${this.escapeHtml(coverSrc)}" alt="${this.escapeHtml(title)} cover art" width="202" height="202">`
      : '<div class="promo-cover-placeholder">Cover art not available</div>';

    const bandHtml = bandLines.length
      ? `<div class="promo-block">
          <h3>Band Members</h3>
          ${bandLines.map((line) => `<p class="promo-line">${this.escapeHtml(line)}</p>`).join('')}
        </div>`
      : '';

    return `
    <div class="promo-sheet">
      <table class="promo-brand" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td class="promo-brand-title">Radio Now</td>
          <td class="promo-brand-sub">(615) Hideaway Entertainment</td>
        </tr>
      </table>

      <table class="hero-table" cellpadding="0" cellspacing="0">
        <tr>
          <td class="cover-cell">${coverHtml}</td>
          <td>
            <div class="promo-title">${this.escapeHtml(title)}</div>
            <div class="promo-artist">${this.escapeHtml(artist)}</div>
          </td>
        </tr>
      </table>

      ${this.renderMetaRow(song)}

      ${description ? `
      <div class="promo-block">
        <h3>Description</h3>
        <p>${this.escapeHtml(description)}</p>
      </div>` : ''}

      ${bandHtml}

      <div class="promo-block">
        ${this.renderCreditsBlock(song)}
      </div>

      <div class="promo-footer">Radio Now DJ One-Sheet — For radio programmer use only</div>
    </div>`;
  },

  resolveCoverSrc(song, options = {}) {
    if (options.coverSrc) return options.coverSrc;
    if (options.coverFile) return options.coverFile;
    if (options.coverDataUrl) return options.coverDataUrl;
    return Utils.resolveCoverUrl(song) || '';
  },

  generateHtml(song, options = {}) {
    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const coverSrc = this.resolveCoverSrc(song, options);

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

  waitForImages(root) {
    const images = Array.from(root.querySelectorAll('img'));
    if (!images.length) return Promise.resolve();

    return Promise.all(images.map((img) => new Promise((resolve) => {
      if (img.complete && img.naturalWidth) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 2500);
    })));
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
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;left:0;top:0;width:8.5in;height:11in;border:0;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(this.generateHtml(song, { coverSrc }));
    doc.close();

    await this.waitForImages(doc.body);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const element = doc.querySelector('.promo-sheet');
    const sheetHeight = Math.max(element.scrollHeight, element.offsetHeight, 900);
    const sheetWidth = Math.max(element.scrollWidth, element.offsetWidth, 720);

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
            width: sheetWidth,
            height: sheetHeight,
            windowWidth: sheetWidth,
            windowHeight: sheetHeight,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: 'in',
            format: 'letter',
            orientation: 'portrait',
          },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(element)
        .save();
    } finally {
      iframe.remove();
    }
  },
};