const ArtistAuthUI = {
  init(options = {}) {
    const gate = document.getElementById('login-gate');
    const loginForm = document.getElementById('login-form');
    const activateForm = document.getElementById('activate-form');
    const loginError = document.getElementById('login-error');
    const activateError = document.getElementById('activate-error');
    const tabs = gate ? gate.querySelectorAll('[data-auth-tab]') : [];
    const panels = gate ? gate.querySelectorAll('[data-auth-panel]') : [];
    const onAuthenticated = options.onAuthenticated || (() => {});

    const showError = (el, message) => {
      if (!el) return;
      el.textContent = message;
      el.classList.add('show');
    };

    const clearErrors = () => {
      loginError?.classList.remove('show');
      activateError?.classList.remove('show');
    };

    const switchTab = (tabName) => {
      tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.authTab === tabName);
      });
      panels.forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.authPanel !== tabName);
      });
      clearErrors();
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.authTab));
    });

    loginForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors();

      const email = document.getElementById('login-email')?.value || '';
      const password = document.getElementById('login-password')?.value || '';
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…';

      try {
        await ArtistAuth.login(email, password);
        loginForm.reset();
        ArtistAuthUI.updateWelcome();
        onAuthenticated();
      } catch (err) {
        showError(loginError, err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    });

    activateForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors();

      const email = document.getElementById('activate-email')?.value || '';
      const password = document.getElementById('activate-password')?.value || '';
      const confirm = document.getElementById('activate-password-confirm')?.value || '';
      const submitBtn = activateForm.querySelector('button[type="submit"]');

      if (password !== confirm) {
        showError(activateError, 'Passwords do not match.');
        return;
      }

      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Activating…';

      try {
        await ArtistAuth.activate(email, password);
        activateForm.reset();
        ArtistAuthUI.updateWelcome();
        onAuthenticated();
      } catch (err) {
        showError(activateError, err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    });

    return { switchTab, clearErrors };
  },

  updateWelcome() {
    const welcome = document.getElementById('artist-welcome');
    if (!welcome) return;

    const artist = ArtistAuth.getArtist();
    if (!artist) {
      welcome.classList.add('hidden');
      welcome.textContent = '';
      return;
    }

    welcome.textContent = artist.artistName || artist.email;
    welcome.classList.remove('hidden');
  },

  bindLogout(button, onLogout) {
    button?.addEventListener('click', () => {
      ArtistAuth.logout();
      ArtistAuthUI.updateWelcome();
      onLogout();
    });
  },
};