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

function coverJsonResponse_(driveId) {
  if (!driveId) throw new Error('Missing Drive file id');

  const blob = fetchDriveBlobById_(driveId);
  const mime = blob.getContentType() || 'image/jpeg';

  return jsonResponse_({
    success: true,
    mimeType: mime,
    dataBase64: Utilities.base64Encode(blob.getBytes()),
  });
}

function streamDriveFile_(driveId) {
  if (!driveId) throw new Error('Missing Drive file id');

  const blob = fetchDriveBlobById_(driveId);
  const mime = blob.getContentType() || 'application/octet-stream';

  return jsonResponse_({
    success: true,
    mimeType: mime,
    dataBase64: Utilities.base64Encode(blob.getBytes()),
  });
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

var DJ_SHEET_NAME = 'DJs';
var DJ_HEADERS = ['dj_id', 'name', 'email', 'password_hash', 'password_salt', 'station', 'show_name', 'share_email', 'status', 'created_at'];
var ACTIVITY_SHEET_NAME = 'DJ Activity';
var ACTIVITY_HEADERS = [
  'activity_id', 'timestamp', 'dj_id', 'dj_name', 'dj_station', 'dj_show_name',
  'share_email', 'contact_email', 'event_type', 'song_id', 'song_title', 'artist_name', 'music_style', 'format',
];

function getAuthSecret_() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('AUTH_SECRET');
  if (!secret) {
    secret = Utilities.getUuid();
    props.setProperty('AUTH_SECRET', secret);
  }
  return secret;
}

function bytesToHex_(bytes) {
  return bytes.map(function (byte) {
    var value = byte < 0 ? byte + 256 : byte;
    var hex = value.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function hmacHex_(value) {
  var sig = Utilities.computeHmacSha256Signature(String(value), getAuthSecret_());
  return bytesToHex_(sig);
}

function hashPassword_(password, salt) {
  salt = salt || Utilities.getUuid();
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ':' + password + ':' + getAuthSecret_(),
    Utilities.Charset.UTF_8
  );
  return {
    salt: salt,
    hash: bytesToHex_(digest),
  };
}

function verifyPassword_(password, salt, hash) {
  return hashPassword_(password, salt).hash === hash;
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function getDjSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DJ_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DJ_SHEET_NAME);
    sheet.getRange(1, 1, 1, DJ_HEADERS.length).setValues([DJ_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  ensureSheetHeaders_(sheet, DJ_HEADERS);
  return sheet;
}

function getActivitySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ACTIVITY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ACTIVITY_SHEET_NAME);
    sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  ensureSheetHeaders_(sheet, ACTIVITY_HEADERS);
  return sheet;
}

function ensureSheetHeaders_(sheet, headers) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  existing.forEach(function (header, index) {
    var key = String(header || '').trim();
    if (key) map[key] = true;
  });

  headers.forEach(function (header) {
    if (!map[header]) {
      lastCol += 1;
      sheet.getRange(1, lastCol).setValue(header);
      map[header] = true;
    }
  });
}

function shareEmailFlag_(value) {
  var normalized = String(value || '').trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'y';
}

function shareEmailValue_(enabled) {
  return enabled ? 'yes' : 'no';
}

function getDjHeaderMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function (header, index) {
    var key = String(header || '').trim();
    if (key) map[key] = index;
  });
  return map;
}

function djRowToObject_(row, headerMap) {
  function pick(key) {
    var idx = headerMap[key];
    if (idx === undefined) return '';
    return String(row[idx] || '').trim();
  }

  return {
    dj_id: pick('dj_id'),
    name: pick('name'),
    email: pick('email'),
    password_hash: pick('password_hash'),
    password_salt: pick('password_salt'),
    station: pick('station'),
    show_name: pick('show_name'),
    share_email: pick('share_email'),
    status: pick('status') || 'active',
    created_at: pick('created_at'),
  };
}

function findDjById_(djId) {
  var targetId = String(djId || '').trim();
  if (!targetId) return null;

  var sheet = getDjSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var dj = djRowToObject_(rows[i], headerMap);
    if (dj.dj_id === targetId) {
      return { rowIndex: i + 1, dj: dj };
    }
  }

  return null;
}

function findDjByEmail_(email) {
  var sheet = getDjSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var dj = djRowToObject_(rows[i], headerMap);
    if (normalizeEmail_(dj.email) === email) return dj;
  }

  return null;
}

function publicDj_(dj) {
  return {
    id: dj.dj_id,
    name: dj.name,
    email: dj.email,
    station: dj.station,
    showName: dj.show_name || '',
    shareEmail: shareEmailFlag_(dj.share_email),
    status: dj.status,
  };
}

