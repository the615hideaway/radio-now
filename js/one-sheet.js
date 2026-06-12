const OneSheet = {
  fields: [
    { key: 'year', label: 'Year' },
    { key: 'songTime', label: 'Song Time' },
    { key: 'musicStyle', label: 'Music Style' },
    { key: 'songwriter', label: 'Songwriter' },
    { key: 'featuredArtist', label: 'Featured Artist' },
    { key: 'recordLabel', label: 'Record Label' },
    { key: 'contactEmail', label: 'Contact' },
    { key: 'website', label: 'Website' },
  ],

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

  formatFieldValue(key, value) {
    const text = this.decodeText(value);
    if (!text) return '';
    if (key === 'contactEmail') {
      return `<a href="mailto:${this.escapeHtml(text)}">${this.escapeHtml(text)}</a>`;
    }
    if (key === 'website') {
      return `<a href="${this.escapeHtml(text)}" target="_blank" rel="noopener">${this.escapeHtml(text)}</a>`;
    }
    return this.escapeHtml(text);
  },

  renderBandMembersSection(song) {
    const lines = this.buildBandMemberLines(song);
    if (!lines.length) return '';

    const lineHtml = lines
      .map((line) => `<div class="band-line">${this.escapeHtml(line)}</div>`)
      .join('');

    return `
    <section class="band-members">
      <h4>Band Members</h4>
      <div class="band-lines">${lineHtml}</div>
    </section>`;
  },

  generateHtml(song, options = {}) {
    const artist = this.decodeText(song.artistName) || 'Unknown Artist';
    const title = this.decodeText(song.songTitle) || 'Untitled';
    const description = this.decodeText(song.description);
    const coverFile = options.coverFile || 'cover.jpg';
    const coverHtml = options.hasCover
      ? `<img class="cover" src="${this.escapeHtml(coverFile)}" alt="${this.escapeHtml(title)} cover art">`
      : '<div class="cover cover-placeholder">Cover not available</div>';

    const detailRows = this.fields
      .map((field) => {
        const value = this.formatFieldValue(field.key, song[field.key]);
        if (!value) return '';
        return `
          <div class="detail">
            <dt>${this.escapeHtml(field.label)}</dt>
            <dd>${value}</dd>
          </div>`;
      })
      .filter(Boolean)
      .join('');

    const bandMembersSection = this.renderBandMembersSection(song);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(artist)} — ${this.escapeHtml(title)} | Radio Now One-Sheet</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: #111;
      background: #fff;
      line-height: 1.5;
    }
    .sheet {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.55in;
    }
    .brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #f4c430;
      padding-bottom: 0.35rem;
      margin-bottom: 1rem;
    }
    .brand h1 {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 1.15rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #b8860b;
    }
    .brand p {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.75rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .hero {
      display: grid;
      grid-template-columns: 2.2in 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .cover {
      width: 2.2in;
      height: 2.2in;
      object-fit: cover;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #f5f5f5;
    }
    .cover-placeholder {
      display: grid;
      place-items: center;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.8rem;
      color: #999;
    }
    .title-block h2 {
      margin: 0 0 0.25rem;
      font-size: 1.65rem;
      line-height: 1.15;
      color: #111;
    }
    .title-block h3 {
      margin: 0 0 0.75rem;
      font-size: 1.1rem;
      font-weight: normal;
      color: #444;
    }
    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem 1rem;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.82rem;
    }
    .detail dt {
      margin: 0;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.68rem;
      color: #888;
    }
    .detail dd {
      margin: 0.1rem 0 0;
      color: #222;
    }
    .detail dd a { color: #8b6914; word-break: break-word; }
    .description,
    .band-members {
      border-top: 1px solid #ddd;
      padding-top: 0.85rem;
      margin-top: 0.85rem;
    }
    .description h4,
    .band-members h4 {
      margin: 0 0 0.45rem;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
    }
    .description p {
      margin: 0;
      font-size: 0.92rem;
      color: #333;
      white-space: pre-wrap;
    }
    .band-lines {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.88rem;
      color: #333;
      line-height: 1.55;
    }
    .band-line {
      margin: 0;
    }
    .footer {
      margin-top: 1rem;
      padding-top: 0.65rem;
      border-top: 1px solid #eee;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.72rem;
      color: #777;
      text-align: center;
    }
    @media print {
      body { background: #fff; }
      .sheet { padding: 0.45in; }
      .detail dd a { color: #000; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <h1>Radio Now</h1>
      <p>(615) Hideaway Entertainment</p>
    </div>
    <div class="hero">
      ${coverHtml}
      <div class="title-block">
        <h2>${this.escapeHtml(title)}</h2>
        <h3>${this.escapeHtml(artist)}</h3>
        <dl class="details">
          ${detailRows}
        </dl>
      </div>
    </div>
    ${description ? `
    <section class="description">
      <h4>Description</h4>
      <p>${this.escapeHtml(description)}</p>
    </section>` : ''}
    ${bandMembersSection}
    <div class="footer">Radio Now DJ One-Sheet — For radio programmer use only</div>
  </div>
</body>
</html>`;
  },
};