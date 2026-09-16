import { Link, type LinkProps } from 'react-router-dom'

import type { Emphasis } from './Button'

type ActionLinkProps = LinkProps & {
  variant?: Emphasis
}

export function ActionLink({
  variant = 'secondary',
  className = '',
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={`button button--${variant} ${className}`.trim()}
      {...props}
    />
  )
}
