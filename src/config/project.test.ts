import { describe, expect, it } from 'vitest'

import { getRepositoryDocumentationUrl } from './project'

describe('getRepositoryDocumentationUrl', () => {
  it('links to the configured repository README', () => {
    expect(
      getRepositoryDocumentationUrl('https://github.com/example/failure-lab/'),
    ).toBe('https://github.com/example/failure-lab#readme')
  })

  it('does not invent a repository when none is configured', () => {
    expect(getRepositoryDocumentationUrl(undefined)).toBeUndefined()
  })
})
