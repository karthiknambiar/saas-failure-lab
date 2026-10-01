import { forwardRef } from 'react'

import { Button } from '../../components/Button'
import type { InvestigationEvidenceView } from '../../engine/investigation-selectors'
import { EvidenceContent } from './EvidenceContent'
import { evidenceLabel } from './investigation-labels'

interface EvidenceViewerProps {
  evidence?: InvestigationEvidenceView
  bookmarked: boolean
  onToggleBookmark: (evidenceId: string) => void
}

export const EvidenceViewer = forwardRef<
  HTMLHeadingElement,
  EvidenceViewerProps
>(function EvidenceViewer({ evidence, bookmarked, onToggleBookmark }, ref) {
  if (!evidence || evidence.state !== 'opened' || !evidence.content) {
    return (
      <div className="evidence-empty">
        <h2 ref={ref} tabIndex={-1}>
          Evidence viewer
        </h2>
        <p>Open an available investigation tool to inspect its evidence.</p>
      </div>
    )
  }

  const label = evidenceLabel(evidence.id, evidence.tool)
  return (
    <article className="evidence-viewer">
      <header className="evidence-viewer__header">
        <div>
          <p className="eyebrow">Opened evidence</p>
          <h2 ref={ref} tabIndex={-1}>
            {label}
          </h2>
        </div>
        <Button onClick={() => onToggleBookmark(evidence.id)}>
          {bookmarked ? `Remove ${label} bookmark` : `Bookmark ${label}`}
        </Button>
      </header>
      <EvidenceContent content={evidence.content} />
    </article>
  )
})
