import { useRef } from 'react'

import type { WorkspaceTab } from './useInvestigationController'

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'tools', label: 'Tools' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'notebook', label: 'Notebook' },
]

export function WorkspaceTabs({
  active,
  onChange,
}: {
  active: WorkspaceTab
  onChange: (tab: WorkspaceTab) => void
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function activate(index: number) {
    const next = tabs[index]
    if (!next) return

    onChange(next.id)
    refs.current[index]?.focus()
  }

  return (
    <div
      className="workspace-tabs"
      role="tablist"
      aria-label="Investigation workspace"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => {
            refs.current[index] = node
          }}
          type="button"
          role="tab"
          id={`workspace-tab-${tab.id}`}
          aria-controls={`workspace-panel-${tab.id}`}
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              activate((index + 1) % tabs.length)
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault()
              activate((index - 1 + tabs.length) % tabs.length)
            } else if (event.key === 'Home') {
              event.preventDefault()
              activate(0)
            } else if (event.key === 'End') {
              event.preventDefault()
              activate(tabs.length - 1)
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
