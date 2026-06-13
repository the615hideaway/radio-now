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
    const groups = this.buildBandMemberGroups(song);
    return [...groups.vocals, ...groups.instruments];
  },

  isVocalLine(line) {
    return /^(Lead Vocals|Harmony Vocals):/i.test(String(line || '').trim());
  },

  buildBandMemberGroups(song) {
    let lines = [];

    if (Array.isArray(song.bandMemberLines) && song.bandMemberLines.length) {
      lines = song.bandMemberLines.map((line) => this.decodeText(line)).filter(Boolean);
    } else {
      const text = this.decodeText(song.bandMembers);
      if (text) {
        lines = text
          .split(';')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => this.formatInstrumentLine(line));
      }
    }

    const vocals = [];
    const instruments = [];

    lines.forEach((line) => {
      if (this.isVocalLine(line)) vocals.push(line);
      else instruments.push(line);
    });

    return { vocals, instruments };
  },

  promoStyles() {
    return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #fff; color: #111; }
    .promo-sheet {
      width: 7.5in;
      padding: 0.55in 0.6in 0.6in;
      font-family: Georgia, "Times New Roman", serif;
      color: #111;
      background: #fff;
      line-height: 1.45;
    }
    .promo-brand {
      border-bottom: 3px solid #d4a017;
      padding-bottom: 10px;
      margin-bottom: 22px;
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
    .hero-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
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
      font-size: 34px;
      line-height: 1.12;
      font-weight: 700;
      color: #111;
      margin-bottom: 12px;
    }
    .promo-artist {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 20px;
      font-weight: 400;
      color: #444;
      line-height: 1.3;
    }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; border-bottom: 1px solid #ddd; }
    .meta-table td { padding: 0 22px 14px 0; vertical-align: top; font-family: Arial, Helvetica, sans-serif; }
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
    .promo-block { margin-bottom: 22px; page-break-inside: avoid; }
    .promo-block h3 {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #888;
      margin-bottom: 10px;
    }
    .promo-block p {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #333;
      line-height: 1.65;
      margin: 0;
    }
    .promo-line {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #333;
      line-height: 1.75;
      margin: 0 0 6px;
    }
    .band-group-spacer {
      height: 14px;
    }
    .credits-table { width: 100%; border-collapse: collapse; border-top: 1px solid #ddd; }
    .credits-table td {
      width: 50%;
      padding: 12px 16px 0 0;
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
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #eee;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      color: #777;
      letter-spacing: 0.04em;
    }
    @page { size: letter portrait; margin: 0.5in; }
    @media print {
      body { background: #fff; }
      .promo-sheet { width: auto; max-width: none; padding: 0; }
      .promo-cover { max-width: 2.1in; }
      a { color: #000 !important; text-decoration: none; }
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
    const bandGroups = this.buildBandMemberGroups(song);
    const coverSrc = options.coverSrc || '';

    const coverHtml = coverSrc
      ? `<img class="promo-cover" src="${this.escapeHtml(coverSrc)}" alt="${this.escapeHtml(title)} cover art" width="202" height="202">`
      : '<div class="promo-cover-placeholder">Cover art not available</div>';

    const renderBandLine = (line) => `<p class="promo-line">${this.escapeHtml(line)}</p>`;
    const bandHtml = (bandGroups.vocals.length || bandGroups.instruments.length)
      ? `<div class="promo-block">
          <h3>Band Members</h3>
          ${bandGroups.vocals.map(renderBandLine).join('')}
          ${bandGroups.vocals.length && bandGroups.instruments.length ? '<div class="band-group-spacer"></div>' : ''}
          ${bandGroups.instruments.map(renderBandLine).join('')}
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

      ${description ? `
      <div class="promo-block">
        <h3>Description</h3>
        <p>${this.escapeHtml(description)}</p>
      </div>` : ''}

      ${this.renderMetaRow(song)}

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

  pdfSlug(value, fallback = 'Unknown') {
    const slug = String(value || '')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || fallback;
  },

  pdfFilename(song) {
    const artist = this.pdfSlug(song.artistName, 'Unknown-Artist');
    const title = this.pdfSlug(song.songTitle, 'Untitled');
    return `${artist}_${title}_OneSheet.pdf`;
  },

  imageFormat(dataUrl) {
    if (String(dataUrl).startsWith('data:image/png')) return 'PNG';
    return 'JPEG';
  },

  getJsPDFClass() {
    return window.jspdf?.jsPDF || window.jsPDF || null;
  },

  loadJsPDFScript() {
    return new Promise((resolve, reject) => {
      if (this.getJsPDFClass()) {
        resolve();
        return;
      }

      const existing = document.querySelector('script[data-jspdf-loader]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load PDF library.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'js/vendor/jspdf.umd.min.js';
      script.dataset.jspdfLoader = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load PDF library.'));
      document.head.appendChild(script);
    });
  },

  async ensureJsPDF() {
    let JsPDF = this.getJsPDFClass();
    if (JsPDF) return JsPDF;

    await this.loadJsPDFScript();
    JsPDF = this.getJsPDFClass();
    if (!JsPDF) {
      throw new Error('PDF library failed to initialize. Refresh the page and try again.');
    }
    return JsPDF;
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

  addPdfSection(doc, label, y, margin) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(String(label).toUpperCase(), margin, y);
    doc.setTextColor(20, 20, 20);
    return y + 0.26;
  },

  addPdfWrappedText(doc, text, x, y, maxWidth, fontSize, lineHeight) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  },

  addPdfField(doc, label, value, x, y, colWidth) {
    if (!value) return y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(String(label).toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value, colWidth);
    doc.text(lines, x, y + 0.16);
    return y + 0.16 + (lines.length * 0.18) + 0.12;
  },

  async downloadOneSheet(song) {
    const JsPDF = await this.ensureJsPDF();
    const doc = new JsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });

    const pageWidth = 8.5;
    const margin = 0.72;
    const contentWidth = pageWidth - (margin * 2);
    const bottom = 10.15;
    const sectionGap = 0.22;
    let y = margin;

    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const description = this.decodeText(song.description);
    const bandGroups = this.buildBandMemberGroups(song);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(154, 123, 10);
    doc.text('Radio Now', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('(615) Hideaway Entertainment', pageWidth - margin, y, { align: 'right' });
    y += 0.16;
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.025);
    doc.line(margin, y, pageWidth - margin, y);
    y += 0.38;

    const coverData = await this.loadCoverDataUrl(song);
    const coverSize = 2.1;
    const textX = margin + coverSize + 0.3;
    const textWidth = contentWidth - coverSize - 0.3;

    if (coverData && coverData.startsWith('data:')) {
      try {
        doc.addImage(coverData, this.imageFormat(coverData), margin, y, coverSize, coverSize);
      } catch (err) {
        console.warn('Cover image skipped:', err.message);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, y, coverSize, coverSize);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('Cover not available', margin + 0.35, y + 1.05);
      doc.setTextColor(20, 20, 20);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    const titleLines = doc.splitTextToSize(title, textWidth);
    const titleStartY = y + 0.55;
    doc.text(titleLines, textX, titleStartY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(17);
    const artistLines = doc.splitTextToSize(artist, textWidth);
    doc.text(artistLines, textX, titleStartY + (titleLines.length * 0.34) + 0.18);

    y += coverSize + 0.42;

    if (description) {
      y = this.addPdfSection(doc, 'Description', y, margin);
      y = this.addPdfWrappedText(doc, description, margin, y, contentWidth, 11, 0.2) + 0.22;
    }

    const meta = [
      { label: 'Year', value: this.decodeText(song.year) },
      { label: 'Song Time', value: this.decodeText(song.songTime) },
      { label: 'Music Style', value: this.decodeText(song.musicStyle) },
    ].filter((item) => item.value);

    if (meta.length) {
      y += sectionGap;
      const colWidth = contentWidth / meta.length;
      meta.forEach((item, index) => {
        const x = margin + (colWidth * index);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(item.label.toUpperCase(), x, y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text(item.value, x, y + 0.18);
      });
      y += 0.48;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 0.3;
    }

    if (bandGroups.vocals.length || bandGroups.instruments.length) {
      y += sectionGap;
      y = this.addPdfSection(doc, 'Band Members', y, margin);

      const drawBandLine = (line) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(line, margin, y);
        y += 0.22;
      };

      bandGroups.vocals.forEach(drawBandLine);

      if (bandGroups.vocals.length && bandGroups.instruments.length) {
        y += 0.16;
      }

      bandGroups.instruments.forEach(drawBandLine);
      y += 0.1;
    }

    if (y < bottom - 1.2) {
      y += sectionGap;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 0.28;

      const credits = [
        { label: 'Songwriter', value: this.decodeText(song.songwriter) },
        { label: 'Record Label', value: this.decodeText(song.recordLabel) },
        { label: 'Website', value: this.decodeText(song.website) },
        { label: 'Contact Email', value: this.decodeText(song.contactEmail) },
      ].filter((item) => item.value);

      const colWidth = (contentWidth - 0.35) / 2;
      let leftY = y;
      let rightY = y;
      credits.forEach((item, index) => {
        if (index % 2 === 0) {
          leftY = this.addPdfField(doc, item.label, item.value, margin, leftY, colWidth);
        } else {
          rightY = this.addPdfField(doc, item.label, item.value, margin + colWidth + 0.35, rightY, colWidth);
        }
      });
      y = Math.max(leftY, rightY);
    }

    doc.setDrawColor(235, 235, 235);
    doc.line(margin, bottom - 0.2, pageWidth - margin, bottom - 0.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Radio Now DJ One-Sheet — For radio programmer use only', pageWidth / 2, bottom, { align: 'center' });

    doc.save(this.pdfFilename(song));
  },
};