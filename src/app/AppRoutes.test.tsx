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
    ['/scenarios/iam-001', 'Login works, feature does not'],
    ['/daily', 'Daily Incident'],
    ['/progress', 'Your progress'],
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

  it('marks Progress as the current navigation item', () => {
    renderRoute('/progress')

    expect(
      screen.getAllByRole('link', { name: 'Progress' })[0],
    ).toHaveAttribute('aria-current', 'page')
  })

  it('marks Daily as the current navigation item', () => {
    renderRoute('/daily')

    expect(screen.getAllByRole('link', { name: 'Daily' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
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

  it('lists the IAM scenario without inactive filter controls', () => {
    renderRoute('/scenarios')

    expect(
      screen.getByRole('link', { name: 'Open Login works, feature does not' }),
    ).toHaveAttribute('href', '/scenarios/iam-001')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
    expect(
      screen.getByText('Authentication vs authorization'),
    ).toBeInTheDocument()
  })
})
