/**
 * Radio Now — Google Sheets Backend
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * After pasting: Deploy → Manage deployments → Edit → New version → Deploy
 * Verify: GET .../exec?action=version
 *
 * Artist/label endpoints: artist_login, artist_signup, label_signup, artist_activate,
 *   artist_dashboard, song_submit, artist_profile_create, label_access_revoke
 */

var RADIO_NOW_SCRIPT_VERSION = '2026-06-15-submission-v3';
var SUBMISSION_CHUNK_FOLDER_NAME = '_RadioNowUploadChunks';
var RADIO_NOW_MUSIC_STYLES = [
  'Bluegrass',
  'Traditional Bluegrass',
  'Modern Bluegrass',
  'Progressive Bluegrass',
  'Bluegrass Gospel',
  'Gospel',
  'Country',
  'Americana',
  'Folk',
  'Holiday Music',
  'Instrumental',
];
var SUBMISSION_UPLOAD_FOLDER_ID = '1A74Xv1UosXF34hlzZ_c6gEjbER8DH5PvDNONa6f_gDPfZXSVOfCMF-jqYfOn0xryhwP7BxT4';
var RADIO_NOW_LABEL_SETUP_KEY = 'rn-615-hideaway-setup';
var RADIO_NOW_ADMIN_EMAIL = 'the615hideaway@gmail.com';
var RADIO_NOW_SITE_URL = 'https://the615hideaway.github.io/radio-now';
var RADIO_NOW_FROM_NAME = 'Radio Now — (615) Hideaway Entertainment';

function escapeEmailHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function radioNowEmailShell_(title, lines, cta) {
  var body = (lines || []).map(function (line) {
    return '<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#222;">' + line + '</p>';
  }).join('');

  var ctaHtml = '';
  if (cta && cta.href && cta.label) {
    ctaHtml = '<p style="margin:18px 0 0;">'
      + '<a href="' + escapeEmailHtml_(cta.href) + '" style="display:inline-block;padding:12px 18px;background:#c9a227;color:#111;text-decoration:none;font-weight:700;border-radius:8px;">'
      + escapeEmailHtml_(cta.label)
      + '</a></p>';
  }

  return '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">'
    + '<p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#888;">'
    + escapeEmailHtml_(RADIO_NOW_FROM_NAME)
    + '</p>'
    + '<h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#111;">'
    + escapeEmailHtml_(title)
    + '</h1>'
    + body
    + ctaHtml
    + '<p style="margin:24px 0 0;font-size:12px;color:#888;">(615) Hideaway Entertainment · Radio Now</p>'
    + '</div>';
}

function sendRadioNowEmail_(to, subject, htmlBody) {
  if (!to) return;
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody,
    name: RADIO_NOW_FROM_NAME,
  });
}

function sendRadioNowEmailSafe_(to, subject, htmlBody) {
  try {
    sendRadioNowEmail_(to, subject, htmlBody);
  } catch (err) {
    Logger.log('Radio Now email failed (' + subject + '): ' + err.message);
  }
}

function notifySignupEmails_(accountType, userEmail, displayName, extra) {
  extra = extra || {};
  var safeName = escapeEmailHtml_(displayName || 'there');
  var dashboardUrl = RADIO_NOW_SITE_URL + '/';
  var subjectPrefix = 'Welcome to Radio Now';

  if (accountType === 'dj') {
    dashboardUrl += 'index.html';
    sendRadioNowEmailSafe_(userEmail, subjectPrefix + ' — DJ account confirmed', radioNowEmailShell_(
      'Your DJ account is ready',
      [
        'Hi ' + safeName + ',',
        'Thanks for signing up on <strong>Radio Now</strong>. Browse the catalog, preview tracks, and download turn-key promo folders (MP3 or WAV, cover art, and one-sheet PDF).',
        extra.station ? '<strong>Station:</strong> ' + escapeEmailHtml_(extra.station) : '',
        extra.program ? '<strong>Program:</strong> ' + escapeEmailHtml_(extra.program) : '',
      ].filter(Boolean),
      { href: dashboardUrl, label: 'Open Radio Now catalog' }
    ));
    sendRadioNowEmailSafe_(RADIO_NOW_ADMIN_EMAIL, 'New DJ signup — ' + (displayName || userEmail), radioNowEmailShell_(
      'New DJ account',
      [
        '<strong>Name:</strong> ' + escapeEmailHtml_(displayName || '—'),
        '<strong>Email:</strong> ' + escapeEmailHtml_(userEmail),
        '<strong>Station:</strong> ' + escapeEmailHtml_(extra.station || '—'),
        '<strong>Program:</strong> ' + escapeEmailHtml_(extra.program || '—'),
      ],
      { href: dashboardUrl, label: 'Open site' }
    ));
    return;
  }

  if (accountType === 'label') {
    dashboardUrl += 'artist-dashboard.html';
    sendRadioNowEmailSafe_(userEmail, subjectPrefix + ' — Label account confirmed', radioNowEmailShell_(
      'Your label account is ready',
      [
        'Hi ' + safeName + ',',
        'Your <strong>Radio Now</strong> label account is active. Create artist profiles, submit new songs, and track spins and charts for your roster.',
      ],
      { href: dashboardUrl, label: 'Open label dashboard' }
    ));
    sendRadioNowEmailSafe_(RADIO_NOW_ADMIN_EMAIL, 'New label signup — ' + (displayName || userEmail), radioNowEmailShell_(
      'New label account',
      [
        '<strong>Label:</strong> ' + escapeEmailHtml_(displayName || '—'),
        '<strong>Email:</strong> ' + escapeEmailHtml_(userEmail),
      ],
      { href: dashboardUrl, label: 'Open dashboard' }
    ));
    return;
  }

  dashboardUrl += 'artist-dashboard.html';
  sendRadioNowEmailSafe_(userEmail, subjectPrefix + ' — Artist account confirmed', radioNowEmailShell_(
    'Your artist account is ready',
    [
      'Hi ' + safeName + ',',
      'Thanks for joining <strong>Radio Now</strong>. Download turn-key promo ZIPs, see who spun your music, and track chart history for your next pitch sheet.',
      extra.claimed ? 'You claimed your artist profile — you control access; labels you remove cannot take your chart history with them.' : '',
    ].filter(Boolean),
    { href: dashboardUrl, label: 'Open artist dashboard' }
  ));
  sendRadioNowEmailSafe_(RADIO_NOW_ADMIN_EMAIL, 'New artist signup — ' + (displayName || userEmail), radioNowEmailShell_(
    'New artist account',
    [
      '<strong>Artist:</strong> ' + escapeEmailHtml_(displayName || '—'),
      '<strong>Email:</strong> ' + escapeEmailHtml_(userEmail),
    ],
    { href: dashboardUrl, label: 'Open dashboard' }
  ));
}

function notifySongSubmissionEmails_(submission, account) {
  var userEmail = submission.contactEmail || account.email;
  var dashboardUrl = RADIO_NOW_SITE_URL + '/artist-dashboard.html';

  sendRadioNowEmailSafe_(userEmail, 'Song submitted — ' + submission.songTitle, radioNowEmailShell_(
    'We received your song',
    [
      'Thanks for submitting to <strong>Radio Now</strong>.',
      '<strong>Artist:</strong> ' + escapeEmailHtml_(submission.artistName),
      '<strong>Song:</strong> ' + escapeEmailHtml_(submission.songTitle),
      '<strong>Label:</strong> ' + escapeEmailHtml_(submission.recordLabel || '—'),
      'Status: <strong>Pending review</strong>. We will add approved songs to the catalog and email you when they are live.',
      'Turn-key promo setup is <strong>$5/song</strong> — payment integration coming soon.',
    ],
    { href: dashboardUrl, label: 'View your dashboard' }
  ));

  sendRadioNowEmailSafe_(RADIO_NOW_ADMIN_EMAIL, 'New song submission — ' + submission.songTitle, radioNowEmailShell_(
    'New song submission',
    [
      '<strong>Submission ID:</strong> ' + escapeEmailHtml_(submission.id),
      '<strong>Submitted by:</strong> ' + escapeEmailHtml_(submission.accountName) + ' (' + escapeEmailHtml_(submission.accountType) + ')',
      '<strong>Artist:</strong> ' + escapeEmailHtml_(submission.artistName),
      '<strong>Song:</strong> ' + escapeEmailHtml_(submission.songTitle),
      '<strong>Year:</strong> ' + escapeEmailHtml_(submission.year || '—'),
      '<strong>Style:</strong> ' + escapeEmailHtml_(submission.musicStyle || '—'),
      '<strong>Label:</strong> ' + escapeEmailHtml_(submission.recordLabel || '—'),
      '<strong>Release:</strong> ' + escapeEmailHtml_(submission.releaseType || 'Single'),
      '<strong>Album:</strong> ' + escapeEmailHtml_(submission.albumName || '—'),
      '<strong>Contact:</strong> ' + escapeEmailHtml_(submission.contactEmail || account.email || '—'),
      'Files are in your Radio Now Drive submissions folder. Check the <strong>Song Submissions</strong> tab in your sheet.',
    ],
    { href: 'https://docs.google.com/spreadsheets/', label: 'Open Google Sheet' }
  ));
}

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
  releaseType: ['TAG - Album/Single', 'Album/Single', 'Release Type'],
  albumName: ['Album Name', 'Album'],
  releaseDate: ['Release Date', 'Radio Now Release', 'Added Date'],
  spotlightPriority: ['Spotlight Priority', 'Spotlight'],
  spotlightUntil: ['Spotlight Until', 'Spotlight End'],
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

function driveFileShareUrl_(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';
}

function getSubmissionUploadFolder_(artistName, songTitle) {
  var root = DriveApp.getFolderById(SUBMISSION_UPLOAD_FOLDER_ID);
  var name = folderName_(artistName, songTitle);
  var folders = root.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return root.createFolder(name);
}

function submissionAssetFileName_(artistName, songTitle, assetType, originalName) {
  var ext = String(originalName || '').split('.').pop() || '';
  if (!ext) {
    if (assetType === 'mp3') ext = 'mp3';
    else if (assetType === 'wav') ext = 'wav';
    else ext = 'jpg';
  }
  return safeName_(artistName, songTitle, ext);
}

function validateSubmissionAssetMeta_(artistName, songTitle, assetType) {
  if (!artistName || !songTitle) {
    throw new Error('Artist name and song title are required before uploading files.');
  }
  if (assetType !== 'mp3' && assetType !== 'wav' && assetType !== 'cover') {
    throw new Error('Unsupported file type.');
  }
}

function saveSubmissionAssetToFolder_(artistName, songTitle, assetType, fileName, mimeType, bytes) {
  var folder = getSubmissionUploadFolder_(artistName, songTitle);
  var targetName = submissionAssetFileName_(artistName, songTitle, assetType, fileName);
  var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', targetName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    success: true,
    assetType: assetType,
    fileId: file.getId(),
    fileName: targetName,
    link: driveFileShareUrl_(file.getId()),
    downloadLink: toDriveDownload_(driveFileShareUrl_(file.getId())),
  };
}

