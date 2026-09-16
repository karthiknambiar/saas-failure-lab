import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from './AppRoutes'

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('application routes', () => {
  it.each([
    ['/', 'Practice the investigation before it is urgent.'],
    ['/scenarios', 'Browse troubleshooting scenarios'],
    ['/how-it-works', 'How an investigation works'],
  ])('renders %s', (path, heading) => {
    renderRoute(path)

    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it('marks the current page in navigation', () => {
    renderRoute('/scenarios')

    expect(
      screen.getAllByRole('link', { name: 'Scenarios' })[0],
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders recovery actions for unknown routes', () => {
    renderRoute('/missing')

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('renders labeled inactive scenario filters', () => {
    renderRoute('/scenarios')

    expect(
      screen.getByRole('searchbox', { name: 'Search scenarios' }),
    ).toBeDisabled()
    expect(screen.getByLabelText('Domain')).toBeDisabled()
    expect(screen.getByLabelText('Difficulty')).toBeDisabled()
    expect(screen.getByText(/filters become available/i)).toBeInTheDocument()
  })
})
