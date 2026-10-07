import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('includes Progress in primary navigation', () => {
    render(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell />
      </MemoryRouter>,
    )

    expect(
      screen.getAllByRole('link', { name: 'Progress' })[0],
    ).toHaveAttribute('href', '/progress')
  })
})