function uploadSubmissionAsset_(token, payload) {
  requireArtistSession_(token);

  var artistName = String(payload.artistName || '').trim();
  var songTitle = String(payload.songTitle || '').trim();
  var assetType = String(payload.assetType || '').trim().toLowerCase();
  var fileName = String(payload.fileName || '').trim();
  var mimeType = String(payload.mimeType || '').trim() || 'application/octet-stream';
  var fileBase64 = String(payload.fileBase64 || '').trim();

  validateSubmissionAssetMeta_(artistName, songTitle, assetType);

  if (!fileBase64) {
    throw new Error('File data is missing.');
  }

  var bytes = Utilities.base64Decode(fileBase64);
  return saveSubmissionAssetToFolder_(artistName, songTitle, assetType, fileName, mimeType, bytes);
}

function getSubmissionChunkFolder_() {
  var root = DriveApp.getFolderById(SUBMISSION_UPLOAD_FOLDER_ID);
  var folders = root.getFoldersByName(SUBMISSION_CHUNK_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return root.createFolder(SUBMISSION_CHUNK_FOLDER_NAME);
}

function cleanupUploadChunks_(uploadId) {
  var folder = getSubmissionChunkFolder_();
  var files = folder.getFilesByName(uploadId + '_chunk_');
  var prefix = uploadId + '_chunk_';
  var all = folder.getFiles();
  while (all.hasNext()) {
    var file = all.next();
    if (String(file.getName()).indexOf(prefix) === 0) {
      file.setTrashed(true);
    }
  }
}

function readUploadSessionMeta_(uploadId) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('upload_' + uploadId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function writeUploadSessionMeta_(uploadId, meta) {
  PropertiesService.getScriptProperties().setProperty('upload_' + uploadId, JSON.stringify(meta));
}

function clearUploadSessionMeta_(uploadId) {
  PropertiesService.getScriptProperties().deleteProperty('upload_' + uploadId);
}

function uploadSubmissionStart_(token, payload) {
  var found = requireArtistSession_(token);
  var uploadId = String(payload.uploadId || '').trim();
  var artistName = String(payload.artistName || '').trim();
  var songTitle = String(payload.songTitle || '').trim();
  var assetType = String(payload.assetType || '').trim().toLowerCase();
  var fileName = String(payload.fileName || '').trim();
  var mimeType = String(payload.mimeType || '').trim() || 'application/octet-stream';
  var totalChunks = parseInt(payload.totalChunks, 10);

  if (!uploadId || uploadId.length < 8) {
    throw new Error('Upload session id is required.');
  }
  if (!totalChunks || totalChunks < 1) {
    throw new Error('Upload chunk count is required.');
  }

  validateSubmissionAssetMeta_(artistName, songTitle, assetType);
  cleanupUploadChunks_(uploadId);

  writeUploadSessionMeta_(uploadId, {
    uploadId: uploadId,
    accountId: found.artist.artist_account_id,
    artistName: artistName,
    songTitle: songTitle,
    assetType: assetType,
    fileName: fileName,
    mimeType: mimeType,
    totalChunks: totalChunks,
    startedAt: new Date().toISOString(),
  });

  return { success: true, uploadId: uploadId, totalChunks: totalChunks };
}

function uploadSubmissionChunk_(token, payload) {
  var found = requireArtistSession_(token);
  var uploadId = String(payload.uploadId || '').trim();
  var chunkIndex = parseInt(payload.chunkIndex, 10);
  var totalChunks = parseInt(payload.totalChunks, 10);
  var chunkBase64 = String(payload.chunkBase64 || '').trim();

  if (!uploadId || isNaN(chunkIndex) || chunkIndex < 0 || !chunkBase64) {
    throw new Error('Invalid upload chunk.');
  }

  var meta = readUploadSessionMeta_(uploadId);
  if (!meta || meta.accountId !== found.artist.artist_account_id) {
    throw new Error('Upload session expired. Please try again.');
  }
  if (totalChunks && meta.totalChunks !== totalChunks) {
    throw new Error('Upload session mismatch. Please try again.');
  }

  var bytes = Utilities.base64Decode(chunkBase64);
  var folder = getSubmissionChunkFolder_();
  folder.createFile(Utilities.newBlob(bytes, 'application/octet-stream', uploadId + '_chunk_' + chunkIndex));

  return {
    success: true,
    uploadId: uploadId,
    chunkIndex: chunkIndex,
    receivedChunks: chunkIndex + 1,
    totalChunks: meta.totalChunks,
  };
}

function uploadSubmissionFinish_(token, payload) {
  var found = requireArtistSession_(token);
  var uploadId = String(payload.uploadId || '').trim();
  if (!uploadId) throw new Error('Upload session id is required.');

  var meta = readUploadSessionMeta_(uploadId);
  if (!meta || meta.accountId !== found.artist.artist_account_id) {
    throw new Error('Upload session expired. Please try again.');
  }

  var folder = getSubmissionChunkFolder_();
  var prefix = uploadId + '_chunk_';
  var chunks = [];
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var name = String(file.getName());
    if (name.indexOf(prefix) !== 0) continue;
    var idx = parseInt(name.slice(prefix.length), 10);
    if (isNaN(idx)) continue;
    chunks.push({ index: idx, bytes: file.getBlob().getBytes() });
  }

  chunks.sort(function (a, b) { return a.index - b.index; });

  if (!chunks.length || chunks.length !== meta.totalChunks) {
    throw new Error('Upload incomplete (' + chunks.length + ' of ' + meta.totalChunks + ' parts). Please try again.');
  }

  var combined = [];
  chunks.forEach(function (chunk) {
    chunk.bytes.forEach(function (byte) {
      combined.push(byte < 0 ? byte + 256 : byte);
    });
  });

  var result = saveSubmissionAssetToFolder_(
    meta.artistName,
    meta.songTitle,
    meta.assetType,
    meta.fileName,
    meta.mimeType,
    combined
  );

  cleanupUploadChunks_(uploadId);
  clearUploadSessionMeta_(uploadId);

  return result;
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
var DJ_HEADERS = [
  'dj_id', 'name', 'email', 'password_hash', 'password_salt', 'station', 'show_name', 'share_email', 'status', 'created_at',
  'first_name', 'last_name', 'program_name', 'program_format', 'station_call_letters', 'station_frequency', 'state',
  'station_website', 'program_website', 'program_start_time', 'program_end_time', 'program_timezone', 'program_days',
  'dj_contact_email',
];
var ACTIVITY_SHEET_NAME = 'DJ Activity';
var ACTIVITY_HEADERS = [
  'activity_id', 'timestamp', 'dj_id', 'dj_name', 'dj_station', 'dj_show_name',
  'share_email', 'contact_email',
  'dj_first_name', 'dj_last_name', 'dj_program_name', 'dj_program_format', 'dj_station_call', 'dj_station_frequency',
  'dj_state', 'dj_station_website', 'dj_program_website', 'dj_program_start', 'dj_program_end', 'dj_program_timezone', 'dj_program_days',
  'event_type', 'song_id', 'song_title', 'artist_name', 'music_style', 'format',
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

  var firstName = pick('first_name');
  var lastName = pick('last_name');
  var programName = pick('program_name') || pick('show_name');
  var stationCall = pick('station_call_letters') || pick('station');

  return {
    dj_id: pick('dj_id'),
    name: pick('name') || djFullName_(firstName, lastName, pick('name')),
    email: pick('email'),
    password_hash: pick('password_hash'),
    password_salt: pick('password_salt'),
    station: pick('station') || stationCall,
    show_name: pick('show_name') || programName,
    share_email: pick('share_email'),
    status: pick('status') || 'active',
    created_at: pick('created_at'),
    first_name: firstName,
    last_name: lastName,
    program_name: programName,
    program_format: pick('program_format'),
    station_call_letters: stationCall,
    station_frequency: pick('station_frequency'),
    state: pick('state'),
    station_website: pick('station_website'),
    program_website: pick('program_website'),
    program_start_time: pick('program_start_time'),
    program_end_time: pick('program_end_time'),
    program_timezone: pick('program_timezone'),
    program_days: pick('program_days'),
    dj_contact_email: pick('dj_contact_email'),
  };
}

function djFullName_(firstName, lastName, fallback) {
  var full = String(firstName || '').trim();
  if (lastName) full = full ? full + ' ' + String(lastName).trim() : String(lastName).trim();
  return full || String(fallback || '').trim();
}

function appendRowByHeaders_(sheet, valuesByHeader) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = headers.map(function (header) {
    var key = String(header || '').trim();
    return valuesByHeader[key] !== undefined ? valuesByHeader[key] : '';
  });
  sheet.appendRow(row);
}

function activityRowByHeaders_(sheet, valuesByHeader) {
  appendRowByHeaders_(sheet, valuesByHeader);
}

function formatSheetTime_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  var str = String(value).trim();
  var match = str.match(/(\d{1,2}):(\d{2})/);
  if (!match) return str;
  var hour = parseInt(match[1], 10);
  var minute = match[2];
  return (hour < 10 ? '0' : '') + hour + ':' + minute;
}

function djContactEmail_(dj) {
  var contact = normalizeEmail_(dj.dj_contact_email);
  if (contact) return contact;
  return normalizeEmail_(dj.email);
}

function djActivitySnapshot_(dj, shareEmailEnabled) {
  return {
    dj_name: dj.name,
    dj_station: dj.station || dj.station_call_letters,
    dj_show_name: dj.show_name || dj.program_name,
    share_email: shareEmailValue_(shareEmailEnabled),
    contact_email: shareEmailEnabled ? djContactEmail_(dj) : '',
    dj_first_name: dj.first_name,
    dj_last_name: dj.last_name,
    dj_program_name: dj.program_name || dj.show_name,
    dj_program_format: dj.program_format,
    dj_station_call: dj.station_call_letters || dj.station,
    dj_station_frequency: dj.station_frequency,
    dj_state: dj.state,
    dj_station_website: dj.station_website,
    dj_program_website: dj.program_website,
    dj_program_start: formatSheetTime_(dj.program_start_time),
    dj_program_end: formatSheetTime_(dj.program_end_time),
    dj_program_timezone: dj.program_timezone,
    dj_program_days: dj.program_days,
  };
}

