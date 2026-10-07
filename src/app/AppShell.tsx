import { NavLink, Outlet } from 'react-router-dom'

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Scenarios', to: '/scenarios' },
  { label: 'Progress', to: '/progress' },
  { label: 'How it works', to: '/how-it-works' },
]

function NavigationLinks({ className }: { className: string }) {
  return (
    <ul className={className}>
      {navigationItems.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to}>{item.label}</NavLink>
        </li>
      ))}
    </ul>
  )
}

export function AppShell() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <NavLink
            className="wordmark"
            to="/"
            aria-label="SaaS Failure Lab home"
          >
            <span aria-hidden="true" className="wordmark__mark">
              SF
            </span>
            <span>SaaS Failure Lab</span>
          </NavLink>
          <nav aria-label="Primary navigation">
            <NavigationLinks className="desktop-navigation" />
            <details className="mobile-navigation">
              <summary>Menu</summary>
              <NavigationLinks className="mobile-navigation__links" />
            </details>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <p>Practice SaaS troubleshooting before the customer is waiting.</p>
          <p>Static, private by default, and built without hosted AI.</p>
        </div>
      </footer>
    </div>
  )
}
