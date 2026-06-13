/**
 * Radio Now — Google Sheets Backend
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 */

const SHEET_NAME = 'Sheet1';

const COLUMN_MAP = {
  artistName: ['Artist Name'],
  songTitle: ['Song Title'],
  year: ['Year'],
  mp3: ['MP3', 'MP3s'],
  wav: ['WAV'],
  cover: ['Cover Art', 'Cover'],
  songTime: ['Song Time', 'Duration'],
  description: ['Description'],
  musicStyle: ['Music Style', 'Style'],
  bandMembers: ['Band Members', 'Musicians'],
  songwriter: ['Songwriter', 'Writers'],
  featuredArtist: ['Featured Artist'],
  website: ['Website'],
  recordLabel: ['Record Label', 'Label'],
  contactEmail: ['Contact E-Mail', 'Contact Email', 'Email'],
};

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  return sheet;
}

function getHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};

  headers.forEach((header, index) => {
    const key = String(header || '').trim();
    if (key) map[key] = index;
  });

  return map;
}

function pickValue_(row, headerMap, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const idx = headerMap[aliases[i]];
    if (idx !== undefined) {
      const value = row[idx];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
  }
  return '';
}

function extractDriveId_(url) {
  const value = String(url || '');
  const fileMatch = value.match(/\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = value.match(/[?&]id=([^&]+)/);
  return openMatch ? openMatch[1] : '';
}

function toDriveDownload_(url) {
  const id = extractDriveId_(url);
  return id ? 'https://drive.google.com/uc?export=download&id=' + id : String(url || '');
}

function formatInstrumentLine_(value) {
  var text = String(value || '').trim();
  if (!text) return '';
  var match = text.match(/^(.+?)\s*-\s*(.+)$/);
  return match ? match[1].trim() + ': ' + match[2].trim() : text;
}

function buildBandMemberLines_(row, headerMap) {
  var lines = [];
  var lead = pickValue_(row, headerMap, ['Lead Vocals']);
  if (lead) lines.push('Lead Vocals: ' + lead);

  for (var h = 1; h <= 4; h++) {
    var harmony = pickValue_(row, headerMap, ['Harmony Vocals ' + h]);
    if (harmony) lines.push('Harmony Vocals: ' + harmony);
  }

  for (var p = 1; p <= 8; p++) {
    var player = pickValue_(row, headerMap, ['Instrument  Player ' + p, 'Instrument Player ' + p]);
    if (player) lines.push(formatInstrumentLine_(player));
  }

  var legacy = pickValue_(row, headerMap, ['Band Members', 'Musicians']);
  if (legacy) {
    legacy.split(/\r?\n/).forEach(function (line) {
      line = String(line || '').trim();
      if (line) lines.push(line);
    });
  }

  return lines;
}

function bandMemberLinesFromSong_(song) {
  var groups = buildBandMemberGroups_(song);
  return groups.vocals.concat(groups.instruments);
}

function isVocalLine_(line) {
  return /^(Lead Vocals|Harmony Vocals):/i.test(String(line || '').trim());
}

function buildBandMemberGroups_(song) {
  var lines = [];

  if (song.bandMemberLines && song.bandMemberLines.length) {
    lines = song.bandMemberLines.map(function (line) {
      return stripHtml_(line);
    }).filter(function (line) { return !!line; });
  } else {
    var text = stripHtml_(song.bandMembers);
    if (text) {
      lines = text.split(';').map(function (line) {
        return formatInstrumentLine_(String(line || '').trim());
      }).filter(function (line) { return !!line; });
    }
  }

  var vocals = [];
  var instruments = [];

  lines.forEach(function (line) {
    if (isVocalLine_(line)) vocals.push(line);
    else instruments.push(line);
  });

  return { vocals: vocals, instruments: instruments };
}

function rowToSong_(row, headerMap, rowIndex) {
  const song = { id: 'row-' + rowIndex, rowIndex: rowIndex };

  Object.keys(COLUMN_MAP).forEach((field) => {
    song[field] = pickValue_(row, headerMap, COLUMN_MAP[field]);
  });

  const mp3Raw = song.mp3;
  if (song.mp3) song.mp3 = toDriveDownload_(song.mp3);
  if (song.wav) song.wav = toDriveDownload_(song.wav);

  song.bandMemberLines = buildBandMemberLines_(row, headerMap);
  song.bandMembers = song.bandMemberLines.join('; ') || song.bandMembers;
  song.previewLink = mp3Raw || '';
  song.previewDriveId = extractDriveId_(mp3Raw) || '';

  return song;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function listSongs_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) {
    return { success: true, songs: [] };
  }

  const headerMap = getHeaderMap_(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const songs = rows
    .map((row, i) => rowToSong_(row, headerMap, i + 2))
    .filter((song) => song.artistName || song.songTitle);

  return { success: true, songs: songs };
}

function safeName_(artist, title, ext) {
  const base = folderName_(artist, title);
  return base + '.' + ext;
}

function folderName_(artist, title) {
  return ((artist || 'Unknown') + ' - ' + (title || 'Track'))
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Track';
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtml_(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function promoStyles_() {
  return '*{box-sizing:border-box;margin:0;padding:0}body{margin:0;padding:0;background:#fff;color:#111}'
    + '.promo-sheet{width:7.5in;padding:.4in .45in .5in;font-family:Georgia,serif;color:#111;background:#fff;line-height:1.45}'
    + '.promo-brand{border-bottom:3px solid #d4a017;padding-bottom:8px;margin-bottom:16px;font-family:Arial,sans-serif}'
    + '.promo-brand-title{font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a7b0a}'
    + '.promo-brand-sub{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#666;text-align:right}'
    + '.hero-table{width:100%;border-collapse:collapse;margin-bottom:14px}'
    + '.hero-table td{vertical-align:top;padding:0}'
    + '.cover-cell{width:2.2in;padding-right:14px!important}'
    + '.promo-cover{width:2.1in;height:2.1in;object-fit:cover;border:1px solid #ccc;border-radius:4px;background:#f3f3f3;display:block}'
    + '.promo-cover-placeholder{width:2.1in;height:2.1in;border:1px solid #ccc;border-radius:4px;background:#f3f3f3;font-family:Arial,sans-serif;font-size:11px;color:#999;text-align:center;padding:12px}'
    + '.promo-title{font-family:Arial,sans-serif;font-size:28px;line-height:1.1;font-weight:700;color:#111;margin-bottom:8px}'
    + '.promo-artist{font-family:Arial,sans-serif;font-size:18px;font-weight:400;color:#444}'
    + '.meta-table{width:100%;border-collapse:collapse;margin-bottom:14px;border-bottom:1px solid #ddd}'
    + '.meta-table td{padding:0 18px 10px 0;vertical-align:top;font-family:Arial,sans-serif}'
    + '.meta-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:3px}'
    + '.meta-value{font-size:13px;font-weight:600;color:#111}'
    + '.promo-block{margin-bottom:14px}'
    + '.promo-block h3{font-family:Arial,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:6px}'
    + '.promo-block p,.promo-line{font-family:Arial,sans-serif;font-size:12px;color:#333;line-height:1.5;margin:0 0 3px}'
    + '.band-group-spacer{height:14px}'
    + '.credits-table{width:100%;border-collapse:collapse;border-top:1px solid #ddd}'
    + '.credits-table td{width:50%;padding:10px 12px 0 0;vertical-align:top;font-family:Arial,sans-serif;font-size:12px;color:#111}'
    + '.credit-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:3px}'
    + '.credit-value{color:#111;word-break:break-word}'
    + '.credit-value a{color:#111;text-decoration:none}'
    + '.promo-footer{margin-top:16px;padding-top:10px;border-top:1px solid #eee;text-align:center;font-family:Arial,sans-serif;font-size:9px;color:#777;letter-spacing:.04em}';
}

function renderMetaRow_(song) {
  var items = [
    { label: 'Year', value: stripHtml_(song.year) },
    { label: 'Song Time', value: stripHtml_(song.songTime) },
    { label: 'Music Style', value: stripHtml_(song.musicStyle) },
  ];

  var cells = [];
  items.forEach(function (item) {
    if (!item.value) return;
    cells.push('<td><div class="meta-label">' + escapeHtml_(item.label) + '</div>'
      + '<div class="meta-value">' + escapeHtml_(item.value) + '</div></td>');
  });

  return cells.length ? '<table class="meta-table"><tr>' + cells.join('') + '</tr></table>' : '';
}

function renderCreditsBlock_(song) {
  var items = [
    { label: 'Songwriter', value: stripHtml_(song.songwriter), kind: 'text' },
    { label: 'Record Label', value: stripHtml_(song.recordLabel), kind: 'text' },
    { label: 'Website', value: stripHtml_(song.website), kind: 'url' },
    { label: 'Contact Email', value: stripHtml_(song.contactEmail), kind: 'email' },
  ];

  var cells = [];
  items.forEach(function (item) {
    if (!item.value) return;
    var valueHtml = escapeHtml_(item.value);
    if (item.kind === 'email') valueHtml = '<a href="mailto:' + valueHtml + '">' + valueHtml + '</a>';
    if (item.kind === 'url') valueHtml = '<a href="' + valueHtml + '">' + valueHtml + '</a>';
    cells.push('<td><div class="credit-label">' + escapeHtml_(item.label) + '</div>'
      + '<div class="credit-value">' + valueHtml + '</div></td>');
  });

  if (!cells.length) return '';

  var rows = [];
  for (var i = 0; i < cells.length; i += 2) {
    rows.push('<tr>' + cells[i] + (cells[i + 1] || '<td></td>') + '</tr>');
  }

  return '<table class="credits-table">' + rows.join('') + '</table>';
}

function renderBandMembersBlock_(song) {
  var groups = buildBandMemberGroups_(song);
  if (!groups.vocals.length && !groups.instruments.length) return '';

  var renderLine = function (line) {
    return '<p class="promo-line">' + escapeHtml_(line) + '</p>';
  };

  var lineHtml = groups.vocals.map(renderLine).join('')
    + (groups.vocals.length && groups.instruments.length ? '<div class="band-group-spacer"></div>' : '')
    + groups.instruments.map(renderLine).join('');

  return '<div class="promo-block"><h3>Band Members</h3>' + lineHtml + '</div>';
}

function generateOneSheetHtml_(song, coverFile, hasCover) {
  var artist = stripHtml_(song.artistName) || 'Unknown Artist';
  var title = stripHtml_(song.songTitle) || 'Untitled';
  var description = stripHtml_(song.description);
  var coverHtml = hasCover
    ? '<img class="promo-cover" src="' + escapeHtml_(coverFile) + '" alt="' + escapeHtml_(title) + ' cover art" width="202" height="202">'
    : '<div class="promo-cover-placeholder">Cover art not available</div>';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>'
    + escapeHtml_(artist) + ' - ' + escapeHtml_(title)
    + ' | Radio Now One-Sheet</title><style>' + promoStyles_() + '</style></head><body>'
    + '<div class="promo-sheet">'
    + '<table class="promo-brand" width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td class="promo-brand-title">Radio Now</td>'
    + '<td class="promo-brand-sub">(615) Hideaway Entertainment</td>'
    + '</tr></table>'
    + '<table class="hero-table" cellpadding="0" cellspacing="0"><tr>'
    + '<td class="cover-cell">' + coverHtml + '</td>'
    + '<td><div class="promo-title">' + escapeHtml_(title) + '</div>'
    + '<div class="promo-artist">' + escapeHtml_(artist) + '</div></td>'
    + '</tr></table>'
    + (description ? '<div class="promo-block"><h3>Description</h3><p>' + escapeHtml_(description) + '</p></div>' : '')
    + renderMetaRow_(song)
    + renderBandMembersBlock_(song)
    + '<div class="promo-block">' + renderCreditsBlock_(song) + '</div>'
    + '<div class="promo-footer">Radio Now DJ One-Sheet — For radio programmer use only</div>'
    + '</div></body></html>';
}

function fetchCoverBlob_(song) {
  const driveId = song.coverDriveId || extractDriveId_(song.cover || '');
  if (driveId) {
    try {
      return DriveApp.getFileById(driveId).getBlob();
    } catch (err) {
      // Fall through.
    }
  }
  return null;
}

function coverExtension_(blob) {
  const type = blob.getContentType() || '';
  if (type.indexOf('png') >= 0) return 'png';
  if (type.indexOf('webp') >= 0) return 'webp';
  return 'jpg';
}

function fetchFileBlob_(url) {
  if (!url) throw new Error('Missing file URL');

  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
  });

  if (response.getResponseCode() >= 400) {
    throw new Error('HTTP ' + response.getResponseCode());
  }

  return response.getBlob();
}

function fetchDriveBlobById_(driveId) {
  if (!driveId) throw new Error('Missing Drive file id');
  return DriveApp.getFileById(driveId).getBlob();
}

function fetchSongBlob_(song, format) {
  const driveId = song.formatDriveId
    || (format === 'wav' ? (song.wavDriveId || song.mp3DriveId || song.previewDriveId) : (song.mp3DriveId || song.previewDriveId || song.wavDriveId));

  if (driveId) {
    try {
      return fetchDriveBlobById_(driveId);
    } catch (err) {
      // Fall through to URL fetch.
    }
  }

  const url = format === 'wav' && song.wav ? song.wav : song.mp3;
  if (!url) throw new Error('No ' + format.toUpperCase() + ' link');
  return fetchFileBlob_(url);
}

function streamDriveFile_(driveId) {
  if (!driveId) throw new Error('Missing Drive file id');

  const url = 'https://drive.google.com/uc?export=download&id=' + driveId;
  const blob = fetchFileBlob_(url);
  const mime = blob.getContentType() || 'audio/mpeg';

  return ContentService
    .createOutput(blob)
    .setMimeType(mime);
}

function createZip_(songs, format) {
  const blobs = [];
  const skipped = [];
  let addedSongs = 0;

  songs.forEach((song) => {
    try {
      const audioBlob = fetchSongBlob_(song, format);
      const ext = format === 'wav' ? 'wav' : 'mp3';
      const folder = folderName_(song.artistName, song.songTitle);
      const baseName = folder;

      audioBlob.setName(folder + '/' + baseName + '.' + ext);
      blobs.push(audioBlob);

      const coverBlob = fetchCoverBlob_(song);
      let coverFile = '';
      let hasCover = false;
      if (coverBlob) {
        coverFile = 'cover.' + coverExtension_(coverBlob);
        coverBlob.setName(folder + '/' + coverFile);
        blobs.push(coverBlob);
        hasCover = true;
      }

      const sheetBlob = Utilities.newBlob(
        generateOneSheetHtml_(song, coverFile, hasCover),
        'text/html',
        'one-sheet.html'
      );
      sheetBlob.setName(folder + '/one-sheet.html');
      blobs.push(sheetBlob);

      addedSongs++;
    } catch (err) {
      skipped.push((song.songTitle || 'Track') + ': ' + err.message);
    }
  });

  if (!addedSongs) {
    throw new Error('No files could be downloaded. ' + skipped.join('; '));
  }

  const zipBlob = Utilities.zip(blobs);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  zipBlob.setName('radio-now-' + format + '-' + stamp + '.zip');

  return {
    zipBlob: zipBlob,
    skipped: skipped,
    added: addedSongs,
  };
}

function doGet(e) {
  try {
    const action = (e.parameter.action || 'list').toLowerCase();

    if (action === 'stream') {
      return streamDriveFile_(e.parameter.id);
    }

    if (action === 'list') {
      return jsonResponse_(listSongs_());
    }

    return jsonResponse_({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || '').toLowerCase();

    if (action === 'zip') {
      const format = (body.format || 'mp3').toLowerCase();
      const songs = body.songs || [];
      const result = createZip_(songs, format);

      return jsonResponse_({
        success: true,
        filename: result.zipBlob.getName(),
        zipBase64: Utilities.base64Encode(result.zipBlob.getBytes()),
        added: result.added,
        skipped: result.skipped,
      });
    }

    return jsonResponse_({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}