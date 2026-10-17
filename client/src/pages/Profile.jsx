import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { updateMe } from '../services/auth.js'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [form, setForm] = useState({
    name: user.name,
    pomodoroFocusMinutes: user.preferences.pomodoroFocusMinutes,
    pomodoroBreakMinutes: user.preferences.pomodoroBreakMinutes,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.name.trim().length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }

    setSubmitting(true)

    try {
      const data = await updateMe({
        name: form.name.trim(),
        preferences: {
          pomodoroFocusMinutes: Number(form.pomodoroFocusMinutes),
          pomodoroBreakMinutes: Number(form.pomodoroBreakMinutes),
        },
      })
      updateUser(data.data.user)
      setSuccess('Profile updated.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update your profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <h2>Profile</h2>
        <p>Your account details and study preferences.</p>
      </div>

      <div className="card profile-card">
        <dl className="profile-meta">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pomodoroFocusMinutes">Pomodoro focus (minutes)</label>
              <input
                id="pomodoroFocusMinutes"
                name="pomodoroFocusMinutes"
                type="number"
                min="5"
                max="120"
                required
                value={form.pomodoroFocusMinutes}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pomodoroBreakMinutes">Break (minutes)</label>
              <input
                id="pomodoroBreakMinutes"
                name="pomodoroBreakMinutes"
                type="number"
                min="1"
                max="60"
                required
                value={form.pomodoroBreakMinutes}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="alert alert-success" role="status">
              {success}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </section>
  )
}
