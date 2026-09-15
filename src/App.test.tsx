import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('introduces the lab and identifies the current milestone', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'SaaS Failure Lab' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Repository foundation is ready.'),
    ).toBeInTheDocument()
  })
})
