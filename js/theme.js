// Theme forced by user, independent of browser/OS. Runs before paint (in <head>).
window.hbTheme = {
  apply(t) {
    document.documentElement.dataset.theme = t;
    const bg = t === 'dark' ? '#1c1922' : '#faf8f4';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg);
    document.querySelector('meta[name=color-scheme]')?.setAttribute('content', 'only ' + t);
  },
  toggle() {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', t); } catch { }
    this.apply(t);
  },
};
let t; try { t = localStorage.getItem('theme'); } catch { }
document.addEventListener('DOMContentLoaded', () => hbTheme.apply(t || 'light'));
document.documentElement.dataset.theme = t || 'light';
