import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkspaceTabs } from './WorkspaceTabs'

describe('WorkspaceTabs', () => {
  it('changes tabs by click and standard keyboard commands', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <WorkspaceTabs active="tools" onChange={onChange} />,
    )

    const tools = screen.getByRole('tab', { name: 'Tools' })
    expect(tools).toHaveAttribute('aria-selected', 'true')
    expect(tools).toHaveAttribute('aria-controls', 'workspace-panel-tools')

    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    expect(onChange).toHaveBeenCalledWith('evidence')

    rerender(<WorkspaceTabs active="evidence" onChange={onChange} />)
    const evidence = screen.getByRole('tab', { name: 'Evidence' })
    evidence.focus()
    fireEvent.keyDown(evidence, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('notebook')
    expect(screen.getByRole('tab', { name: 'Notebook' })).toHaveFocus()
    fireEvent.keyDown(evidence, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('tools')
    fireEvent.keyDown(evidence, { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('tools')
    fireEvent.keyDown(evidence, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('notebook')
  })
})
