// Theme management script
class ThemeManager {
  constructor() {
    this.theme = this.getInitialTheme();
    this.callbacks = [];
    this.init();
  }

  getInitialTheme() {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  }

  init() {
    this.applyTheme(this.theme);
    
    // Listen to system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
    this.notifyCallbacks(theme);
  }

  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }

  toggleTheme() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  getTheme() {
    return this.theme;
  }

  onThemeChange(callback) {
    this.callbacks.push(callback);
  }

  offThemeChange(callback) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  notifyCallbacks(theme) {
    this.callbacks.forEach(callback => callback(theme));
  }
}

// Create global theme manager instance
window.themeManager = new ThemeManager();

// Global functions for easy access
window.toggleTheme = () => window.themeManager.toggleTheme();
window.setTheme = (theme) => window.themeManager.setTheme(theme);
window.getTheme = () => window.themeManager.getTheme();