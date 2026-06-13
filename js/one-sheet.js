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

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read cover image'));
      reader.readAsDataURL(blob);
    });
  },

  async loadCoverDataUrl(song) {
    if (typeof RadioDB !== 'undefined' && RadioDB.fetchCoverBlob) {
      try {
        const blob = await RadioDB.fetchCoverBlob(song);
        if (blob?.size) return await this.blobToDataUrl(blob);
      } catch (err) {
        console.warn('Cover embed failed for PDF:', err.message);
      }
    }

    return '';
  },

  pdfTheme() {
    return {
      gold: [244, 196, 48],
      goldDeep: [196, 150, 18],
      ink: [17, 17, 17],
      inkSoft: [55, 55, 55],
      label: [118, 110, 96],
      border: [222, 214, 198],
      surface: [252, 249, 243],
      surfaceLine: [236, 228, 210],
      shadow: [214, 208, 198],
    };
  },

  ensurePdfSpace(doc, y, needed, margin, bottom) {
    if (y + needed > bottom) {
      doc.addPage();
      return margin + 0.15;
    }
    return y;
  },

  addPdfSection(doc, label, y, margin, theme) {
    const accentWidth = 0.05;
    const accentHeight = 0.14;

    doc.setFillColor(...theme.gold);
    doc.rect(margin, y - 0.1, accentWidth, accentHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...theme.label);
    doc.text(String(label).toUpperCase(), margin + 0.14, y);
    doc.setTextColor(...theme.ink);
    return y + 0.3;
  },

  addPdfWrappedText(doc, text, x, y, maxWidth, fontSize, lineHeight, color) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    if (color) doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  },

  addPdfField(doc, label, value, x, y, colWidth, theme) {
    if (!value) return y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...theme.label);
    doc.text(String(label).toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...theme.ink);
    const lines = doc.splitTextToSize(value, colWidth);
    doc.text(lines, x, y + 0.15);
    return y + 0.15 + (lines.length * 0.17) + 0.14;
  },

  addPdfHeader(doc, pageWidth, margin, theme) {
    let y = margin;

    doc.setFillColor(...theme.gold);
    doc.rect(0, 0, pageWidth, 0.07, 'F');

    y += 0.34;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...theme.goldDeep);
    doc.text('RADIO NOW', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...theme.label);
    doc.text('(615) HIDEAWAY ENTERTAINMENT', pageWidth - margin, y, { align: 'right' });

    y += 0.14;
    doc.setDrawColor(...theme.gold);
    doc.setLineWidth(0.02);
    doc.line(margin, y, pageWidth - margin, y);

    return y + 0.34;
  },

  drawPdfCover(doc, coverData, x, y, size, theme) {
    doc.setFillColor(...theme.shadow);
    doc.roundedRect(x + 0.05, y + 0.05, size, size, 0.08, 0.08, 'F');

    if (coverData && coverData.startsWith('data:')) {
      try {
        doc.addImage(coverData, this.imageFormat(coverData), x, y, size, size);
      } catch (err) {
        console.warn('Cover image skipped:', err.message);
        doc.setFillColor(245, 242, 236);
        doc.roundedRect(x, y, size, size, 0.08, 0.08, 'F');
        doc.setFontSize(9);
        doc.setTextColor(...theme.label);
        doc.text('Cover not available', x + size / 2, y + size / 2, { align: 'center' });
      }
    } else {
      doc.setFillColor(245, 242, 236);
      doc.roundedRect(x, y, size, size, 0.08, 0.08, 'F');
      doc.setFontSize(9);
      doc.setTextColor(...theme.label);
      doc.text('Cover not available', x + size / 2, y + size / 2, { align: 'center' });
    }

    doc.setDrawColor(...theme.gold);
    doc.setLineWidth(0.03);
    doc.roundedRect(x - 0.02, y - 0.02, size + 0.04, size + 0.04, 0.1, 0.1, 'S');
  },

  addPdfDescriptionBlock(doc, description, y, margin, contentWidth, pageWidth, bottom, theme) {
    const textX = margin + 0.2;
    const textWidth = contentWidth - 0.28;
    const lineHeight = 0.19;
    const fontSize = 10.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(description, textWidth);
    const boxHeight = (lines.length * lineHeight) + 0.28;

    y = this.ensurePdfSpace(doc, y, boxHeight + 0.45, margin, bottom);
    y = this.addPdfSection(doc, 'Description', y, margin, theme);

    const boxY = y - 0.1;
    doc.setFillColor(...theme.surface);
    doc.setDrawColor(...theme.surfaceLine);
    doc.setLineWidth(0.01);
    doc.roundedRect(margin, boxY, contentWidth, boxHeight, 0.06, 0.06, 'FD');
    doc.setFillColor(...theme.gold);
    doc.rect(margin, boxY, 0.05, boxHeight, 'F');

    doc.setTextColor(...theme.inkSoft);
    doc.text(lines, textX, y + 0.08);

    return boxY + boxHeight + 0.28;
  },

  addPdfMetaCards(doc, meta, y, margin, contentWidth, pageWidth, bottom, theme) {
    const cardGap = 0.1;
    const cardWidth = (contentWidth - (cardGap * (meta.length - 1))) / meta.length;
    const cardHeight = 0.58;

    y = this.ensurePdfSpace(doc, y, cardHeight + 0.2, margin, bottom);
    y += 0.08;

    meta.forEach((item, index) => {
      const x = margin + ((cardWidth + cardGap) * index);

      doc.setFillColor(...theme.surface);
      doc.setDrawColor(...theme.surfaceLine);
      doc.setLineWidth(0.01);
      doc.roundedRect(x, y, cardWidth, cardHeight, 0.06, 0.06, 'FD');

      doc.setFillColor(...theme.gold);
      doc.rect(x, y, cardWidth, 0.05, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...theme.label);
      doc.text(item.label.toUpperCase(), x + 0.12, y + 0.22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(...theme.ink);
      const valueLines = doc.splitTextToSize(item.value, cardWidth - 0.24);
      doc.text(valueLines, x + 0.12, y + 0.4);
    });

    return y + cardHeight + 0.28;
  },

  drawPdfBandLine(doc, line, x, y, maxWidth, theme) {
    const match = String(line || '').match(/^(.+?):\s*(.+)$/);

    doc.setFontSize(10.5);
    if (match) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...theme.ink);
      const label = `${match[1]}: `;
      doc.text(label, x, y);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...theme.inkSoft);
      const nameLines = doc.splitTextToSize(match[2], maxWidth - labelWidth);
      doc.text(nameLines, x + labelWidth, y);
      return y + (nameLines.length * 0.19);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.inkSoft);
    const lines = doc.splitTextToSize(line, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * 0.19);
  },

  addPdfBandMembers(doc, bandGroups, y, margin, contentWidth, bottom, theme) {
    if (!bandGroups.vocals.length && !bandGroups.instruments.length) return y;

    y = this.ensurePdfSpace(doc, y, 0.5, margin, bottom);
    y = this.addPdfSection(doc, 'Band Members', y, margin, theme);

    const colGap = 0.28;
    const colWidth = (contentWidth - colGap) / 2;
    const rightX = margin + colWidth + colGap;

    bandGroups.vocals.forEach((line) => {
      y = this.ensurePdfSpace(doc, y, 0.24, margin, bottom);
      y = this.drawPdfBandLine(doc, line, margin, y, contentWidth, theme) + 0.04;
    });

    if (bandGroups.vocals.length && bandGroups.instruments.length) {
      y += 0.1;
    }

    let leftY = y;
    let rightY = y;
    bandGroups.instruments.forEach((line, index) => {
      const x = index % 2 === 0 ? margin : rightX;
      const maxWidth = colWidth;
      const currentY = index % 2 === 0 ? leftY : rightY;

      const nextY = this.ensurePdfSpace(doc, currentY, 0.24, margin, bottom);
      if (nextY !== currentY) {
        leftY = nextY;
        rightY = nextY;
      }

      const placedY = index % 2 === 0 ? leftY : rightY;
      const lineEnd = this.drawPdfBandLine(doc, line, x, placedY, maxWidth, theme) + 0.04;

      if (index % 2 === 0) leftY = lineEnd;
      else rightY = lineEnd;
    });

    return Math.max(leftY, rightY) + 0.12;
  },

  addPdfCredits(doc, credits, y, margin, contentWidth, pageWidth, bottom, theme) {
    if (!credits.length) return y;

    y = this.ensurePdfSpace(doc, y, 0.8, margin, bottom);
    y += 0.06;

    doc.setDrawColor(...theme.border);
    doc.setLineWidth(0.01);
    doc.line(margin, y, pageWidth - margin, y);
    y += 0.3;

    const colGap = 0.35;
    const colWidth = (contentWidth - colGap) / 2;
    let leftY = y;
    let rightY = y;

    credits.forEach((item, index) => {
      if (index % 2 === 0) {
        leftY = this.addPdfField(doc, item.label, item.value, margin, leftY, colWidth, theme);
      } else {
        rightY = this.addPdfField(doc, item.label, item.value, margin + colWidth + colGap, rightY, colWidth, theme);
      }
    });

    return Math.max(leftY, rightY) + 0.08;
  },

  addPdfFooter(doc, pageWidth, margin, bottom, theme) {
    doc.setDrawColor(...theme.gold);
    doc.setLineWidth(0.015);
    doc.line(margin, bottom - 0.28, pageWidth - margin, bottom - 0.28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...theme.label);
    doc.text('Radio Now DJ One-Sheet — For radio programmer use only', pageWidth / 2, bottom - 0.08, { align: 'center' });
  },

  async downloadOneSheet(song) {
    const JsPDF = await this.ensureJsPDF();
    const doc = new JsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
    const theme = this.pdfTheme();

    const pageWidth = 8.5;
    const margin = 0.68;
    const contentWidth = pageWidth - (margin * 2);
    const bottom = 10.2;
    let y;

    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const description = this.decodeText(song.description);
    const bandGroups = this.buildBandMemberGroups(song);

    y = this.addPdfHeader(doc, pageWidth, margin, theme);

    const coverData = await this.loadCoverDataUrl(song);
    const coverSize = 2.15;
    const textX = margin + coverSize + 0.34;
    const textWidth = contentWidth - coverSize - 0.34;

    this.drawPdfCover(doc, coverData, margin, y, coverSize, theme);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(27);
    doc.setTextColor(...theme.ink);
    const titleLines = doc.splitTextToSize(title, textWidth);
    const titleStartY = y + 0.42;
    doc.text(titleLines, textX, titleStartY);

    const titleBlockHeight = titleLines.length * 0.33;
    doc.setDrawColor(...theme.gold);
    doc.setLineWidth(0.02);
    doc.line(textX, titleStartY + titleBlockHeight + 0.08, textX + Math.min(textWidth * 0.42, 1.8), titleStartY + titleBlockHeight + 0.08);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(...theme.inkSoft);
    const artistLines = doc.splitTextToSize(artist, textWidth);
    doc.text(artistLines, textX, titleStartY + titleBlockHeight + 0.28);

    y += coverSize + 0.46;

    doc.setDrawColor(...theme.border);
    doc.setLineWidth(0.01);
    doc.line(margin, y, pageWidth - margin, y);
    y += 0.34;

    if (description) {
      y = this.addPdfDescriptionBlock(doc, description, y, margin, contentWidth, pageWidth, bottom, theme);
    }

    const meta = [
      { label: 'Year', value: this.decodeText(song.year) },
      { label: 'Song Time', value: this.decodeText(song.songTime) },
      { label: 'Music Style', value: this.decodeText(song.musicStyle) },
    ].filter((item) => item.value);

    if (meta.length) {
      y = this.addPdfMetaCards(doc, meta, y, margin, contentWidth, pageWidth, bottom, theme);
    }

    y = this.addPdfBandMembers(doc, bandGroups, y, margin, contentWidth, bottom, theme);

    const credits = [
      { label: 'Songwriter', value: this.decodeText(song.songwriter) },
      { label: 'Record Label', value: this.decodeText(song.recordLabel) },
      { label: 'Website', value: this.decodeText(song.website) },
      { label: 'Contact Email', value: this.decodeText(song.contactEmail) },
    ].filter((item) => item.value);

    y = this.addPdfCredits(doc, credits, y, margin, contentWidth, pageWidth, bottom, theme);
    this.addPdfFooter(doc, pageWidth, margin, bottom, theme);

    doc.save(this.pdfFilename(song));
  },
};