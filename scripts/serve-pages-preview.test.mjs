import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { resolvePagesRequest } from './serve-pages-preview.mjs'

const outputDirectory = path.resolve('dist')

test('resolves the repository root to the built index', () => {
  assert.deepEqual(
    resolvePagesRequest('/failure-lab/', outputDirectory, '/failure-lab/'),
    {
      filePath: path.join(outputDirectory, 'index.html'),
      status: 200,
    },
  )
})

test('resolves clean routes to the GitHub Pages fallback', () => {
  assert.deepEqual(
    resolvePagesRequest(
      '/failure-lab/scenarios',
      outputDirectory,
      '/failure-lab/',
    ),
    {
      filePath: path.join(outputDirectory, '404.html'),
      status: 404,
    },
  )
})

test('rejects requests outside the repository base path', () => {
  assert.equal(
    resolvePagesRequest('/scenarios', outputDirectory, '/failure-lab/'),
    undefined,
  )
})
