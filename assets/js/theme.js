(function () {
  const storageKey = 'bikexp_theme';
  const body = document.body;
  const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function updateToggle(btn, isDark) {
    if (!btn) return;
    const icon = btn.querySelector('[data-theme-icon]');
    const text = btn.querySelector('[data-theme-text]');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (text) text.textContent = isDark ? 'Light mode' : 'Dark mode';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(isDark));
    btn.classList.toggle('is-dark', isDark);
    btn.dataset.themeState = isDark ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    const isDark = theme === 'dark';
    body.classList.toggle('theme-dark', isDark);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => updateToggle(btn, isDark));
    if (persist) {
      try {
        localStorage.setItem(storageKey, theme);
      } catch (err) {
        console.warn('Unable to persist theme preference', err);
      }
    }
  }

  function currentTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch (err) {
      return null;
    }
  }

  const saved = currentTheme();
  applyTheme(saved || (prefersDark() ? 'dark' : 'light'), false);

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-theme-toggle]');
    if (!toggle) return;
    const isDark = body.classList.contains('theme-dark');
    applyTheme(isDark ? 'light' : 'dark', true);
  });

  if (!saved && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event) => applyTheme(event.matches ? 'dark' : 'light', false);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
    } else if (typeof media.addListener === 'function') {
      media.addListener(listener);
    }
  }
})();
