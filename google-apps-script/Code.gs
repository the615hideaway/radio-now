/**
 * Radio Now — Google Sheets Backend
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Sheet columns (row 1 headers):
 * Artist Name, Song Title, Year, MP3, Preview Link, WAV, Cover, Song Time,
 * Description, Music Style, Band Members, Songwriter, Featured Artist,
 * Website, Record Label, Contact E-Mail
 */

const SHEET_NAME = 'Sheet1';

const COLUMN_MAP = {
  artistName: ['Artist Name'],
  songTitle: ['Song Title'],
  year: ['Year'],
  mp3: ['MP3', 'MP3s'],
  previewLink: ['Preview Link', 'Audio', 'Preview'],
  wav: ['WAV'],
  cover: ['Cover', 'Cover Art'],
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
  const match = String(url || '').match(/\/file\/d\/([^/]+)/);
  return match ? match[1] : '';
}

function toDriveDownload_(url) {
  const id = extractDriveId_(url);
  return id ? 'https://drive.google.com/uc?export=download&id=' + id : String(url || '');
}

function rowToSong_(row, headerMap, rowIndex) {
  const song = { id: 'row-' + rowIndex, rowIndex: rowIndex };

  Object.keys(COLUMN_MAP).forEach((field) => {
    song[field] = pickValue_(row, headerMap, COLUMN_MAP[field]);
  });

  if (song.mp3) song.mp3 = toDriveDownload_(song.mp3);
  if (song.wav) song.wav = toDriveDownload_(song.wav);

  if (!song.previewLink || String(song.previewLink).indexOf('wix:') === 0) {
    song.previewLink = song.mp3 || song.previewLink;
  } else if (extractDriveId_(song.previewLink)) {
    song.previewLink = toDriveDownload_(song.previewLink);
  }

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
  const base = (artist || 'Unknown') + ' - ' + (title || 'Track');
  return base.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim() + '.' + ext;
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

function createZip_(songs, format) {
  const blobs = [];
  const skipped = [];

  songs.forEach((song) => {
    try {
      const url = format === 'wav' && song.wav ? song.wav : song.mp3;
      if (!url) throw new Error('No ' + format.toUpperCase() + ' link');

      const blob = fetchFileBlob_(url);
      const ext = format === 'wav' ? 'wav' : 'mp3';
      blob.setName(safeName_(song.artistName, song.songTitle, ext));
      blobs.push(blob);
    } catch (err) {
      skipped.push((song.songTitle || 'Track') + ': ' + err.message);
    }
  });

  if (!blobs.length) {
    throw new Error('No files could be downloaded. ' + skipped.join('; '));
  }

  const zipBlob = Utilities.zip(blobs);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  zipBlob.setName('radio-now-' + format + '-' + stamp + '.zip');

  return {
    zipBlob: zipBlob,
    skipped: skipped,
  };
}

function doGet(e) {
  try {
    const action = (e.parameter.action || 'list').toLowerCase();

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
        skipped: result.skipped,
      });
    }

    return jsonResponse_({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}