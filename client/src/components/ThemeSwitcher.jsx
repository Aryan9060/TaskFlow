import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { THEMES, applyTheme, THEME_STORAGE_KEY } from '../utils/themes.js'

// Header palette picker: previews each theme and persists the choice.
export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || localStorage.getItem(THEME_STORAGE_KEY) || 'notebook'
  )
  const pickerRef = useRef(null)

  // Closes the menu when clicking anywhere outside of it.
  useEffect(() => {
    if (!open) return
    const handlePointer = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open])

  // Applies the chosen theme and closes the menu.
  const chooseTheme = (id) => {
    applyTheme(id)
    setTheme(id)
    setOpen(false)
  }

  return (
    <div className="theme-picker" ref={pickerRef}>
      <button
        type="button"
        className="btn-secondary theme-toggle"
        aria-label="Choose theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Icon name="palette" size={18} />
        Theme
      </button>

      {open && (
        <div className="theme-menu" role="menu" aria-label="Themes">
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.id}
              className={`theme-option ${theme === option.id ? 'active' : ''}`}
              onClick={() => chooseTheme(option.id)}
            >
              <span
                className="theme-preview"
                style={{ backgroundColor: option.swatch[0], borderColor: option.swatch[1] }}
                aria-hidden="true"
              >
                <span style={{ backgroundColor: option.swatch[1] }} />
                <span style={{ backgroundColor: option.swatch[2] }} />
              </span>
              <span className="theme-meta">
                <strong>{option.name}</strong>
                <small>{option.hint}</small>
              </span>
              {theme === option.id && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