function buildDjFromSignup_(payload, djId, hashed, createdAt) {
  var firstName = String(payload.firstName || payload.first_name || '').trim();
  var lastName = String(payload.lastName || payload.last_name || '').trim();
  var programName = String(payload.programName || payload.program_name || payload.showName || '').trim();
  var stationCall = String(payload.stationCallLetters || payload.station_call_letters || payload.station || '').trim();
  var email = normalizeEmail_(payload.email);
  var shareEmail = !!payload.shareEmail;

  if (!firstName || !lastName || !programName || !stationCall || !email) {
    throw new Error('First name, last name, program name, station call letters, and email are required.');
  }

  return {
    dj_id: djId,
    name: djFullName_(firstName, lastName, payload.name),
    email: email,
    password_hash: hashed.hash,
    password_salt: hashed.salt,
    station: stationCall,
    show_name: programName,
    share_email: shareEmailValue_(shareEmail),
    status: 'active',
    created_at: createdAt,
    first_name: firstName,
    last_name: lastName,
    program_name: programName,
    program_format: String(payload.programFormat || payload.program_format || '').trim(),
    station_call_letters: stationCall,
    station_frequency: String(payload.stationFrequency || payload.station_frequency || '').trim(),
    state: String(payload.state || '').trim(),
    station_website: String(payload.stationWebsite || payload.station_website || '').trim(),
    program_website: String(payload.programWebsite || payload.program_website || '').trim(),
    program_start_time: String(payload.programStartTime || payload.program_start_time || '').trim(),
    program_end_time: String(payload.programEndTime || payload.program_end_time || '').trim(),
    program_timezone: String(payload.programTimezone || payload.program_timezone || '').trim(),
    program_days: String(payload.programDays || payload.program_days || '').trim(),
    dj_contact_email: normalizeEmail_(payload.contactEmail || payload.dj_contact_email || payload.email),
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

var DEMO_DJ_NAME = 'Sammy Passamano';
var DEMO_ARTIST_NAME = 'David Parmley';

function findDjByName_(name) {
  var target = String(name || '').trim().toLowerCase();
  if (!target) return null;

  var sheet = getDjSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var dj = djRowToObject_(rows[i], headerMap);
    if (String(dj.name || '').trim().toLowerCase() === target) return dj;
  }

  return null;
}

function getDemoDj_() {
  var props = PropertiesService.getScriptProperties();
  var email = normalizeEmail_(props.getProperty('DEMO_DJ_EMAIL') || '');
  var dj = email ? findDjByEmail_(email) : null;
  if (!dj) dj = findDjByName_(DEMO_DJ_NAME);
  if (!dj || String(dj.status).toLowerCase() !== 'active') {
    throw new Error('Demo DJ account not found. Add "' + DEMO_DJ_NAME + '" to the DJs sheet.');
  }
  return dj;
}

function demoDashboard_() {
  var dj = getDemoDj_();
  var activity = listDjActivity_(dj.dj_id, 250);

  return {
    success: true,
    demo: true,
    dj: publicDj_(dj),
    stats: computeDjStats_(activity),
    activity: activity,
  };
}

function getDemoArtist_() {
  var props = PropertiesService.getScriptProperties();
  var email = normalizeEmail_(props.getProperty('DEMO_ARTIST_EMAIL') || '');
  var found = email ? findArtistByEmail_(email) : null;
  if (!found) found = findArtistByName_(DEMO_ARTIST_NAME);
  if (found && String(found.artist.status).toLowerCase() === 'active') {
    return publicArtist_(found.artist);
  }

  if (!artistNameExistsInCatalog_(DEMO_ARTIST_NAME)) {
    throw new Error('Demo artist not found in catalog. Add "' + DEMO_ARTIST_NAME + '" to the sheet.');
  }

  return {
    id: 'demo-artist',
    artistName: DEMO_ARTIST_NAME,
    email: '',
    status: 'active',
  };
}

function artistActivityWithDjProfile_(item, dj) {
  var share = shareEmailFlag_(dj.share_email);
  var snapshot = djActivitySnapshot_(dj, share);

  return {
    id: item.id,
    timestamp: item.timestamp,
    eventType: item.eventType,
    songId: item.songId,
    songTitle: item.songTitle,
    artistName: item.artistName,
    musicStyle: item.musicStyle,
    format: item.format,
    djName: snapshot.dj_name || djFullName_(snapshot.dj_first_name, snapshot.dj_last_name, ''),
    djStation: snapshot.dj_station,
    djShowName: snapshot.dj_show_name,
    djEmail: snapshot.contact_email,
    djFirstName: snapshot.dj_first_name,
    djLastName: snapshot.dj_last_name,
    djProgramName: snapshot.dj_program_name,
    djProgramFormat: snapshot.dj_program_format,
    djStationCall: snapshot.dj_station_call,
    djStationFrequency: snapshot.dj_station_frequency,
    djState: snapshot.dj_state,
    djStationWebsite: snapshot.dj_station_website,
    djProgramWebsite: snapshot.dj_program_website,
    djProgramStart: snapshot.dj_program_start,
    djProgramEnd: snapshot.dj_program_end,
    djProgramTimezone: snapshot.dj_program_timezone,
    djProgramDays: snapshot.dj_program_days,
  };
}

function demoArtistDashboard_() {
  var artist = getDemoArtist_();
  var artistName = artist.artistName;
  var activity = listArtistActivity_(artistName, 250);
  var demoDj = getDemoDj_();
  var demoDjName = String(demoDj.name || '').trim().toLowerCase();

  activity = activity.map(function (item) {
    var itemDjName = String(item.djName || '').trim().toLowerCase();
    if (demoDjName && itemDjName && itemDjName !== demoDjName) return item;
    return artistActivityWithDjProfile_(item, demoDj);
  });

  var charts = computeArtistCharts_(artistName, 10);

  return {
    success: true,
    demo: true,
    artist: artist,
    stats: computeDjStats_(activity),
    activity: activity,
    charts: charts,
  };
}

function requireMemberSession_(token) {
  if (!token) throw new Error('Not signed in.');
  try {
    requireDjSession_(token);
    return 'dj';
  } catch (ignoreDj) {
    try {
      requireArtistSession_(token);
      return 'artist';
    } catch (ignoreArtist) {
      throw new Error('Not signed in.');
    }
  }
}

function directoryDj_(dj) {
  var pub = publicDj_(dj);
  if (shareEmailFlag_(dj.share_email)) {
    pub.email = djContactEmail_(dj);
  } else {
    pub.email = '';
  }
  return pub;
}

function listDjDirectory_(token) {
  requireMemberSession_(token);
  var sheet = getDjSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var djs = [];

  for (var i = 1; i < rows.length; i++) {
    var dj = djRowToObject_(rows[i], headerMap);
    if (String(dj.status).toLowerCase() !== 'active') continue;
    djs.push(directoryDj_(dj));
  }

  djs.sort(function (a, b) {
    var nameA = String(a.name || '').toLowerCase();
    var nameB = String(b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return {
    success: true,
    djs: djs,
  };
}

function publicDj_(dj) {
  return {
    id: dj.dj_id,
    name: dj.name,
    email: dj.email,
    contactEmail: djContactEmail_(dj),
    station: dj.station || dj.station_call_letters || '',
    showName: dj.show_name || dj.program_name || '',
    shareEmail: shareEmailFlag_(dj.share_email),
    status: dj.status,
    firstName: dj.first_name || '',
    lastName: dj.last_name || '',
    programName: dj.program_name || dj.show_name || '',
    programFormat: dj.program_format || '',
    stationCallLetters: dj.station_call_letters || dj.station || '',
    stationFrequency: dj.station_frequency || '',
    state: dj.state || '',
    stationWebsite: dj.station_website || '',
    programWebsite: dj.program_website || '',
    programStartTime: dj.program_start_time || '',
    programEndTime: dj.program_end_time || '',
    programTimezone: dj.program_timezone || '',
    programDays: dj.program_days || '',
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
  var password = String(payload.password || '');

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  var email = normalizeEmail_(payload.email);
  if (findDjByEmail_(email)) {
    throw new Error('An account with this email already exists. Try signing in instead.');
  }

  var sheet = getDjSheet_();
  var hashed = hashPassword_(password);
  var djId = 'dj-' + Utilities.getUuid().slice(0, 8);
  var createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  var dj = buildDjFromSignup_(payload, djId, hashed, createdAt);

  appendRowByHeaders_(sheet, dj);

  notifySignupEmails_('dj', dj.email, dj.name, {
    station: dj.station_call_letters || dj.station,
    program: dj.program_name || dj.show_name,
  });

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

  var activityRow = {
    activity_id: activityId,
    timestamp: timestamp,
    dj_id: dj.dj_id,
    event_type: String(payload.eventType || '').trim(),
    song_id: String(payload.songId || '').trim(),
    song_title: String(payload.songTitle || '').trim(),
    artist_name: String(payload.artistName || '').trim(),
    music_style: String(payload.musicStyle || '').trim(),
    format: String(payload.format || '').trim(),
  };
  var snapshot = djActivitySnapshot_(dj, share);
  Object.keys(snapshot).forEach(function (key) {
    activityRow[key] = snapshot[key];
  });
  appendRowByHeaders_(sheet, activityRow);

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

function djProfilePatchFromPayload_(dj, payload) {
  var firstName = String(payload.firstName || payload.first_name || dj.first_name || '').trim();
  var lastName = String(payload.lastName || payload.last_name || dj.last_name || '').trim();
  if (!firstName && !lastName && dj.name) {
    var nameParts = String(dj.name).trim().split(/\s+/);
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }
  var programName = String(payload.programName || payload.program_name || dj.program_name || dj.show_name || '').trim();
  var stationCall = String(payload.stationCallLetters || payload.station_call_letters || dj.station_call_letters || dj.station || '').trim();

  if (!firstName || !lastName || !programName || !stationCall) {
    throw new Error('First name, last name, program name, and station call letters are required.');
  }

  var shareEmail = payload.shareEmail !== undefined
    ? !!payload.shareEmail
    : shareEmailFlag_(dj.share_email);

  return {
    first_name: firstName,
    last_name: lastName,
    name: djFullName_(firstName, lastName, dj.name),
    program_name: programName,
    show_name: programName,
    station_call_letters: stationCall,
    station: stationCall,
    program_format: String(payload.programFormat || payload.program_format || dj.program_format || '').trim(),
    station_frequency: String(payload.stationFrequency || payload.station_frequency || dj.station_frequency || '').trim(),
    state: String(payload.state || dj.state || '').trim(),
    station_website: String(payload.stationWebsite || payload.station_website || dj.station_website || '').trim(),
    program_website: String(payload.programWebsite || payload.program_website || dj.program_website || '').trim(),
    program_start_time: String(payload.programStartTime || payload.program_start_time || dj.program_start_time || '').trim(),
    program_end_time: String(payload.programEndTime || payload.program_end_time || dj.program_end_time || '').trim(),
    program_timezone: String(payload.programTimezone || payload.program_timezone || dj.program_timezone || '').trim(),
    program_days: String(payload.programDays || payload.program_days || dj.program_days || '').trim(),
    share_email: shareEmailValue_(shareEmail),
    dj_contact_email: normalizeEmail_(
      payload.contactEmail !== undefined
        ? payload.contactEmail
        : (payload.dj_contact_email !== undefined ? payload.dj_contact_email : dj.dj_contact_email || dj.email)
    ),
  };
}

function djProfileUpdate_(token, payload) {
  var found = requireDjSession_(token);
  var sheet = getDjSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var updates = djProfilePatchFromPayload_(found.dj, payload || {});

  Object.keys(updates).forEach(function (key) {
    var col = headerMap[key];
    if (col === undefined) return;
    sheet.getRange(found.rowIndex, col + 1).setValue(updates[key]);
  });

  var row = sheet.getRange(found.rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var updatedDj = djRowToObject_(row, headerMap);

  return {
    success: true,
    dj: publicDj_(updatedDj),
  };
}

var ARTIST_SHEET_NAME = 'Artist Accounts';
var ARTIST_HEADERS = [
  'artist_account_id', 'artist_name', 'email', 'password_hash', 'password_salt', 'status', 'created_at', 'account_type',
];
var SONG_SUBMISSION_SHEET_NAME = 'Song Submissions';
var SONG_SUBMISSION_HEADERS = [
  'submission_id', 'account_id', 'account_type', 'account_name', 'artist_name', 'song_title',
  'year', 'song_time', 'music_style', 'songwriter', 'featured_artist', 'lead_vocals',
  'harmony_vocals_1', 'harmony_vocals_2', 'harmony_vocals_3', 'harmony_vocals_4',
  'instrument_player_1', 'instrument_player_2', 'instrument_player_3', 'instrument_player_4',
  'instrument_player_5', 'instrument_player_6', 'instrument_player_7', 'instrument_player_8',
  'record_label', 'release_type', 'album_name', 'description', 'website', 'contact_email',
  'mp3_link', 'wav_link', 'cover_link', 'status', 'submitted_at', 'updated_at', 'profile_id',
];
var ARTIST_PROFILE_SHEET_NAME = 'Artist Profiles';
var ARTIST_PROFILE_HEADERS = [
  'profile_id', 'artist_name', 'owner_account_id', 'ownership_status', 'created_by_account_id',
  'created_by_type', 'claim_email', 'created_at', 'updated_at',
];
var LABEL_ACCESS_SHEET_NAME = 'Label Access';
var LABEL_ACCESS_HEADERS = [
  'access_id', 'profile_id', 'label_account_id', 'label_name', 'access_level', 'status',
  'granted_at', 'granted_by_account_id', 'revoked_at', 'revoked_by_account_id',
];
var CHART_HISTORY_SHEET_NAME = 'Chart History';
var CHART_HISTORY_HEADERS = [
  'record_id', 'profile_id', 'artist_name', 'song_id', 'song_title', 'chart_period', 'period_label',
  'rank', 'download_count', 'recorded_at',
];

function normalizeArtistName_(name) {
  return String(name || '').trim().toLowerCase();
}

function getArtistSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ARTIST_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ARTIST_SHEET_NAME);
    sheet.getRange(1, 1, 1, ARTIST_HEADERS.length).setValues([ARTIST_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  ensureSheetHeaders_(sheet, ARTIST_HEADERS);
  return sheet;
}

function artistRowToObject_(row, headerMap) {
  function pick(key) {
    var idx = headerMap[key];
    if (idx === undefined) return '';
    return String(row[idx] || '').trim();
  }

  return {
    artist_account_id: pick('artist_account_id'),
    artist_name: pick('artist_name'),
    email: pick('email'),
    password_hash: pick('password_hash'),
    password_salt: pick('password_salt'),
    status: pick('status') || 'invited',
    created_at: pick('created_at'),
    account_type: pick('account_type') || 'artist',
  };
}

function findArtistById_(artistId) {
  var targetId = String(artistId || '').trim();
  if (!targetId) return null;

  var sheet = getArtistSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var artist = artistRowToObject_(rows[i], headerMap);
    if (artist.artist_account_id === targetId) {
      return { rowIndex: i + 1, artist: artist };
    }
  }

  return null;
}

function findArtistByEmail_(email) {
  email = normalizeEmail_(email);
  if (!email) return null;

  var sheet = getArtistSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var artist = artistRowToObject_(rows[i], headerMap);
    if (normalizeEmail_(artist.email) === email) {
      return { rowIndex: i + 1, artist: artist };
    }
  }

  return null;
}

function findArtistByName_(name) {
  var target = normalizeArtistName_(name);
  if (!target) return null;

  var sheet = getArtistSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var artist = artistRowToObject_(rows[i], headerMap);
    if (normalizeArtistName_(artist.artist_name) === target) {
      return { rowIndex: i + 1, artist: artist };
    }
  }

  return null;
}

function artistNameExistsInCatalog_(artistName) {
  var target = normalizeArtistName_(artistName);
  if (!target) return false;

  var result = listSongs_();
  var songs = result.songs || [];

  for (var i = 0; i < songs.length; i++) {
    if (normalizeArtistName_(songs[i].artistName) === target) return true;
  }

  return false;
}

function labelNameExistsInCatalog_(labelName) {
  var target = normalizeArtistName_(labelName);
  if (!target) return false;

  var result = listSongs_();
  var songs = result.songs || [];

  for (var i = 0; i < songs.length; i++) {
    if (normalizeArtistName_(songs[i].recordLabel) === target) return true;
  }

  return false;
}

function artistNamesForLabel_(labelName) {
  var target = normalizeArtistName_(labelName);
  var allowed = {};
  if (!target) return allowed;

  var songs = (listSongs_().songs || []);
  songs.forEach(function (song) {
    if (normalizeArtistName_(song.recordLabel) === target && song.artistName) {
      allowed[normalizeArtistName_(song.artistName)] = true;
    }
  });

  return allowed;
}

function getSongSubmissionSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SONG_SUBMISSION_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SONG_SUBMISSION_SHEET_NAME);
    sheet.getRange(1, 1, 1, SONG_SUBMISSION_HEADERS.length).setValues([SONG_SUBMISSION_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  ensureSheetHeaders_(sheet, SONG_SUBMISSION_HEADERS);
  return sheet;
}

function isAllowedMusicStyle_(style) {
  var target = String(style || '').trim().toLowerCase();
  if (!target) return false;
  for (var i = 0; i < RADIO_NOW_MUSIC_STYLES.length; i++) {
    if (String(RADIO_NOW_MUSIC_STYLES[i]).toLowerCase() === target) return true;
  }
  return false;
}

function submissionRowToObject_(row, headerMap) {
  function pick(key) {
    var idx = headerMap[key];
    if (idx === undefined) return '';
    return String(row[idx] || '').trim();
  }

  return {
    submission_id: pick('submission_id'),
    account_id: pick('account_id'),
    account_type: pick('account_type'),
    account_name: pick('account_name'),
    artist_name: pick('artist_name'),
    song_title: pick('song_title'),
    year: pick('year'),
    song_time: pick('song_time'),
    music_style: pick('music_style'),
    songwriter: pick('songwriter'),
    featured_artist: pick('featured_artist'),
    lead_vocals: pick('lead_vocals'),
    harmony_vocals_1: pick('harmony_vocals_1'),
    harmony_vocals_2: pick('harmony_vocals_2'),
    harmony_vocals_3: pick('harmony_vocals_3'),
    harmony_vocals_4: pick('harmony_vocals_4'),
    instrument_player_1: pick('instrument_player_1'),
    instrument_player_2: pick('instrument_player_2'),
    instrument_player_3: pick('instrument_player_3'),
    instrument_player_4: pick('instrument_player_4'),
    instrument_player_5: pick('instrument_player_5'),
    instrument_player_6: pick('instrument_player_6'),
    instrument_player_7: pick('instrument_player_7'),
    instrument_player_8: pick('instrument_player_8'),
    record_label: pick('record_label'),
    release_type: pick('release_type'),
    album_name: pick('album_name'),
    description: pick('description'),
    website: pick('website'),
    contact_email: pick('contact_email'),
    mp3_link: pick('mp3_link'),
    wav_link: pick('wav_link'),
    cover_link: pick('cover_link'),
    status: pick('status') || 'pending',
    submitted_at: pick('submitted_at'),
    updated_at: pick('updated_at'),
    profile_id: pick('profile_id'),
  };
}

function publicSubmission_(row) {
  return {
    id: row.submission_id,
    artistName: row.artist_name,
    songTitle: row.song_title,
    year: row.year,
    songTime: row.song_time,
    musicStyle: row.music_style,
    songwriter: row.songwriter,
    featuredArtist: row.featured_artist,
    leadVocals: row.lead_vocals,
    harmonyVocals: [
      row.harmony_vocals_1,
      row.harmony_vocals_2,
      row.harmony_vocals_3,
      row.harmony_vocals_4,
    ].filter(function (value) { return !!value; }),
    instrumentPlayers: [
      row.instrument_player_1,
      row.instrument_player_2,
      row.instrument_player_3,
      row.instrument_player_4,
      row.instrument_player_5,
      row.instrument_player_6,
      row.instrument_player_7,
      row.instrument_player_8,
    ].filter(function (value) { return !!value; }),
    recordLabel: row.record_label,
    releaseType: row.release_type,
    albumName: row.album_name,
    description: row.description,
    website: row.website,
    contactEmail: row.contact_email,
    mp3Link: row.mp3_link,
    wavLink: row.wav_link,
    coverLink: row.cover_link,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    canEdit: String(row.status).toLowerCase() === 'pending',
  };
}

function submissionPayloadFromRequest_(payload) {
  return {
    artistName: String(payload.artistName || '').trim(),
    songTitle: String(payload.songTitle || '').trim(),
    year: String(payload.year || '').trim(),
    songTime: String(payload.songTime || '').trim(),
    musicStyle: String(payload.musicStyle || '').trim(),
    songwriter: String(payload.songwriter || '').trim(),
    featuredArtist: String(payload.featuredArtist || '').trim(),
    leadVocals: String(payload.leadVocals || '').trim(),
    harmonyVocals: Array.isArray(payload.harmonyVocals) ? payload.harmonyVocals : [],
    instrumentPlayers: Array.isArray(payload.instrumentPlayers) ? payload.instrumentPlayers : [],
    recordLabel: String(payload.recordLabel || '').trim(),
    independent: !!payload.independent,
    releaseType: String(payload.releaseType || 'single').trim().toLowerCase(),
    albumName: String(payload.albumName || '').trim(),
    description: String(payload.description || '').trim(),
    website: String(payload.website || '').trim(),
    contactEmail: normalizeEmail_(payload.contactEmail),
    mp3Link: String(payload.mp3Link || '').trim(),
    wavLink: String(payload.wavLink || '').trim(),
    coverLink: String(payload.coverLink || '').trim(),
  };
}

function validateSubmissionPayload_(data, options) {
  options = options || {};

  if (!data.artistName || !data.songTitle) {
    throw new Error('Artist name and song title are required.');
  }
  if (!data.year) throw new Error('Year is required.');
  if (!data.songTime) throw new Error('Song time is required.');
  if (!data.musicStyle) throw new Error('Music style is required.');
  if (!isAllowedMusicStyle_(data.musicStyle)) {
    throw new Error('Choose a music style from the list.');
  }
  if (!data.description) throw new Error('Description is required.');
  if (!data.songwriter) throw new Error('Songwriter is required.');
  if (!data.leadVocals) throw new Error('Lead vocals are required.');

  if (data.releaseType !== 'single' && data.releaseType !== 'album_track') {
    throw new Error('Release type must be Single or Album track.');
  }
  if (data.releaseType === 'album_track' && !data.albumName) {
    throw new Error('Album name is required for album tracks.');
  }

  if (!data.mp3Link) throw new Error('MP3 file is required.');
  if (!data.wavLink) throw new Error('WAV file is required.');
  if (!data.coverLink) throw new Error('Cover art is required.');

  if (data.independent) {
    data.recordLabel = 'Independent';
  } else if (!data.recordLabel) {
    throw new Error('Record label is required, or check Independent.');
  }
}

function submissionRowValues_(data, meta) {
  var harmony = data.harmonyVocals || [];
  var players = data.instrumentPlayers || [];

  return {
    submission_id: meta.submissionId,
    account_id: meta.accountId,
    account_type: meta.accountType,
    account_name: meta.accountName,
    artist_name: data.artistName,
    song_title: data.songTitle,
    year: data.year,
    song_time: data.songTime,
    music_style: data.musicStyle,
    songwriter: data.songwriter,
    featured_artist: data.featuredArtist,
    lead_vocals: data.leadVocals,
    harmony_vocals_1: String(harmony[0] || '').trim(),
    harmony_vocals_2: String(harmony[1] || '').trim(),
    harmony_vocals_3: String(harmony[2] || '').trim(),
    harmony_vocals_4: String(harmony[3] || '').trim(),
    instrument_player_1: String(players[0] || '').trim(),
    instrument_player_2: String(players[1] || '').trim(),
    instrument_player_3: String(players[2] || '').trim(),
    instrument_player_4: String(players[3] || '').trim(),
    instrument_player_5: String(players[4] || '').trim(),
    instrument_player_6: String(players[5] || '').trim(),
    instrument_player_7: String(players[6] || '').trim(),
    instrument_player_8: String(players[7] || '').trim(),
    record_label: data.recordLabel,
    release_type: data.releaseType === 'album_track' ? 'Album' : 'Single',
    album_name: data.albumName,
    description: data.description,
    website: data.website,
    contact_email: data.contactEmail,
    mp3_link: data.mp3Link,
    wav_link: data.wavLink,
    cover_link: data.coverLink,
    status: meta.status || 'pending',
    submitted_at: meta.submittedAt,
    updated_at: meta.updatedAt || '',
    profile_id: meta.profileId || '',
  };
}

function resolveSubmissionRecordLabel_(account, data) {
  var accountType = String(account.account_type || 'artist').toLowerCase();
  var accountName = String(account.artist_name || '').trim();

  if (data.independent) {
    data.recordLabel = 'Independent';
    return data;
  }

  if (accountType === 'artist') {
    if (normalizeArtistName_(data.artistName) !== normalizeArtistName_(accountName)) {
      throw new Error('Artist name must match your account name.');
    }
    if (!data.recordLabel) {
      var songs = listSongs_().songs || [];
      for (var i = 0; i < songs.length; i++) {
        if (normalizeArtistName_(songs[i].artistName) === normalizeArtistName_(accountName) && songs[i].recordLabel) {
          data.recordLabel = String(songs[i].recordLabel).trim();
          break;
        }
      }
    }
  } else if (accountType === 'label') {
    if (!data.recordLabel) data.recordLabel = accountName;
    if (normalizeArtistName_(data.recordLabel) !== normalizeArtistName_(accountName)) {
      throw new Error('Record label must match your label account name.');
    }
  } else {
    throw new Error('This account cannot submit songs.');
  }

  return data;
}

function listSubmissionsForAccount_(accountId, limit) {
  var sheet = getSongSubmissionSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var items = [];

  for (var i = rows.length - 1; i >= 1; i--) {
    var row = submissionRowToObject_(rows[i], headerMap);
    if (row.account_id !== accountId) continue;
    items.push(publicSubmission_(row));
    if (items.length >= (limit || 100)) break;
  }

  return items;
}

function findSubmissionForAccount_(submissionId, accountId) {
  var targetId = String(submissionId || '').trim();
  if (!targetId) return null;

  var sheet = getSongSubmissionSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var row = submissionRowToObject_(rows[i], headerMap);
    if (row.submission_id === targetId && row.account_id === accountId) {
      return { rowIndex: i + 1, submission: row };
    }
  }

  return null;
}

function updateSubmissionRow_(sheet, rowIndex, valuesByHeader) {
  var headerMap = getDjHeaderMap_(sheet);
  Object.keys(valuesByHeader).forEach(function (key) {
    var col = headerMap[key];
    if (col === undefined) return;
    sheet.getRange(rowIndex, col + 1).setValue(valuesByHeader[key]);
  });
}

function getArtistProfileSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ARTIST_PROFILE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ARTIST_PROFILE_SHEET_NAME);
    sheet.getRange(1, 1, 1, ARTIST_PROFILE_HEADERS.length).setValues([ARTIST_PROFILE_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  ensureSheetHeaders_(sheet, ARTIST_PROFILE_HEADERS);
  return sheet;
}

function getLabelAccessSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LABEL_ACCESS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LABEL_ACCESS_SHEET_NAME);
    sheet.getRange(1, 1, 1, LABEL_ACCESS_HEADERS.length).setValues([LABEL_ACCESS_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  ensureSheetHeaders_(sheet, LABEL_ACCESS_HEADERS);
  return sheet;
}

function getChartHistorySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CHART_HISTORY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CHART_HISTORY_SHEET_NAME);
    sheet.getRange(1, 1, 1, CHART_HISTORY_HEADERS.length).setValues([CHART_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  ensureSheetHeaders_(sheet, CHART_HISTORY_HEADERS);
  return sheet;
}

function profileRowToObject_(row, headerMap) {
  function pick(key) {
    var idx = headerMap[key];
    if (idx === undefined) return '';
    return String(row[idx] || '').trim();
  }

  return {
    profile_id: pick('profile_id'),
    artist_name: pick('artist_name'),
    owner_account_id: pick('owner_account_id'),
    ownership_status: pick('ownership_status') || 'unclaimed',
    created_by_account_id: pick('created_by_account_id'),
    created_by_type: pick('created_by_type'),
    claim_email: pick('claim_email'),
    created_at: pick('created_at'),
    updated_at: pick('updated_at'),
  };
}

function labelAccessRowToObject_(row, headerMap) {
  function pick(key) {
    var idx = headerMap[key];
    if (idx === undefined) return '';
    return String(row[idx] || '').trim();
  }

  return {
    access_id: pick('access_id'),
    profile_id: pick('profile_id'),
    label_account_id: pick('label_account_id'),
    label_name: pick('label_name'),
    access_level: pick('access_level') || 'manage',
    status: pick('status') || 'active',
    granted_at: pick('granted_at'),
    granted_by_account_id: pick('granted_by_account_id'),
    revoked_at: pick('revoked_at'),
    revoked_by_account_id: pick('revoked_by_account_id'),
  };
}

function findProfileByName_(artistName) {
  var target = normalizeArtistName_(artistName);
  if (!target) return null;

  var sheet = getArtistProfileSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var profile = profileRowToObject_(rows[i], headerMap);
    if (normalizeArtistName_(profile.artist_name) === target) {
      return { rowIndex: i + 1, profile: profile };
    }
  }

  return null;
}

function findProfileById_(profileId) {
  var target = String(profileId || '').trim();
  if (!target) return null;

  var sheet = getArtistProfileSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var profile = profileRowToObject_(rows[i], headerMap);
    if (profile.profile_id === target) {
      return { rowIndex: i + 1, profile: profile };
    }
  }

  return null;
}

function findProfileByOwnerAccountId_(accountId) {
  var target = String(accountId || '').trim();
  if (!target) return null;

  var sheet = getArtistProfileSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var profile = profileRowToObject_(rows[i], headerMap);
    if (profile.owner_account_id === target) {
      return { rowIndex: i + 1, profile: profile };
    }
  }

  return null;
}

