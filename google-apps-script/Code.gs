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

function buildBandMembers_(row, headerMap) {
  const parts = [];
  const lead = pickValue_(row, headerMap, ['Lead Vocals']);
  if (lead) parts.push('Lead Vocals: ' + lead);

  for (var h = 1; h <= 4; h++) {
    var harmony = pickValue_(row, headerMap, ['Harmony Vocals ' + h]);
    if (harmony) parts.push('Harmony Vocals: ' + harmony);
  }

  for (var p = 1; p <= 8; p++) {
    var player = pickValue_(row, headerMap, ['Instrument  Player ' + p, 'Instrument Player ' + p]);
    if (player) parts.push(player);
  }

  var legacy = pickValue_(row, headerMap, ['Band Members', 'Musicians']);
  if (legacy) parts.push(legacy);

  return parts.join('; ');
}

function rowToSong_(row, headerMap, rowIndex) {
  const song = { id: 'row-' + rowIndex, rowIndex: rowIndex };

  Object.keys(COLUMN_MAP).forEach((field) => {
    song[field] = pickValue_(row, headerMap, COLUMN_MAP[field]);
  });

  const mp3Raw = song.mp3;
  if (song.mp3) song.mp3 = toDriveDownload_(song.mp3);
  if (song.wav) song.wav = toDriveDownload_(song.wav);

  song.bandMembers = buildBandMembers_(row, headerMap) || song.bandMembers;
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

function oneSheetField_(label, value, isLink) {
  if (!value) return '';
  const content = isLink === 'email'
    ? '<a href="mailto:' + escapeHtml_(value) + '">' + escapeHtml_(value) + '</a>'
    : isLink === 'url'
      ? '<a href="' + escapeHtml_(value) + '" target="_blank" rel="noopener">' + escapeHtml_(value) + '</a>'
      : escapeHtml_(value);
  return '<div class="detail"><dt>' + escapeHtml_(label) + '</dt><dd>' + content + '</dd></div>';
}

function generateOneSheetHtml_(song, coverFile, hasCover) {
  const artist = stripHtml_(song.artistName) || 'Unknown Artist';
  const title = stripHtml_(song.songTitle) || 'Untitled';
  const description = stripHtml_(song.description);
  const coverHtml = hasCover
    ? '<img class="cover" src="' + escapeHtml_(coverFile) + '" alt="' + escapeHtml_(title) + ' cover art">'
    : '<div class="cover cover-placeholder">Cover not available</div>';

  const details = [
    oneSheetField_('Year', song.year),
    oneSheetField_('Song Time', song.songTime),
    oneSheetField_('Music Style', song.musicStyle),
    oneSheetField_('Songwriter', song.songwriter),
    oneSheetField_('Featured Artist', song.featuredArtist),
    oneSheetField_('Band Members', song.bandMembers),
    oneSheetField_('Record Label', song.recordLabel),
    oneSheetField_('Contact', song.contactEmail, 'email'),
    oneSheetField_('Website', song.website, 'url'),
  ].join('');

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>'
    + escapeHtml_(artist) + ' - ' + escapeHtml_(title)
    + '</title><style>*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;color:#111;background:#fff;line-height:1.5}.sheet{max-width:8.5in;margin:0 auto;padding:.55in}.brand{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #f4c430;padding-bottom:.35rem;margin-bottom:1rem}.brand h1{margin:0;font-family:Arial,sans-serif;font-size:1.15rem;letter-spacing:.04em;text-transform:uppercase;color:#b8860b}.brand p{margin:0;font-family:Arial,sans-serif;font-size:.75rem;color:#666;text-transform:uppercase;letter-spacing:.08em}.hero{display:grid;grid-template-columns:2.2in 1fr;gap:1rem;margin-bottom:1rem}.cover{width:2.2in;height:2.2in;object-fit:cover;border:1px solid #ddd;border-radius:6px;background:#f5f5f5}.cover-placeholder{display:grid;place-items:center;font-family:Arial,sans-serif;font-size:.8rem;color:#999}.title-block h2{margin:0 0 .25rem;font-size:1.65rem;line-height:1.15}.title-block h3{margin:0 0 .75rem;font-size:1.1rem;font-weight:normal;color:#444}.details{display:grid;grid-template-columns:1fr 1fr;gap:.45rem 1rem;font-family:Arial,sans-serif;font-size:.82rem}.detail dt{margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:.68rem;color:#888}.detail dd{margin:.1rem 0 0;color:#222}.detail dd a{color:#8b6914;word-break:break-word}.description{border-top:1px solid #ddd;padding-top:.85rem;margin-top:.5rem}.description h4{margin:0 0 .45rem;font-family:Arial,sans-serif;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#888}.description p{margin:0;font-size:.92rem;color:#333;white-space:pre-wrap}.footer{margin-top:1rem;padding-top:.65rem;border-top:1px solid #eee;font-family:Arial,sans-serif;font-size:.72rem;color:#777;text-align:center}</style></head><body><div class="sheet"><div class="brand"><h1>Radio Now</h1><p>(615) Hideaway Entertainment</p></div><div class="hero">'
    + coverHtml
    + '<div class="title-block"><h2>' + escapeHtml_(title) + '</h2><h3>' + escapeHtml_(artist) + '</h3><dl class="details">'
    + details
    + '</dl></div></div>'
    + (description ? '<section class="description"><h4>Description</h4><p>' + escapeHtml_(description) + '</p></section>' : '')
    + '<div class="footer">Radio Now DJ One-Sheet — For radio programmer use only</div></div></body></html>';
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