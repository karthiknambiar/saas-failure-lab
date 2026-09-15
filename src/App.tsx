const productPromises = [
  'No account required',
  'Free and open source',
  'Runs in your browser',
  'No AI required',
]

export function App() {
  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="product-title">
        <p className="eyebrow">
          Troubleshooting practice for SaaS professionals
        </p>
        <h1 id="product-title">SaaS Failure Lab</h1>
        <p className="tagline">
          Practice real-world SaaS troubleshooting before the customer is
          waiting.
        </p>

        <p className="milestone-status" role="status">
          Repository foundation is ready.
        </p>

        <ul className="product-promises" aria-label="Product commitments">
          {productPromises.map((promise) => (
            <li key={promise}>{promise}</li>
          ))}
        </ul>

        <a className="details-link" href="#foundation-details">
          Review the current milestone
        </a>
      </section>

      <section
        className="foundation-card"
        id="foundation-details"
        aria-labelledby="foundation-title"
      >
        <p className="card-label">Milestone 0</p>
        <h2 id="foundation-title">A dependable static foundation</h2>
        <p>
          Build, quality, testing, and deployment tooling are in place. Gameplay
          begins only after the required product foundations are complete.
        </p>
      </section>
    </main>
  )
}