function publicProfile_(profile) {
  return {
    id: profile.profile_id,
    artistName: profile.artist_name,
    ownershipStatus: profile.ownership_status,
    ownerAccountId: profile.owner_account_id,
    claimEmail: profile.claim_email,
    createdByType: profile.created_by_type,
  };
}

function catalogContactEmailForArtist_(artistName) {
  var target = normalizeArtistName_(artistName);
  var songs = (listSongs_().songs || []);
  for (var i = 0; i < songs.length; i++) {
    if (normalizeArtistName_(songs[i].artistName) === target && songs[i].contactEmail) {
      return normalizeEmail_(songs[i].contactEmail);
    }
  }
  return '';
}

function canClaimProfile_(profile, email) {
  if (!profile || String(profile.ownership_status).toLowerCase() !== 'unclaimed') {
    return false;
  }

  email = normalizeEmail_(email);
  if (!email) return false;

  if (profile.claim_email && normalizeEmail_(profile.claim_email) === email) {
    return true;
  }

  var catalogEmail = catalogContactEmailForArtist_(profile.artist_name);
  if (catalogEmail && catalogEmail === email) {
    return true;
  }

  if (artistNameExistsInCatalog_(profile.artist_name)) {
    return true;
  }

  return false;
}

function grantLabelAccess_(profileId, labelAccount, grantedByAccountId) {
  var sheet = getLabelAccessSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  for (var i = 1; i < rows.length; i++) {
    var access = labelAccessRowToObject_(rows[i], headerMap);
    if (access.profile_id === profileId
      && access.label_account_id === labelAccount.artist_account_id
      && String(access.status).toLowerCase() === 'active') {
      return access;
    }
  }

  var accessId = 'acc-' + Utilities.getUuid().slice(0, 8);
  sheet.appendRow([
    accessId,
    profileId,
    labelAccount.artist_account_id,
    labelAccount.artist_name,
    'manage',
    'active',
    now,
    grantedByAccountId || labelAccount.artist_account_id,
    '',
    '',
  ]);

  return {
    access_id: accessId,
    profile_id: profileId,
    label_account_id: labelAccount.artist_account_id,
    label_name: labelAccount.artist_name,
    access_level: 'manage',
    status: 'active',
    granted_at: now,
    granted_by_account_id: grantedByAccountId || labelAccount.artist_account_id,
    revoked_at: '',
    revoked_by_account_id: '',
  };
}

