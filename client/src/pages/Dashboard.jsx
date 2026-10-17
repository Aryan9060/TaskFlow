import { useApiHealth } from '../hooks/useApiHealth.js'

const featureCards = [
  { title: 'Tasks', text: 'To-do lists with priorities, due dates, and statuses.', phase: 5 },
  { title: 'Assignments', text: 'Track submissions and deadlines per subject.', phase: 5 },
  { title: 'Exam Planner', text: 'Countdowns to every exam, all in one place.', phase: 6 },
  { title: 'Study Timer', text: 'Pomodoro sessions saved to your account.', phase: 7 },
]

export default function Dashboard() {
  const { loading, online, db } = useApiHealth()

  return (
    <section>
      <div className="page-heading">
        <h2>Welcome back</h2>
        <p>Your study command centre. Real data arrives in Phase 3.</p>
      </div>

      <div className="card status-card">
        <div>
          <h3>Backend connection</h3>
          <p className="status-line">
            {loading && 'Checking API...'}
            {!loading && online && `API online — MongoDB ${db}`}
            {!loading && !online && 'API unreachable. Is the server running on port 5000?'}
          </p>
        </div>
        <span className={`badge ${loading ? 'badge-neutral' : online ? 'badge-success' : 'badge-danger'}`}>
          {loading ? '...' : online ? 'Connected' : 'Offline'}
        </span>
      </div>

      <div className="card-grid">
        {featureCards.map((card) => (
          <article className="card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <span className="badge badge-neutral">Coming in Phase {card.phase}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
