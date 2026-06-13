const DjAuthUI = {
  init(options = {}) {
    const gate = document.getElementById('login-gate');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
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
      signupError?.classList.remove('show');
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
        await DjAuth.login(email, password);
        loginForm.reset();
        DjAuthUI.updateWelcome();
        onAuthenticated();
      } catch (err) {
        showError(loginError, err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    });

    signupForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors();

      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account…';

      try {
        await DjAuth.signup({
          name: document.getElementById('signup-name')?.value || '',
          station: document.getElementById('signup-station')?.value || '',
          showName: document.getElementById('signup-show')?.value || '',
          email: document.getElementById('signup-email')?.value || '',
          password: document.getElementById('signup-password')?.value || '',
        });
        signupForm.reset();
        DjAuthUI.updateWelcome();
        onAuthenticated();
      } catch (err) {
        showError(signupError, err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    });

    return { switchTab, clearErrors };
  },

  updateWelcome() {
    const welcome = document.getElementById('dj-welcome');
    if (!welcome) return;

    const dj = DjAuth.getDj();
    if (!dj) {
      welcome.classList.add('hidden');
      welcome.textContent = '';
      return;
    }

    const station = dj.station ? ` · ${dj.station}` : '';
    welcome.textContent = `${dj.name || dj.email}${station}`;
    welcome.classList.remove('hidden');
  },

  bindLogout(button, onLogout) {
    button?.addEventListener('click', () => {
      DjAuth.logout();
      DjAuthUI.updateWelcome();
      onLogout();
    });
  },
};