function hasActiveLabelAccess_(profileId, labelAccountId) {
  var sheet = getLabelAccessSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var access = labelAccessRowToObject_(rows[i], headerMap);
    if (access.profile_id === profileId
      && access.label_account_id === labelAccountId
      && String(access.status).toLowerCase() === 'active') {
      return true;
    }
  }

  return false;
}

function listActiveLabelAccessForProfile_(profileId) {
  var sheet = getLabelAccessSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var items = [];

  for (var i = 1; i < rows.length; i++) {
    var access = labelAccessRowToObject_(rows[i], headerMap);
    if (access.profile_id !== profileId) continue;
    if (String(access.status).toLowerCase() !== 'active') continue;
    items.push({
      id: access.access_id,
      profileId: access.profile_id,
      labelAccountId: access.label_account_id,
      labelName: access.label_name,
      accessLevel: access.access_level,
      grantedAt: access.granted_at,
    });
  }

  return items;
}

function listManagedProfilesForLabel_(labelAccountId) {
  var sheet = getLabelAccessSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var profileIds = {};

  for (var i = 1; i < rows.length; i++) {
    var access = labelAccessRowToObject_(rows[i], headerMap);
    if (access.label_account_id !== labelAccountId) continue;
    if (String(access.status).toLowerCase() !== 'active') continue;
    profileIds[access.profile_id] = {
      accessId: access.access_id,
      grantedAt: access.granted_at,
    };
  }

  var items = [];
  Object.keys(profileIds).forEach(function (profileId) {
    var found = findProfileById_(profileId);
    if (!found) return;
    items.push({
      profile: publicProfile_(found.profile),
      accessId: profileIds[profileId].accessId,
      grantedAt: profileIds[profileId].grantedAt,
    });
  });

  items.sort(function (a, b) {
    return String(a.profile.artistName).localeCompare(String(b.profile.artistName));
  });

  return items;
}

