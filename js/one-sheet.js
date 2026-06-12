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

  addPdfSection(doc, label, y, margin, contentWidth) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(String(label).toUpperCase(), margin, y);
    doc.setTextColor(20, 20, 20);
    return y + 0.18;
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
    doc.text(lines, x, y + 0.14);
    return y + 0.14 + (lines.length * 0.16) + 0.08;
  },

  async downloadOneSheet(song) {
    if (!window.jspdf?.jsPDF) {
      throw new Error('PDF library not loaded. Refresh the page and try again.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });

    const pageWidth = 8.5;
    const margin = 0.55;
    const contentWidth = pageWidth - (margin * 2);
    const bottom = 10.2;
    let y = margin;

    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const description = this.decodeText(song.description);
    const bandLines = this.buildBandMemberLines(song);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(154, 123, 10);
    doc.text('Radio Now', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('(615) Hideaway Entertainment', pageWidth - margin, y, { align: 'right' });
    y += 0.12;
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.02);
    doc.line(margin, y, pageWidth - margin, y);
    y += 0.28;

    const coverData = await this.loadCoverDataUrl(song);
    const coverSize = 2.05;
    const textX = margin + coverSize + 0.22;
    const textWidth = contentWidth - coverSize - 0.22;

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
      doc.text('Cover not available', margin + 0.35, y + 1.02);
      doc.setTextColor(20, 20, 20);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(title, textWidth);
    doc.text(titleLines, textX, y + 0.45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    const artistLines = doc.splitTextToSize(artist, textWidth);
    doc.text(artistLines, textX, y + 0.45 + (titleLines.length * 0.28) + 0.12);

    y += coverSize + 0.28;

    const meta = [
      { label: 'Year', value: this.decodeText(song.year) },
      { label: 'Song Time', value: this.decodeText(song.songTime) },
      { label: 'Music Style', value: this.decodeText(song.musicStyle) },
    ].filter((item) => item.value);

    if (meta.length) {
      const colWidth = contentWidth / meta.length;
      meta.forEach((item, index) => {
        const x = margin + (colWidth * index);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(item.label.toUpperCase(), x, y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 20);
        doc.text(item.value, x, y + 0.15);
      });
      y += 0.38;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 0.22;
    }

    if (description) {
      y = this.addPdfSection(doc, 'Description', y, margin, contentWidth);
      y = this.addPdfWrappedText(doc, description, margin, y, contentWidth, 11, 0.17) + 0.1;
    }

    if (bandLines.length) {
      y = this.addPdfSection(doc, 'Band Members', y, margin, contentWidth);
      bandLines.forEach((line) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(line, margin, y);
        y += 0.17;
      });
      y += 0.06;
    }

    if (y < bottom - 1.2) {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 0.2;

      const credits = [
        { label: 'Songwriter', value: this.decodeText(song.songwriter) },
        { label: 'Record Label', value: this.decodeText(song.recordLabel) },
        { label: 'Website', value: this.decodeText(song.website) },
        { label: 'Contact Email', value: this.decodeText(song.contactEmail) },
      ].filter((item) => item.value);

      const colWidth = (contentWidth - 0.25) / 2;
      let leftY = y;
      let rightY = y;
      credits.forEach((item, index) => {
        if (index % 2 === 0) {
          leftY = this.addPdfField(doc, item.label, item.value, margin, leftY, colWidth);
        } else {
          rightY = this.addPdfField(doc, item.label, item.value, margin + colWidth + 0.25, rightY, colWidth);
        }
      });
      y = Math.max(leftY, rightY);
    }

    doc.setDrawColor(235, 235, 235);
    doc.line(margin, bottom - 0.15, pageWidth - margin, bottom - 0.15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Radio Now DJ One-Sheet — For radio programmer use only', pageWidth / 2, bottom, { align: 'center' });

    doc.save(this.pdfFilename(song));
  },
};