function parseSessionToken_(token) {
  if (!token) throw new Error('Not signed in.');

  var decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(String(token))).getDataAsString();
  var sigIndex = decoded.lastIndexOf('|');
  if (sigIndex < 0) throw new Error('Invalid session.');

  var body = decoded.substring(0, sigIndex);
  var sig = decoded.substring(sigIndex + 1);
  if (hmacHex_(body) !== sig) throw new Error('Invalid session.');

  var parts = body.split('|');
  if (parts.length < 3) throw new Error('Invalid session.');

  var exp = parseInt(parts[2], 10);
  if (!exp || exp < Date.now()) throw new Error('Session expired. Please sign in again.');

  return {
    djId: parts[0],
    email: parts[1],
    exp: exp,
  };
}

function requireDjSession_(token) {
  var session = parseSessionToken_(token);
  var found = findDjById_(session.djId);
  if (!found || String(found.dj.status).toLowerCase() !== 'active') {
    throw new Error('DJ account not found or inactive.');
  }
  return found;
}

function createSessionToken_(dj) {
  var exp = Date.now() + (7 * 24 * 60 * 60 * 1000);
  var body = dj.dj_id + '|' + normalizeEmail_(dj.email) + '|' + exp;
  return Utilities.base64EncodeWebSafe(body + '|' + hmacHex_(body));
}

function djLogin_(email, password) {
  email = normalizeEmail_(email);
  password = String(password || '');

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  var dj = findDjByEmail_(email);
  if (!dj || !dj.password_hash || !dj.password_salt) {
    throw new Error('Invalid email or password.');
  }

  if (String(dj.status).toLowerCase() !== 'active') {
    throw new Error('This DJ account is not active yet. Contact Radio Now if you need access.');
  }

  if (!verifyPassword_(password, dj.password_salt, dj.password_hash)) {
    throw new Error('Invalid email or password.');
  }

  return {
    success: true,
    token: createSessionToken_(dj),
    dj: publicDj_(dj),
  };
}

function djSignup_(payload) {
  var name = String(payload.name || '').trim();
  var station = String(payload.station || '').trim();
  var showName = String(payload.showName || '').trim();
  var email = normalizeEmail_(payload.email);
  var password = String(payload.password || '');
  var shareEmail = !!payload.shareEmail;

  if (!name || !station || !email || !password) {
    throw new Error('Name, station, email, and password are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  if (findDjByEmail_(email)) {
    throw new Error('An account with this email already exists. Try signing in instead.');
  }

  var sheet = getDjSheet_();
  var hashed = hashPassword_(password);
  var djId = 'dj-' + Utilities.getUuid().slice(0, 8);
  var createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  sheet.appendRow([
    djId,
    name,
    email,
    hashed.hash,
    hashed.salt,
    station,
    showName,
    shareEmailValue_(shareEmail),
    'active',
    createdAt,
  ]);

  var dj = {
    dj_id: djId,
    name: name,
    email: email,
    station: station,
    show_name: showName,
    share_email: shareEmailValue_(shareEmail),
    status: 'active',
    created_at: createdAt,
  };

  return {
    success: true,
    token: createSessionToken_(dj),
    dj: publicDj_(dj),
  };
}

function logDjActivity_(token, payload) {
  var found = requireDjSession_(token);
  var dj = found.dj;
  var share = shareEmailFlag_(dj.share_email);
  var sheet = getActivitySheet_();
  var activityId = 'act-' + Utilities.getUuid().slice(0, 10);
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  sheet.appendRow([
    activityId,
    timestamp,
    dj.dj_id,
    dj.name,
    dj.station,
    dj.show_name,
    share ? 'yes' : 'no',
    share ? dj.email : '',
    String(payload.eventType || '').trim(),
    String(payload.songId || '').trim(),
    String(payload.songTitle || '').trim(),
    String(payload.artistName || '').trim(),
    String(payload.musicStyle || '').trim(),
    String(payload.format || '').trim(),
  ]);

  return { success: true };
}

function listDjActivity_(djId, limit) {
  var sheet = getActivitySheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var items = [];

  for (var i = rows.length - 1; i >= 1; i--) {
    var row = rows[i];
    function pick(key) {
      var idx = headerMap[key];
      if (idx === undefined) return '';
      return String(row[idx] || '').trim();
    }

    if (pick('dj_id') !== djId) continue;

    items.push({
      id: pick('activity_id'),
      timestamp: pick('timestamp'),
      eventType: pick('event_type'),
      songId: pick('song_id'),
      songTitle: pick('song_title'),
      artistName: pick('artist_name'),
      musicStyle: pick('music_style'),
      format: pick('format'),
    });

    if (items.length >= limit) break;
  }

  return items;
}

function computeDjStats_(activity) {
  var now = Date.now();
  var weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  var monthAgo = now - (30 * 24 * 60 * 60 * 1000);
  var uniqueSongs = {};
  var weekCount = 0;
  var monthCount = 0;

  activity.forEach(function (item) {
    if (item.songId) uniqueSongs[item.songId] = true;
    var ts = Date.parse(item.timestamp);
    if (!isNaN(ts)) {
      if (ts >= weekAgo) weekCount += 1;
      if (ts >= monthAgo) monthCount += 1;
    }
  });

  return {
    totalDownloads: activity.length,
    thisWeek: weekCount,
    thisMonth: monthCount,
    uniqueSongs: Object.keys(uniqueSongs).length,
  };
}

function isDownloadEvent_(eventType) {
  var type = String(eventType || '').trim().toLowerCase();
  return type === 'downloaded'
    || type === 'download_mp3'
    || type === 'download_wav'
    || type === 'download_zip';
}

function bumpChartCount_(bucket, songId, meta, timestampMs) {
  if (!bucket[songId]) {
    bucket[songId] = {
      songId: songId,
      songTitle: meta.songTitle || 'Untitled',
      artistName: meta.artistName || 'Unknown Artist',
      musicStyle: meta.musicStyle || '',
      count: 0,
    };
  }

  bucket[songId].count += 1;
  if (meta.songTitle) bucket[songId].songTitle = meta.songTitle;
  if (meta.artistName) bucket[songId].artistName = meta.artistName;
  if (meta.musicStyle) bucket[songId].musicStyle = meta.musicStyle;
}

function sortChartEntries_(bucket, limit) {
  return Object.keys(bucket)
    .map(function (key) { return bucket[key]; })
    .sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return String(a.songTitle).localeCompare(String(b.songTitle));
    })
    .slice(0, limit || 10);
}

