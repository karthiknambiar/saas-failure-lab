import { describe, expect, it } from 'vitest'

import config from '../vite.config'

describe('Vitest configuration', () => {
  it('excludes tests inside local Git worktrees', () => {
    expect(config.test?.exclude).toContain('.worktrees/**')
  })
})