function createArtistProfileRecord_(artistName, createdByAccount, createdByType, claimEmail) {
  artistName = String(artistName || '').trim();
  if (!artistName) {
    throw new Error('Artist name is required.');
  }

  var existing = findProfileByName_(artistName);
  if (existing) {
    throw new Error('An artist profile already exists for this name.');
  }

  var sheet = getArtistProfileSheet_();
  var profileId = 'prof-' + Utilities.getUuid().slice(0, 8);
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  sheet.appendRow([
    profileId,
    artistName,
    '',
    'unclaimed',
    createdByAccount ? createdByAccount.artist_account_id : '',
    createdByType || 'system',
    normalizeEmail_(claimEmail),
    now,
    now,
  ]);

  return {
    profile_id: profileId,
    artist_name: artistName,
    owner_account_id: '',
    ownership_status: 'unclaimed',
    created_by_account_id: createdByAccount ? createdByAccount.artist_account_id : '',
    created_by_type: createdByType || 'system',
    claim_email: normalizeEmail_(claimEmail),
    created_at: now,
    updated_at: now,
  };
}

function claimArtistProfile_(profile, ownerAccount, email) {
  if (!canClaimProfile_(profile, email)) {
    throw new Error('This artist profile cannot be claimed with this email. Use the email your label listed or contact Radio Now.');
  }

  var sheet = getArtistProfileSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var found = findProfileById_(profile.profile_id);
  if (!found) {
    throw new Error('Artist profile not found.');
  }

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  sheet.getRange(found.rowIndex, headerMap.owner_account_id + 1).setValue(ownerAccount.artist_account_id);
  sheet.getRange(found.rowIndex, headerMap.ownership_status + 1).setValue('claimed');
  sheet.getRange(found.rowIndex, headerMap.updated_at + 1).setValue(now);

  profile.owner_account_id = ownerAccount.artist_account_id;
  profile.ownership_status = 'claimed';
  profile.updated_at = now;
  return profile;
}

function ensureArtistProfileForAccount_(account, email) {
  var accountType = String(account.account_type || 'artist').toLowerCase();
  if (accountType !== 'artist') {
    return null;
  }

  var existing = findProfileByName_(account.artist_name);
  if (existing) {
    if (String(existing.profile.ownership_status).toLowerCase() === 'unclaimed') {
      return claimArtistProfile_(existing.profile, account, email);
    }
    if (existing.profile.owner_account_id === account.artist_account_id) {
      return existing.profile;
    }
    throw new Error('This artist profile is already claimed by another account.');
  }

  var profile = createArtistProfileRecord_(account.artist_name, account, 'artist', email);
  var sheet = getArtistProfileSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var found = findProfileById_(profile.profile_id);
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  sheet.getRange(found.rowIndex, headerMap.owner_account_id + 1).setValue(account.artist_account_id);
  sheet.getRange(found.rowIndex, headerMap.ownership_status + 1).setValue('claimed');
  sheet.getRange(found.rowIndex, headerMap.updated_at + 1).setValue(now);

  profile.owner_account_id = account.artist_account_id;
  profile.ownership_status = 'claimed';
  profile.updated_at = now;
  return profile;
}

function resolveProfileForAccount_(account) {
  var accountType = String(account.account_type || 'artist').toLowerCase();
  if (accountType !== 'artist') return null;

  var byOwner = findProfileByOwnerAccountId_(account.artist_account_id);
  if (byOwner) return byOwner.profile;

  var byName = findProfileByName_(account.artist_name);
  if (byName) return byName.profile;

  return null;
}

function chartPeriodLabelWeek_(date) {
  return Utilities.formatDate(date || new Date(), Session.getScriptTimeZone(), "yyyy-'W'ww");
}

function chartPeriodLabelMonth_(date) {
  return Utilities.formatDate(date || new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
}

function recordChartHistorySnapshot_(profileId, artistName, chartPeriod, periodLabel, entries) {
  if (!profileId || !entries || !entries.length) return;

  var sheet = getChartHistorySheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var existing = {};

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    function pick(key) {
      var idx = headerMap[key];
      if (idx === undefined) return '';
      return String(row[idx] || '').trim();
    }

    if (pick('profile_id') !== profileId) continue;
    if (pick('chart_period') !== chartPeriod) continue;
    if (pick('period_label') !== periodLabel) continue;
    existing[pick('song_id')] = i + 1;
  }

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  entries.forEach(function (entry, index) {
    var rank = index + 1;
    var songId = entry.songId;
    if (!songId) return;

    if (existing[songId]) {
      var rowIndex = existing[songId];
      sheet.getRange(rowIndex, headerMap.rank + 1).setValue(rank);
      sheet.getRange(rowIndex, headerMap.download_count + 1).setValue(entry.count || 0);
      sheet.getRange(rowIndex, headerMap.recorded_at + 1).setValue(now);
      return;
    }

    sheet.appendRow([
      'ch-' + Utilities.getUuid().slice(0, 8),
      profileId,
      artistName,
      songId,
      entry.songTitle || 'Untitled',
      chartPeriod,
      periodLabel,
      rank,
      entry.count || 0,
      now,
    ]);
  });
}

function updateChartHistorySnapshots_(profileId, artistName) {
  if (!profileId || !artistName) return;

  var charts = computeArtistCharts_(artistName, 50);
  var weekLabel = chartPeriodLabelWeek_();
  var monthLabel = chartPeriodLabelMonth_();

  recordChartHistorySnapshot_(profileId, artistName, 'week', weekLabel, charts.week || []);
  recordChartHistorySnapshot_(profileId, artistName, 'month', monthLabel, charts.month || []);
}

function listChartHistorySummary_(profileId) {
  var sheet = getChartHistorySheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var songs = {};

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    function pick(key) {
      var idx = headerMap[key];
      if (idx === undefined) return '';
      return String(row[idx] || '').trim();
    }

    if (pick('profile_id') !== profileId) continue;

    var songId = pick('song_id');
    if (!songId) continue;

    var rank = parseInt(pick('rank'), 10);
    if (isNaN(rank)) continue;

    if (!songs[songId]) {
      songs[songId] = {
        songId: songId,
        songTitle: pick('song_title') || 'Untitled',
        bestWeekRank: null,
        bestWeekPeriod: '',
        bestMonthRank: null,
        bestMonthPeriod: '',
        hitTop10: false,
        hitTop5: false,
        hitTop1: false,
      };
    }

    var item = songs[songId];
    var chartPeriod = pick('chart_period');
    var periodLabel = pick('period_label');

    if (chartPeriod === 'week' && (item.bestWeekRank === null || rank < item.bestWeekRank)) {
      item.bestWeekRank = rank;
      item.bestWeekPeriod = periodLabel;
    }
    if (chartPeriod === 'month' && (item.bestMonthRank === null || rank < item.bestMonthRank)) {
      item.bestMonthRank = rank;
      item.bestMonthPeriod = periodLabel;
    }
    if (rank <= 10) item.hitTop10 = true;
    if (rank <= 5) item.hitTop5 = true;
    if (rank === 1) item.hitTop1 = true;
  }

  return Object.keys(songs)
    .map(function (key) { return songs[key]; })
    .sort(function (a, b) {
      var aRank = Math.min(a.bestWeekRank || 999, a.bestMonthRank || 999);
      var bRank = Math.min(b.bestWeekRank || 999, b.bestMonthRank || 999);
      return aRank - bRank;
    });
}

function artistProfileCreate_(token, payload) {
  var found = requireArtistSession_(token);
  var account = found.artist;
  if (String(account.account_type || '').toLowerCase() !== 'label') {
    throw new Error('Only label accounts can create artist profiles.');
  }

  var artistName = String(payload.artistName || '').trim();
  var claimEmail = String(payload.claimEmail || '').trim();
  var profile = createArtistProfileRecord_(artistName, account, 'label', claimEmail);
  grantLabelAccess_(profile.profile_id, account, account.artist_account_id);

  return {
    success: true,
    profile: publicProfile_(profile),
  };
}

function labelAccessRevoke_(token, payload) {
  var found = requireArtistSession_(token);
  var account = found.artist;
  if (String(account.account_type || '').toLowerCase() !== 'artist') {
    throw new Error('Only artist accounts can remove label access.');
  }

  var profile = resolveProfileForAccount_(account);
  if (!profile || profile.owner_account_id !== account.artist_account_id) {
    throw new Error('You do not own this artist profile.');
  }

  var labelAccountId = String(payload.labelAccountId || '').trim();
  if (!labelAccountId) {
    throw new Error('Label account id is required.');
  }

  var sheet = getLabelAccessSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var rows = sheet.getDataRange().getValues();
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  var updated = false;

  for (var i = 1; i < rows.length; i++) {
    var access = labelAccessRowToObject_(rows[i], headerMap);
    if (access.profile_id !== profile.profile_id) continue;
    if (access.label_account_id !== labelAccountId) continue;
    if (String(access.status).toLowerCase() !== 'active') continue;

    sheet.getRange(i + 1, headerMap.status + 1).setValue('revoked');
    sheet.getRange(i + 1, headerMap.revoked_at + 1).setValue(now);
    sheet.getRange(i + 1, headerMap.revoked_by_account_id + 1).setValue(account.artist_account_id);
    updated = true;
    break;
  }

  if (!updated) {
    throw new Error('Active label access not found.');
  }

  return {
    success: true,
    profile: publicProfile_(profile),
    labelAccess: listActiveLabelAccessForProfile_(profile.profile_id),
  };
}

