import { Link } from 'react-router-dom'

// Fallback screen for any route that does not exist.
export default function NotFound() {
  return (
    <section className="card placeholder-page">
      <h2>404 — Page not found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link className="button-link" to="/">
        Back to Dashboard
      </Link>
    </section>
  )
}
