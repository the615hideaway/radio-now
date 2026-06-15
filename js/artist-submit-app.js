(function () {
  function mountSubmitPanel(account) {
    const openLink = document.getElementById('song-google-form-open-link');
    const formUrl = CONFIG.artistSongFormUrl || 'https://forms.gle/zFExL6otU1e7hJF59';
    if (openLink) openLink.href = formUrl;

    const note = document.getElementById('song-submit-note');
    if (note) {
      const isLabel = String(account?.accountType || '').toLowerCase() === 'label';
      note.textContent = isLabel
        ? 'Submit new releases for any artist on your roster. Songs appear on the live catalog within about 10 minutes after you submit.'
        : 'Submit a new single to Radio Now. Your song usually appears on the live catalog within about 10 minutes after you submit.';
    }
  }

  ArtistPortalAuth.initPage({
    activeNav: 'submit',
    onReady({ account, isDemoMode }) {
      const name = account?.artistName || (isDemoMode ? 'David Parmley' : '');
      const isLabel = String(account?.accountType || '').toLowerCase() === 'label';
      const title = document.getElementById('page-title');
      const copy = document.getElementById('page-copy');
      if (title) title.textContent = isLabel ? 'Submit a new song' : 'Submit a new song';
      if (copy && name) {
        copy.textContent = isLabel
          ? `${name} — upload MP3, WAV, and cover art via the submission form.`
          : `${name} — upload MP3, WAV, and cover art via the submission form.`;
      }
      mountSubmitPanel(account || { accountType: isDemoMode ? 'artist' : '' });
    },
  });
})();