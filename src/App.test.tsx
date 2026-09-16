import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('renders the landing route', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Practice the investigation before it is urgent.',
      }),
    ).toBeInTheDocument()
  })
})
