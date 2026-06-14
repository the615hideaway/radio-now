const DjSignupForm = {
  timezones: [
    'Eastern',
    'Central',
    'Mountain',
    'Pacific',
    'Alaska',
    'Hawaii',
  ],

  formats: [
    'Bluegrass',
    'Americana',
    'Folk',
    'Country',
    'Gospel',
    'Mixed / Multi-format',
    'Other',
  ],

  fieldsHtml() {
    const formatOptions = this.formats.map((value) =>
      `<option value="${Utils.escapeHtml(value)}">${Utils.escapeHtml(value)}</option>`,
    ).join('');

    const timezoneOptions = this.timezones.map((value) =>
      `<option value="${Utils.escapeHtml(value)}">${Utils.escapeHtml(value)}</option>`,
    ).join('');

    return `
      <div class="dj-signup-form">
        <p class="auth-panel-note">Artists see your station and program details when they download your music. Your email stays private unless you turn on sharing below.</p>

        <fieldset class="dj-signup-section">
          <legend>Your name</legend>
          <div class="dj-signup-grid dj-signup-grid--2">
            <div>
              <label for="signup-first-name">First Name</label>
              <input type="text" id="signup-first-name" placeholder="Sammy" autocomplete="given-name" required>
            </div>
            <div>
              <label for="signup-last-name">Last Name</label>
              <input type="text" id="signup-last-name" placeholder="Passamano" autocomplete="family-name" required>
            </div>
          </div>
        </fieldset>

        <fieldset class="dj-signup-section">
          <legend>Program</legend>
          <div class="dj-signup-grid">
            <div>
              <label for="signup-program-name">Program Name</label>
              <input type="text" id="signup-program-name" placeholder="Radio Now" required>
            </div>
            <div>
              <label for="signup-program-format">Program Format</label>
              <select id="signup-program-format">
                <option value="">Select format</option>
                ${formatOptions}
              </select>
            </div>
            <div>
              <label for="signup-program-days">Day of Program</label>
              <input type="text" id="signup-program-days" placeholder="Saturday, Sunday">
            </div>
            <div class="dj-signup-grid dj-signup-grid--3">
              <div>
                <label for="signup-program-start">Program Start Time</label>
                <input type="time" id="signup-program-start">
              </div>
              <div>
                <label for="signup-program-end">Program End Time</label>
                <input type="time" id="signup-program-end">
              </div>
              <div>
                <label for="signup-program-timezone">Time Zone</label>
                <select id="signup-program-timezone">
                  <option value="">Select time zone</option>
                  ${timezoneOptions}
                </select>
              </div>
            </div>
            <div>
              <label for="signup-program-website">Program Website / Page</label>
              <input type="url" id="signup-program-website" placeholder="https://">
            </div>
          </div>
        </fieldset>

        <fieldset class="dj-signup-section">
          <legend>Station</legend>
          <div class="dj-signup-grid dj-signup-grid--2">
            <div>
              <label for="signup-station-call">Station Call Letters</label>
              <input type="text" id="signup-station-call" placeholder="WMTS" required>
            </div>
            <div>
              <label for="signup-station-frequency">Radio Station Frequency</label>
              <input type="text" id="signup-station-frequency" placeholder="88.3 FM">
            </div>
            <div>
              <label for="signup-state">State</label>
              <input type="text" id="signup-state" placeholder="TN" autocomplete="address-level1">
            </div>
            <div>
              <label for="signup-station-website">Station Website</label>
              <input type="url" id="signup-station-website" placeholder="https://">
            </div>
          </div>
        </fieldset>

        <fieldset class="dj-signup-section">
          <legend>Account</legend>
          <div class="dj-signup-grid">
            <div>
              <label for="signup-email">Email</label>
              <input type="email" id="signup-email" placeholder="you@station.com" autocomplete="email" required>
            </div>
            <div>
              <label for="signup-password">Password</label>
              <input type="password" id="signup-password" placeholder="At least 8 characters" autocomplete="new-password" minlength="8" required>
            </div>
            <label class="checkbox-field">
              <input type="checkbox" id="signup-share-email">
              <span>Share my email with artists when I download their music (so they can say thank you)</span>
            </label>
          </div>
        </fieldset>
      </div>`;
  },

  mount() {
    const form = document.getElementById('signup-form');
    if (!form || form.dataset.djSignupMounted === '1') return;

    const submitBtn = form.querySelector('button[type="submit"]');

    Array.from(form.children).forEach((child) => {
      if (child === submitBtn) return;
      if (child.id === 'signup-error' || child.classList.contains('login-error')) return;
      child.remove();
    });

    const fieldsHost = document.createElement('div');
    fieldsHost.id = 'dj-signup-fields';
    fieldsHost.innerHTML = this.fieldsHtml();
    if (submitBtn) form.insertBefore(fieldsHost, submitBtn);
    else form.appendChild(fieldsHost);

    form.dataset.djSignupMounted = '1';
  },

  fieldValue(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return String(el.value || '').trim();
  },

  collect() {
    return {
      firstName: this.fieldValue('signup-first-name'),
      lastName: this.fieldValue('signup-last-name'),
      programName: this.fieldValue('signup-program-name'),
      programFormat: this.fieldValue('signup-program-format'),
      stationCallLetters: this.fieldValue('signup-station-call'),
      stationFrequency: this.fieldValue('signup-station-frequency'),
      state: this.fieldValue('signup-state'),
      stationWebsite: this.fieldValue('signup-station-website'),
      programWebsite: this.fieldValue('signup-program-website'),
      programStartTime: this.fieldValue('signup-program-start'),
      programEndTime: this.fieldValue('signup-program-end'),
      programTimezone: this.fieldValue('signup-program-timezone'),
      programDays: this.fieldValue('signup-program-days'),
      email: this.fieldValue('signup-email'),
      password: this.fieldValue('signup-password'),
      shareEmail: !!document.getElementById('signup-share-email')?.checked,
    };
  },
};