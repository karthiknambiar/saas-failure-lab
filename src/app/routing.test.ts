import { describe, expect, it } from 'vitest'

import { getRouterBasename } from './routing'

describe('getRouterBasename', () => {
  it('uses no basename for a root deployment', () => {
    expect(getRouterBasename('/')).toBeUndefined()
  })

  it('removes the trailing slash from a repository deployment path', () => {
    expect(getRouterBasename('/saas-failure-lab/')).toBe('/saas-failure-lab')
  })
})
