export default function PlaceholderPage({ title, phase }) {
  return (
    <section className="card placeholder-page">
      <h2>{title}</h2>
      <p>
        This page is part of the Phase 1 app shell. The real {title.toLowerCase()} features arrive
        in Phase {phase}.
      </p>
    </section>
  )
}