function computeCharts_(limit) {
  var sheet = getActivitySheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var now = Date.now();
  var weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  var monthAgo = now - (30 * 24 * 60 * 60 * 1000);
  var weekCounts = {};
  var monthCounts = {};

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    function pick(key) {
      var idx = headerMap[key];
      if (idx === undefined) return '';
      return String(row[idx] || '').trim();
    }

    if (!isDownloadEvent_(pick('event_type'))) continue;

    var songId = pick('song_id');
    if (!songId) continue;

    var ts = Date.parse(pick('timestamp'));
    if (isNaN(ts)) continue;

    var meta = {
      songTitle: pick('song_title'),
      artistName: pick('artist_name'),
      musicStyle: pick('music_style'),
    };

    if (ts >= weekAgo) bumpChartCount_(weekCounts, songId, meta, ts);
    if (ts >= monthAgo) bumpChartCount_(monthCounts, songId, meta, ts);
  }

  return {
    success: true,
    week: sortChartEntries_(weekCounts, limit),
    month: sortChartEntries_(monthCounts, limit),
  };
}

function djDashboard_(token) {
  var found = requireDjSession_(token);
  var activity = listDjActivity_(found.dj.dj_id, 250);

  return {
    success: true,
    dj: publicDj_(found.dj),
    stats: computeDjStats_(activity),
    activity: activity,
  };
}

function djProfileUpdate_(token, shareEmail) {
  var found = requireDjSession_(token);
  var sheet = getDjSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var shareCol = headerMap.share_email;

  if (shareCol === undefined) {
    throw new Error('share_email column missing from DJs sheet.');
  }

  sheet.getRange(found.rowIndex, shareCol + 1).setValue(shareEmailValue_(!!shareEmail));
  found.dj.share_email = shareEmailValue_(!!shareEmail);

  return {
    success: true,
    dj: publicDj_(found.dj),
  };
}

function doGet(e) {
  try {
    const action = (e.parameter.action || 'list').toLowerCase();

    if (action === 'stream') {
      return streamDriveFile_(e.parameter.id);
    }

    if (action === 'media') {
      return streamMedia_(e.parameter.id);
    }

    if (action === 'cover') {
      return coverJsonResponse_(e.parameter.id);
    }

    if (action === 'list') {
      return jsonResponse_(listSongs_());
    }

    if (action === 'charts') {
      var chartLimit = parseInt(e.parameter.limit, 10);
      return jsonResponse_(computeCharts_(isNaN(chartLimit) ? 10 : chartLimit));
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

    if (action === 'dj_login') {
      return jsonResponse_(djLogin_(body.email, body.password));
    }

    if (action === 'dj_signup') {
      return jsonResponse_(djSignup_(body));
    }

    if (action === 'dj_log') {
      return jsonResponse_(logDjActivity_(body.token, body));
    }

    if (action === 'dj_dashboard') {
      return jsonResponse_(djDashboard_(body.token));
    }

    if (action === 'dj_profile_update') {
      return jsonResponse_(djProfileUpdate_(body.token, body.shareEmail));
    }

    return jsonResponse_({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}