function requireProfileManageAccess_(account, artistName) {
  var profileFound = findProfileByName_(artistName);
  if (!profileFound) {
    throw new Error('Create an artist profile for this name before submitting songs.');
  }

  var profile = profileFound.profile;
  var accountType = String(account.account_type || '').toLowerCase();

  if (accountType === 'artist') {
    if (profile.owner_account_id === account.artist_account_id) {
      return profile;
    }
    throw new Error('You do not have access to submit songs for this artist.');
  }

  if (accountType === 'label') {
    if (hasActiveLabelAccess_(profile.profile_id, account.artist_account_id)) {
      return profile;
    }
    throw new Error('Your label does not have access to this artist profile.');
  }

  throw new Error('This account cannot manage artist profiles.');
}

function publicArtist_(artist) {
  var accountType = String(artist.account_type || 'artist').toLowerCase();
  var profile = accountType === 'artist' ? resolveProfileForAccount_(artist) : null;

  return {
    id: artist.artist_account_id,
    artistName: artist.artist_name,
    email: artist.email,
    status: artist.status,
    accountType: accountType,
    profile: profile ? publicProfile_(profile) : null,
    isProfileOwner: !!(profile && profile.owner_account_id === artist.artist_account_id),
  };
}

function createArtistSessionToken_(artist) {
  var exp = Date.now() + (7 * 24 * 60 * 60 * 1000);
  var body = artist.artist_account_id + '|' + normalizeEmail_(artist.email) + '|' + exp;
  return Utilities.base64EncodeWebSafe(body + '|' + hmacHex_(body));
}

function requireArtistSession_(token) {
  var session = parseSessionToken_(token);
  var found = findArtistById_(session.djId);
  if (!found || String(found.artist.status).toLowerCase() !== 'active') {
    throw new Error('Artist account not found or inactive.');
  }
  return found;
}

function artistLogin_(email, password) {
  email = normalizeEmail_(email);
  password = String(password || '');

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  var found = findArtistByEmail_(email);
  var artist = found ? found.artist : null;
  if (!artist || !artist.password_hash || !artist.password_salt) {
    throw new Error('Invalid email or password.');
  }

  if (String(artist.status).toLowerCase() !== 'active') {
    throw new Error('This artist account is not active yet. Contact Radio Now if you need access.');
  }

  if (!verifyPassword_(password, artist.password_salt, artist.password_hash)) {
    throw new Error('Invalid email or password.');
  }

  return {
    success: true,
    token: createArtistSessionToken_(artist),
    artist: publicArtist_(artist),
  };
}

