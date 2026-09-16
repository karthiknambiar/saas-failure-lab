import { ActionLink } from '../components/ActionLink'

export function NotFoundPage() {
  return (
    <div className="page container not-found">
      <p className="eyebrow">404 · Route unavailable</p>
      <h1>Page not found</h1>
      <p>
        This route is not part of the current lab. Return to the product or
        browse the available scenario area.
      </p>
      <div className="action-row">
        <ActionLink to="/" variant="primary">
          Return home
        </ActionLink>
        <ActionLink to="/scenarios">Browse scenarios</ActionLink>
      </div>
    </div>
  )
}
