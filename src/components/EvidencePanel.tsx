import { useId, type HTMLAttributes, type ReactNode } from 'react'

type EvidencePanelProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode
  metadata?: ReactNode
}

export function EvidencePanel({
  title,
  metadata,
  children,
  className = '',
  ...props
}: EvidencePanelProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className={`evidence-panel ${className}`.trim()}
      role="region"
      {...props}
    >
      <header className="evidence-panel__header">
        <h2 id={titleId}>{title}</h2>
        {metadata ? (
          <div className="evidence-panel__metadata">{metadata}</div>
        ) : null}
      </header>
      <div className="evidence-panel__content">{children}</div>
    </section>
  )
}
