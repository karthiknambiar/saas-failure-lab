import type { InvestigationEvidenceView } from '../../engine/investigation-selectors'
import { evidenceLabel } from './investigation-labels'

interface EvidenceToolListProps {
  evidence: InvestigationEvidenceView[]
  hasBudget: boolean
  selectedEvidenceId?: string
  onOpen: (evidenceId: string) => void
  onSelect: (evidenceId: string) => void
}

export function EvidenceToolList({
  evidence,
  hasBudget,
  selectedEvidenceId,
  onOpen,
  onSelect,
}: EvidenceToolListProps) {
  return (
    <div className="tool-list">
      {evidence.map((item) => {
        const label = evidenceLabel(item.id, item.tool)
        const costLabel = hasBudget ? 'Cost' : 'Effort'
        const opened = item.state === 'opened'
        const locked = item.state === 'locked'
        const selected = selectedEvidenceId === item.id

        return (
          <button
            key={item.id}
            type="button"
            className="tool-list__item"
            aria-label={
              locked
                ? `${label}, locked`
                : opened
                  ? `View ${label}, opened`
                  : `Open ${label}, ${costLabel.toLowerCase()} ${item.cost}`
            }
            aria-current={selected ? 'true' : undefined}
            disabled={locked}
            onClick={() => (opened ? onSelect(item.id) : onOpen(item.id))}
          >
            <span>{label}</span>
            <small>
              {locked
                ? 'Locked'
                : opened
                  ? 'Opened'
                  : `${costLabel} ${item.cost}`}
            </small>
          </button>
        )
      })}
    </div>
  )
}