function artistSignup_(payload) {
  var artistName = String(payload.artistName || '').trim();
  var email = normalizeEmail_(payload.email);
  var password = String(payload.password || '');

  if (!artistName || !email || !password) {
    throw new Error('Artist name, email, and password are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  if (findArtistByEmail_(email)) {
    throw new Error('An account with this email already exists. Try signing in instead.');
  }

  var existingName = findArtistByName_(artistName);
  if (existingName && String(existingName.artist.status).toLowerCase() === 'active') {
    throw new Error('An artist account already exists for this name. Contact Radio Now if you need access.');
  }

  var profileFound = findProfileByName_(artistName);
  var canSignup = artistNameExistsInCatalog_(artistName)
    || (profileFound && canClaimProfile_(profileFound.profile, email));

  if (!canSignup) {
    throw new Error('Artist name must match your catalog listing on Radio Now, or use the email your label listed to claim a profile they created.');
  }

  var sheet = getArtistSheet_();
  var hashed = hashPassword_(password);
  var artistId = 'art-' + Utilities.getUuid().slice(0, 8);
  var createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  sheet.appendRow([
    artistId,
    artistName,
    email,
    hashed.hash,
    hashed.salt,
    'active',
    createdAt,
    'artist',
  ]);

  var artist = {
    artist_account_id: artistId,
    artist_name: artistName,
    email: email,
    status: 'active',
    created_at: createdAt,
    account_type: 'artist',
  };

  ensureArtistProfileForAccount_(artist, email);

  notifySignupEmails_('artist', email, artistName, {
    claimed: !!(profileFound && String(profileFound.profile.ownership_status).toLowerCase() === 'unclaimed'),
  });

  return {
    success: true,
    token: createArtistSessionToken_(artist),
    artist: publicArtist_(artist),
  };
}

function adminResetLabelAccount_(labelName, email, password) {
  labelName = String(labelName || '').trim();
  email = normalizeEmail_(email);
  password = String(password || '');

  if (!labelName || !email || !password) {
    throw new Error('Label name, email, and password are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  var found = findArtistByName_(labelName);
  if (!found) {
    throw new Error('No account found for label name: ' + labelName);
  }

  var account = found.artist;
  if (String(account.account_type || '').toLowerCase() !== 'label') {
    throw new Error('Account is not a label account.');
  }

  var emailOwner = findArtistByEmail_(email);
  if (emailOwner && emailOwner.artist.artist_account_id !== account.artist_account_id) {
    throw new Error('Email is already used by another account.');
  }

  var sheet = getArtistSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var hashed = hashPassword_(password);

  sheet.getRange(found.rowIndex, headerMap.email + 1).setValue(email);
  sheet.getRange(found.rowIndex, headerMap.password_hash + 1).setValue(hashed.hash);
  sheet.getRange(found.rowIndex, headerMap.password_salt + 1).setValue(hashed.salt);
  sheet.getRange(found.rowIndex, headerMap.status + 1).setValue('active');

  return {
    success: true,
    accountId: account.artist_account_id,
    labelName: labelName,
    email: email,
    accountType: 'label',
  };
}

/**
 * Run once from Apps Script editor (Run menu) to claim the 615 Hideaway Records label account.
 * Does not require redeploying the web app.
 */
function setup615HideawayLabelAccount() {
  return adminResetLabelAccount_(
    '615 Hideaway Records',
    'sammy@the615hideaway.com',
    'Hide@2020'
  );
}

function labelSignup_(payload) {
  var labelName = String(payload.labelName || '').trim();
  var email = normalizeEmail_(payload.email);
  var password = String(payload.password || '');

  if (!labelName || !email || !password) {
    throw new Error('Label name, email, and password are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  if (findArtistByEmail_(email)) {
    throw new Error('An account with this email already exists. Try signing in instead.');
  }

  var existingName = findArtistByName_(labelName);
  if (existingName && String(existingName.artist.status).toLowerCase() === 'active') {
    throw new Error('A label account already exists for this name. Contact Radio Now if you need access.');
  }

  if (!labelNameExistsInCatalog_(labelName)) {
    throw new Error('Label name must match your catalog listing on Radio Now exactly (e.g. 615 Hideaway Records).');
  }

  var sheet = getArtistSheet_();
  var hashed = hashPassword_(password);
  var accountId = 'lbl-' + Utilities.getUuid().slice(0, 8);
  var createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  sheet.appendRow([
    accountId,
    labelName,
    email,
    hashed.hash,
    hashed.salt,
    'active',
    createdAt,
    'label',
  ]);

  var account = {
    artist_account_id: accountId,
    artist_name: labelName,
    email: email,
    status: 'active',
    created_at: createdAt,
    account_type: 'label',
  };

  notifySignupEmails_('label', email, labelName);

  return {
    success: true,
    token: createArtistSessionToken_(account),
    artist: publicArtist_(account),
  };
}

function artistActivate_(email, password) {
  email = normalizeEmail_(email);
  password = String(password || '');

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  var found = findArtistByEmail_(email);
  if (!found) {
    throw new Error('No invitation found for this email. Contact Radio Now to get artist dashboard access.');
  }

  var artist = found.artist;
  var status = String(artist.status).toLowerCase();

  if (artist.password_hash) {
    throw new Error('This account is already activated. Sign in instead.');
  }

  if (status !== 'invited') {
    throw new Error('This artist account cannot be activated online. Contact Radio Now.');
  }

  if (!artist.artist_name) {
    throw new Error('Artist account is missing a catalog artist name. Contact Radio Now.');
  }

  var sheet = getArtistSheet_();
  var headerMap = getDjHeaderMap_(sheet);
  var hashed = hashPassword_(password);

  sheet.getRange(found.rowIndex, headerMap.password_hash + 1).setValue(hashed.hash);
  sheet.getRange(found.rowIndex, headerMap.password_salt + 1).setValue(hashed.salt);
  sheet.getRange(found.rowIndex, headerMap.status + 1).setValue('active');

  artist.password_hash = hashed.hash;
  artist.password_salt = hashed.salt;
  artist.status = 'active';

  return {
    success: true,
    token: createArtistSessionToken_(artist),
    artist: publicArtist_(artist),
  };
}

function listLabelActivity_(labelName, limit) {
  var allowed = artistNamesForLabel_(labelName);
  if (!Object.keys(allowed).length) return [];

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

    if (!allowed[normalizeArtistName_(pick('artist_name'))]) continue;
    if (!isDownloadEvent_(pick('event_type'))) continue;

    var sharedEmail = shareEmailFlag_(pick('share_email'));
    items.push({
      id: pick('activity_id'),
      timestamp: pick('timestamp'),
      eventType: pick('event_type'),
      songId: pick('song_id'),
      songTitle: pick('song_title'),
      artistName: pick('artist_name'),
      musicStyle: pick('music_style'),
      format: pick('format'),
      djName: pick('dj_name') || djFullName_(pick('dj_first_name'), pick('dj_last_name'), ''),
      djStation: pick('dj_station') || pick('dj_station_call'),
      djShowName: pick('dj_show_name') || pick('dj_program_name'),
      djEmail: sharedEmail ? pick('contact_email') : '',
      djFirstName: pick('dj_first_name'),
      djLastName: pick('dj_last_name'),
      djProgramName: pick('dj_program_name') || pick('dj_show_name'),
      djProgramFormat: pick('dj_program_format'),
      djStationCall: pick('dj_station_call') || pick('dj_station'),
      djStationFrequency: pick('dj_station_frequency'),
      djState: pick('dj_state'),
      djStationWebsite: pick('dj_station_website'),
      djProgramWebsite: pick('dj_program_website'),
      djProgramStart: pick('dj_program_start'),
      djProgramEnd: pick('dj_program_end'),
      djProgramTimezone: pick('dj_program_timezone'),
      djProgramDays: pick('dj_program_days'),
    });

    if (items.length >= limit) break;
  }

  return items;
}

function computeLabelCharts_(labelName, limit) {
  var activity = listLabelActivity_(labelName, 10000);
  var now = Date.now();
  var weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  var monthAgo = now - (30 * 24 * 60 * 60 * 1000);
  var weekCounts = {};
  var monthCounts = {};

  activity.forEach(function (item) {
    var ts = Date.parse(item.timestamp);
    if (isNaN(ts) || !item.songId) return;

    var meta = {
      songTitle: item.songTitle,
      artistName: item.artistName,
      musicStyle: item.musicStyle,
    };

    if (ts >= weekAgo) bumpChartCount_(weekCounts, item.songId, meta, ts);
    if (ts >= monthAgo) bumpChartCount_(monthCounts, item.songId, meta, ts);
  });

  return {
    week: sortChartEntries_(weekCounts, limit),
    month: sortChartEntries_(monthCounts, limit),
  };
}

function buildSubmissionResponseMeta_(data, meta, account) {
  return {
    id: meta.submissionId,
    artistName: data.artistName,
    songTitle: data.songTitle,
    status: meta.status || 'pending',
    submittedAt: meta.submittedAt,
    updatedAt: meta.updatedAt || '',
    accountName: meta.accountName,
    accountType: meta.accountType,
    recordLabel: data.recordLabel,
    releaseType: data.releaseType === 'album_track' ? 'Album track' : 'Single',
    albumName: data.albumName,
    year: data.year,
    songTime: data.songTime,
    musicStyle: data.musicStyle,
    contactEmail: data.contactEmail,
    canEdit: String(meta.status || 'pending').toLowerCase() === 'pending',
  };
}

function submitSong_(token, payload) {
  var found = requireArtistSession_(token);
  var account = found.artist;
  var accountType = String(account.account_type || 'artist').toLowerCase();
  var accountName = String(account.artist_name || '').trim();
  var data = submissionPayloadFromRequest_(payload);

  resolveSubmissionRecordLabel_(account, data);
  validateSubmissionPayload_(data);

  var profile = requireProfileManageAccess_(account, data.artistName);
  var sheet = getSongSubmissionSheet_();
  var submissionId = 'sub-' + Utilities.getUuid().slice(0, 8);
  var submittedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  appendRowByHeaders_(sheet, submissionRowValues_(data, {
    submissionId: submissionId,
    accountId: account.artist_account_id,
    accountType: accountType,
    accountName: accountName,
    status: 'pending',
    submittedAt: submittedAt,
    profileId: profile.profile_id,
  }));

  var submission = buildSubmissionResponseMeta_(data, {
    submissionId: submissionId,
    accountName: accountName,
    accountType: accountType,
    status: 'pending',
    submittedAt: submittedAt,
  }, account);

  notifySongSubmissionEmails_(submission, account);

  return {
    success: true,
    submission: submission,
  };
}

function updateSongSubmission_(token, payload) {
  var found = requireArtistSession_(token);
  var account = found.artist;
  var accountType = String(account.account_type || 'artist').toLowerCase();
  var accountName = String(account.artist_name || '').trim();
  var submissionId = String(payload.submissionId || '').trim();
  if (!submissionId) throw new Error('Submission ID is required.');

  var located = findSubmissionForAccount_(submissionId, account.artist_account_id);
  if (!located) throw new Error('Submission not found.');
  if (String(located.submission.status).toLowerCase() !== 'pending') {
    throw new Error('Only pending submissions can be edited.');
  }

  var data = submissionPayloadFromRequest_(payload);
  if (!data.mp3Link) data.mp3Link = located.submission.mp3_link;
  if (!data.wavLink) data.wavLink = located.submission.wav_link;
  if (!data.coverLink) data.coverLink = located.submission.cover_link;

  resolveSubmissionRecordLabel_(account, data);
  validateSubmissionPayload_(data);

  var profile = requireProfileManageAccess_(account, data.artistName);
  var updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  var sheet = getSongSubmissionSheet_();

  updateSubmissionRow_(sheet, located.rowIndex, submissionRowValues_(data, {
    submissionId: submissionId,
    accountId: account.artist_account_id,
    accountType: accountType,
    accountName: accountName,
    status: 'pending',
    submittedAt: located.submission.submitted_at,
    updatedAt: updatedAt,
    profileId: profile.profile_id,
  }));

  var submission = buildSubmissionResponseMeta_(data, {
    submissionId: submissionId,
    accountName: accountName,
    accountType: accountType,
    status: 'pending',
    submittedAt: located.submission.submitted_at,
    updatedAt: updatedAt,
  }, account);

  return {
    success: true,
    submission: submission,
  };
}

function listArtistActivity_(artistName, limit) {
  var targetArtist = normalizeArtistName_(artistName);
  if (!targetArtist) return [];

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

    if (normalizeArtistName_(pick('artist_name')) !== targetArtist) continue;
    if (!isDownloadEvent_(pick('event_type'))) continue;

    var sharedEmail = shareEmailFlag_(pick('share_email'));
    items.push({
      id: pick('activity_id'),
      timestamp: pick('timestamp'),
      eventType: pick('event_type'),
      songId: pick('song_id'),
      songTitle: pick('song_title'),
      artistName: pick('artist_name'),
      musicStyle: pick('music_style'),
      format: pick('format'),
      djName: pick('dj_name') || djFullName_(pick('dj_first_name'), pick('dj_last_name'), ''),
      djStation: pick('dj_station') || pick('dj_station_call'),
      djShowName: pick('dj_show_name') || pick('dj_program_name'),
      djEmail: sharedEmail ? pick('contact_email') : '',
      djFirstName: pick('dj_first_name'),
      djLastName: pick('dj_last_name'),
      djProgramName: pick('dj_program_name') || pick('dj_show_name'),
      djProgramFormat: pick('dj_program_format'),
      djStationCall: pick('dj_station_call') || pick('dj_station'),
      djStationFrequency: pick('dj_station_frequency'),
      djState: pick('dj_state'),
      djStationWebsite: pick('dj_station_website'),
      djProgramWebsite: pick('dj_program_website'),
      djProgramStart: pick('dj_program_start'),
      djProgramEnd: pick('dj_program_end'),
      djProgramTimezone: pick('dj_program_timezone'),
      djProgramDays: pick('dj_program_days'),
    });

    if (items.length >= limit) break;
  }

  return items;
}

function computeArtistCharts_(artistName, limit) {
  var activity = listArtistActivity_(artistName, 10000);
  var now = Date.now();
  var weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  var monthAgo = now - (30 * 24 * 60 * 60 * 1000);
  var weekCounts = {};
  var monthCounts = {};

  activity.forEach(function (item) {
    var ts = Date.parse(item.timestamp);
    if (isNaN(ts) || !item.songId) return;

    var meta = {
      songTitle: item.songTitle,
      artistName: item.artistName,
      musicStyle: item.musicStyle,
    };

    if (ts >= weekAgo) bumpChartCount_(weekCounts, item.songId, meta, ts);
    if (ts >= monthAgo) bumpChartCount_(monthCounts, item.songId, meta, ts);
  });

  return {
    week: sortChartEntries_(weekCounts, limit),
    month: sortChartEntries_(monthCounts, limit),
  };
}

function artistDashboard_(token) {
  var found = requireArtistSession_(token);
  var account = found.artist;
  var accountType = String(account.account_type || 'artist').toLowerCase();
  var accountName = account.artist_name;
  var activity;
  var charts;
  var profile = null;
  var chartHistory = [];
  var labelAccess = [];
  var managedProfiles = [];

  if (accountType === 'label') {
    activity = listLabelActivity_(accountName, 250);
    charts = computeLabelCharts_(accountName, 10);
    managedProfiles = listManagedProfilesForLabel_(account.artist_account_id);
  } else {
    activity = listArtistActivity_(accountName, 250);
    charts = computeArtistCharts_(accountName, 10);
    profile = resolveProfileForAccount_(account);
    if (!profile) {
      var byName = findProfileByName_(accountName);
      if (byName && String(byName.profile.ownership_status).toLowerCase() === 'unclaimed') {
        try {
          profile = claimArtistProfile_(byName.profile, account, account.email);
        } catch (claimErr) {
          profile = null;
        }
      } else if (artistNameExistsInCatalog_(accountName)) {
        try {
          profile = ensureArtistProfileForAccount_(account, account.email);
        } catch (ensureErr) {
          profile = null;
        }
      }
    }
    if (profile) {
      updateChartHistorySnapshots_(profile.profile_id, profile.artist_name);
      chartHistory = listChartHistorySummary_(profile.profile_id);
      labelAccess = listActiveLabelAccessForProfile_(profile.profile_id);
    }
  }

  return {
    success: true,
    artist: publicArtist_(account),
    stats: computeDjStats_(activity),
    activity: activity,
    charts: charts,
    profile: profile ? publicProfile_(profile) : null,
    chartHistory: chartHistory,
    labelAccess: labelAccess,
    managedProfiles: managedProfiles,
    submissions: listSubmissionsForAccount_(account.artist_account_id, 100),
    musicStyles: RADIO_NOW_MUSIC_STYLES,
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

    if (action === 'demo_dashboard') {
      return jsonResponse_(demoDashboard_());
    }

    if (action === 'demo_artist_dashboard') {
      return jsonResponse_(demoArtistDashboard_());
    }

    if (action === 'version') {
      return jsonResponse_({
        success: true,
        version: RADIO_NOW_SCRIPT_VERSION,
        features: [
          'label_signup',
          'artist_signup',
          'artist_profile_create',
          'label_access_revoke',
          'song_submit',
          'artist_dashboard',
          'signup_email',
          'submission_email',
        ],
      });
    }

    if (action === 'setup_615_label') {
      var setupKey = String(e.parameter.key || '');
      if (setupKey !== RADIO_NOW_LABEL_SETUP_KEY) {
        throw new Error('Unauthorized setup request.');
      }
      return jsonResponse_(setup615HideawayLabelAccount());
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
      return jsonResponse_(djProfileUpdate_(body.token, body));
    }

    if (action === 'dj_directory') {
      return jsonResponse_(listDjDirectory_(body.token));
    }

    if (action === 'artist_login') {
      return jsonResponse_(artistLogin_(body.email, body.password));
    }

    if (action === 'artist_signup') {
      return jsonResponse_(artistSignup_(body));
    }

    if (action === 'label_signup') {
      return jsonResponse_(labelSignup_(body));
    }

    if (action === 'artist_activate') {
      return jsonResponse_(artistActivate_(body.email, body.password));
    }

    if (action === 'artist_dashboard') {
      return jsonResponse_(artistDashboard_(body.token));
    }

    if (action === 'song_upload_asset') {
      return jsonResponse_(uploadSubmissionAsset_(body.token, body));
    }

    if (action === 'song_upload_start') {
      return jsonResponse_(uploadSubmissionStart_(body.token, body));
    }

    if (action === 'song_upload_chunk') {
      return jsonResponse_(uploadSubmissionChunk_(body.token, body));
    }

    if (action === 'song_upload_finish') {
      return jsonResponse_(uploadSubmissionFinish_(body.token, body));
    }

    if (action === 'song_submit') {
      return jsonResponse_(submitSong_(body.token, body));
    }

    if (action === 'song_update') {
      return jsonResponse_(updateSongSubmission_(body.token, body));
    }

    if (action === 'artist_profile_create') {
      return jsonResponse_(artistProfileCreate_(body.token, body));
    }

    if (action === 'label_access_revoke') {
      return jsonResponse_(labelAccessRevoke_(body.token, body));
    }

    return jsonResponse_({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}