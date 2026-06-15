const ArtistAuth = {
  isScriptReady() {
    return !!(CONFIG.googleScriptUrl && CONFIG.googleScriptUrl.includes('script.google.com'));
  },

  async request(action, payload = {}) {
    if (!this.isScriptReady()) {
      throw new Error('Artist sign-in is not configured yet. Redeploy Apps Script with the latest Code.gs.');
    }

    const response = await fetch(CONFIG.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    });

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error('Could not reach the artist sign-in service. Redeploy Apps Script with the latest Code.gs.');
    }

    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  saveSession(data) {
    sessionStorage.setItem(CONFIG.artistSessionKey, JSON.stringify({
      token: data.token,
      artist: data.artist,
    }));
    sessionStorage.removeItem(CONFIG.djSessionKey);
    sessionStorage.removeItem(CONFIG.authKey);
  },

  getSession() {
    const raw = sessionStorage.getItem(CONFIG.artistSessionKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  },

  getArtist() {
    return this.getSession()?.artist || null;
  },

  getToken() {
    return this.getSession()?.token || '';
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  logout() {
    sessionStorage.removeItem(CONFIG.artistSessionKey);
  },

  async login(email, password) {
    const data = await this.request('artist_login', {
      email: String(email || '').trim(),
      password: String(password || ''),
    });
    this.saveSession(data);
    return data.artist;
  },

  async signup(fields) {
    const data = await this.request('artist_signup', {
      artistName: String(fields.artistName || '').trim(),
      email: String(fields.email || '').trim(),
      password: String(fields.password || ''),
    });
    this.saveSession(data);
    return data.artist;
  },

  async signupLabel(fields) {
    const data = await this.request('label_signup', {
      labelName: String(fields.labelName || '').trim(),
      email: String(fields.email || '').trim(),
      password: String(fields.password || ''),
    });
    this.saveSession(data);
    return data.artist;
  },

  isLabelAccount() {
    return String(this.getArtist()?.accountType || '').toLowerCase() === 'label';
  },

  async createArtistProfile(fields) {
    return this.authRequest('artist_profile_create', {
      artistName: String(fields.artistName || '').trim(),
      claimEmail: String(fields.claimEmail || '').trim(),
    });
  },

  async revokeLabelAccess(labelAccountId) {
    return this.authRequest('label_access_revoke', {
      labelAccountId: String(labelAccountId || '').trim(),
    });
  },

  async uploadSubmissionAsset(fields) {
    return this.authRequest('song_upload_asset', {
      artistName: String(fields.artistName || '').trim(),
      songTitle: String(fields.songTitle || '').trim(),
      assetType: String(fields.assetType || '').trim(),
      fileName: String(fields.fileName || '').trim(),
      mimeType: String(fields.mimeType || '').trim(),
      fileBase64: String(fields.fileBase64 || ''),
    });
  },

  async submitSong(fields) {
    return this.authRequest('song_submit', {
      artistName: String(fields.artistName || '').trim(),
      songTitle: String(fields.songTitle || '').trim(),
      year: String(fields.year || '').trim(),
      musicStyle: String(fields.musicStyle || '').trim(),
      songwriter: String(fields.songwriter || '').trim(),
      recordLabel: String(fields.recordLabel || '').trim(),
      releaseType: String(fields.releaseType || 'single').trim(),
      albumName: String(fields.albumName || '').trim(),
      description: String(fields.description || '').trim(),
      website: String(fields.website || '').trim(),
      contactEmail: String(fields.contactEmail || '').trim(),
      mp3Link: String(fields.mp3Link || '').trim(),
      wavLink: String(fields.wavLink || '').trim(),
      coverLink: String(fields.coverLink || '').trim(),
    });
  },

  async activate(email, password) {
    const data = await this.request('artist_activate', {
      email: String(email || '').trim(),
      password: String(password || ''),
    });
    this.saveSession(data);
    return data.artist;
  },

  async authRequest(action, payload = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Not signed in.');
    return this.request(action, { token, ...payload });
  },

  updateArtistProfile(artist) {
    const session = this.getSession();
    if (!session) return;
    session.artist = { ...session.artist, ...artist };
    sessionStorage.setItem(CONFIG.artistSessionKey, JSON.stringify(session));
  },
};