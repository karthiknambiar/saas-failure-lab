import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ActionLink } from './ActionLink'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import { EvidencePanel } from './EvidencePanel'

describe('design-system primitives', () => {
  it('preserves native button and link semantics', () => {
    render(
      <MemoryRouter>
        <Button variant="primary">Begin</Button>
        <ActionLink to="/scenarios">Browse</ActionLink>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Begin' })).toHaveClass(
      'button--primary',
    )
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute(
      'href',
      '/scenarios',
    )
  })

  it('renders display and content surfaces without hidden controls', () => {
    render(
      <>
        <Badge>Beginner</Badge>
        <Card as="section">Card content</Card>
        <EvidencePanel title="Authentication events">
          Evidence content
        </EvidencePanel>
      </>,
    )

    expect(screen.getByText('Beginner')).not.toHaveAttribute('role', 'button')
    expect(
      screen.getByRole('region', { name: 'Authentication events' }),
    ).toBeInTheDocument()
  })
})
