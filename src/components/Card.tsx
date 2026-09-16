import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'section' | 'div'
}

export function Card({
  as: Component = 'article',
  className = '',
  ...props
}: CardProps) {
  return <Component className={`card ${className}`.trim()} {...props} />
}
