// Applies the saved (or system) colour theme before first paint to avoid a flash.
// Kept as an external file so a strict Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var saved = localStorage.getItem('openml-theme');
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
