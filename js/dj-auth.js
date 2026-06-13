const DjAuth = {
  isScriptReady() {
    return !!(CONFIG.googleScriptUrl && CONFIG.googleScriptUrl.includes('script.google.com'));
  },

  async request(action, payload = {}) {
    if (!this.isScriptReady()) {
      throw new Error('DJ sign-in is not configured yet. Add your Apps Script URL to js/config.js and redeploy Code.gs.');
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
      throw new Error('Could not reach the DJ sign-in service. Redeploy Apps Script with the latest Code.gs.');
    }

    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  saveSession(data) {
    sessionStorage.setItem(CONFIG.djSessionKey, JSON.stringify({
      token: data.token,
      dj: data.dj,
    }));
    sessionStorage.removeItem(CONFIG.authKey);
  },

  getSession() {
    const raw = sessionStorage.getItem(CONFIG.djSessionKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  },

  getDj() {
    return this.getSession()?.dj || null;
  },

  getToken() {
    return this.getSession()?.token || '';
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  logout() {
    sessionStorage.removeItem(CONFIG.djSessionKey);
    sessionStorage.removeItem(CONFIG.authKey);
  },

  async login(email, password) {
    const data = await this.request('dj_login', {
      email: String(email || '').trim(),
      password: String(password || ''),
    });
    this.saveSession(data);
    return data.dj;
  },

  async signup(fields) {
    const data = await this.request('dj_signup', {
      name: String(fields.name || '').trim(),
      station: String(fields.station || '').trim(),
      showName: String(fields.showName || '').trim(),
      email: String(fields.email || '').trim(),
      password: String(fields.password || ''),
    });
    this.saveSession(data);
    return data.dj;
  },
};