const Spotlight = {
  config() {
    return CONFIG.spotlight || {};
  },

  normalize(value) {
    return String(value || '').trim().toLowerCase();
  },

  startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  parseDateOnly(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const date = this.startOfDay(raw);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = this.startOfDay(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  parseReleaseDate(song) {
    const raw = String(song?.releaseDate || '').trim();
    if (raw) {
      const parsed = this.parseDateOnly(raw);
      if (parsed) return parsed;
    }

    const year = parseInt(String(song?.year || ''), 10);
    if (year) return this.startOfDay(`${year}-12-31`);
    return null;
  },

  daysSince(date) {
    const today = this.startOfDay(new Date());
    return Math.floor((today.getTime() - date.getTime()) / 86400000);
  },

  isLabelNewRelease(song) {
    const cfg = this.config();
    if (this.normalize(song?.recordLabel) !== this.normalize(cfg.labelName)) return false;
    const release = this.parseReleaseDate(song);
    if (!release) return false;
    const days = this.daysSince(release);
    return days >= 0 && days <= (cfg.labelNewReleaseDays ?? 30);
  },

  score(song) {
    const cfg = this.config();
    const today = this.startOfDay(new Date());
    let score = 0;

    const manualPriority = parseInt(song?.spotlightPriority, 10) || 0;
    const until = this.parseDateOnly(song?.spotlightUntil);
    const manualActive = manualPriority > 0 && (!until || until >= today);
    if (manualActive) score = manualPriority;

    if (this.normalize(song?.artistName) === this.normalize(cfg.houseArtist)) {
      score = Math.max(score, cfg.houseArtistScore ?? 100);
    }

    if (this.isLabelNewRelease(song)) {
      score = Math.max(score, cfg.labelNewReleaseScore ?? 75);
    }

    return score;
  },

  badge(song) {
    if (this.score(song) <= 0) return '';
    const cfg = this.config();
    if (this.normalize(song?.artistName) === this.normalize(cfg.houseArtist)) return 'Featured';
    if (this.isLabelNewRelease(song)) return 'New Release';
    return 'Spotlight';
  },

  sortSongs(songs) {
    return [...songs].sort((a, b) => {
      const scoreDiff = this.score(b) - this.score(a);
      if (scoreDiff !== 0) return scoreDiff;
      return Utils.compareSongsNewestFirst(a, b);
    });
  },
};