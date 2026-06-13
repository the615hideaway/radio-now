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