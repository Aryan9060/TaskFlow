import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { downloadCsv } from '../services/export.js'
import { dayKeyOf } from '../utils/format.js'
import { THEMES, applyTheme } from '../utils/themes.js'

// Settings page: switch the sketchbook theme, export your data as CSV, and
// jump to the account preferences that live on the Profile page.
export default function Settings() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'notebook')
  const [exporting, setExporting] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // Applies a theme immediately and remembers it for the next visit.
  const handleTheme = (themeId) => {
    applyTheme(themeId)
    setTheme(themeId)
  }

  // Downloads one of the owner-scoped CSV exports.
  const handleExport = async (kind) => {
    setExporting(kind)
    setNotice('')
    setError('')
    try {
      const filename = `taskflow-${kind}-${dayKeyOf(new Date())}.csv`
      await downloadCsv(`/export/${kind}.csv`, filename)
      setNotice(`Downloaded ${filename}.`)
    } catch {
      setError('Could not export your data. Please try again.')
    } finally {
      setExporting('')
    }
  }

  return (
    <section>
      <div className="page-heading">
        <h2>Settings</h2>
        <p>Make TaskFlow feel like yours, and take your data with you.</p>
      </div>

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="card settings-card">
        <h3 className="card-title-with-icon">
          <Icon name="palette" size={18} /> Appearance
        </h3>
        <p className="row-sub">Four sketchbooks, same ink-on-paper bones.</p>

        <div className="settings-theme-grid">
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`settings-theme ${theme === item.id ? 'active' : ''}`}
              onClick={() => handleTheme(item.id)}
              aria-pressed={theme === item.id}
            >
              <span className="settings-swatches" aria-hidden="true">
                {item.swatch.map((color) => (
                  <span key={color} style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="settings-theme-name">{item.name}</span>
              <span className="settings-theme-hint">{item.hint}</span>
              {theme === item.id && (
                <span className="settings-theme-check">
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="card settings-card">
        <h3 className="card-title-with-icon">
          <Icon name="download" size={18} /> Export your data
        </h3>
        <p className="row-sub">
          CSV files open in Excel, Sheets, or any spreadsheet. Only your own records are included.
        </p>

        <div className="quick-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={exporting !== ''}
            onClick={() => handleExport('sessions')}
          >
            <Icon name="download" size={16} />
            {exporting === 'sessions' ? 'Preparing...' : 'Study sessions CSV'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={exporting !== ''}
            onClick={() => handleExport('tasks')}
          >
            <Icon name="download" size={16} />
            {exporting === 'tasks' ? 'Preparing...' : 'Tasks & assignments CSV'}
          </button>
        </div>
      </div>

      <div className="card settings-card">
        <h3>Preferences</h3>
        <p className="row-sub">
          Pomodoro focus and break lengths live on your profile. Your theme choice is stored on this
          device only.
        </p>
        <Link className="btn-secondary" to="/profile">
          <Icon name="user" size={16} /> Open profile
        </Link>
      </div>
    </section>
  )
}
