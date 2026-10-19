// Theme catalogue. The CSS token blocks live in index.css under
// [data-theme="..."]; this list powers the picker and the saved preference.
export const THEMES = [
  { id: 'notebook', name: 'Notebook', hint: 'ink on paper (default)', swatch: ['#fbfaf5', '#1b1b18', '#ffe14d'] },
  { id: 'midnight', name: 'Midnight', hint: 'late-night focus', swatch: ['#10131c', '#ece9dc', '#ffd166'] },
  { id: 'campus', name: 'Campus', hint: 'sage and graph paper', swatch: ['#f1f5e8', '#24331f', '#c9e265'] },
  { id: 'blueprint', name: 'Blueprint', hint: 'cool drafting paper', swatch: ['#eef3fa', '#1f3a5f', '#9fd0ff'] },
]

export const THEME_STORAGE_KEY = 'taskflow-theme'

// Applies a theme to <html> and remembers it for the next visit.
export function applyTheme(id) {
  const valid = THEMES.some((theme) => theme.id === id) ? id : 'notebook'
  document.documentElement.dataset.theme = valid
  try {
    localStorage.setItem(THEME_STORAGE_KEY, valid)
  } catch {
    // Private mode can block storage; the theme still applies this session.
  }
}
