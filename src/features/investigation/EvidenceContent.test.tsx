import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EvidenceContent } from './EvidenceContent'

describe('EvidenceContent', () => {
  it('renders authored text line breaks as semantic breaks', () => {
    const { container } = render(
      <EvidenceContent
        content={{ kind: 'text', text: 'Customer note\nFollow-up' }}
      />,
    )

    expect(screen.getByText('Customer note')).toBeVisible()
    expect(screen.getByText('Follow-up')).toBeVisible()
    expect(container.querySelector('p br')).toBeInTheDocument()
  })

  it('renders sentence-cased status content with a design-system badge', () => {
    render(
      <EvidenceContent
        content={{
          kind: 'status',
          state: 'service_operational',
          detail: 'Non-SSO access remains available.',
        }}
      />,
    )

    expect(screen.getByText('Service operational')).toHaveClass('badge')
    expect(screen.getByText('Non-SSO access remains available.')).toBeVisible()
  })

  it('renders key/value evidence as a description list', () => {
    const { container } = render(
      <EvidenceContent
        content={{
          kind: 'key_value',
          values: { account_status: 'Active', reporting_role: 'Missing' },
        }}
      />,
    )

    const list = container.querySelector('dl')
    expect(list).toBeInTheDocument()
    if (!list) throw new Error('Expected a description list')
    expect(within(list).getByText('Account status').tagName).toBe('DT')
    expect(within(list).getByText('Missing').tagName).toBe('DD')
  })

  it('renders table evidence with a caption, headers, and body cells', () => {
    render(
      <EvidenceContent
        content={{
          kind: 'table',
          columns: ['affected_user', 'access_level'],
          rows: [{ affected_user: 'Ari', access_level: 'Denied' }],
        }}
      />,
    )

    const table = screen.getByRole('table')
    expect(within(table).getByText('Evidence details').tagName).toBe('CAPTION')
    expect(
      within(table).getByRole('columnheader', { name: 'Affected user' }),
    ).toBeVisible()
    expect(within(table).getByRole('cell', { name: 'Denied' })).toBeVisible()
  })

  it('renders timeline evidence as an ordered list with machine-readable times', () => {
    render(
      <EvidenceContent
        content={{
          kind: 'timeline',
          events: [{ time: 'Today 09:02', event: 'Sign-in succeeded.' }],
        }}
      />,
    )

    const timeline = screen.getByRole('list')
    expect(timeline.tagName).toBe('OL')
    expect(timeline).toHaveClass('evidence-timeline')
    expect(screen.getByText('Today 09:02')).toHaveAttribute('dateTime', '09:02')
    expect(screen.getByText('Sign-in succeeded.')).toBeVisible()
  })
})
