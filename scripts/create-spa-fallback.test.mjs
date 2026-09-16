import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createSpaFallback } from './create-spa-fallback.mjs'

test('copies index.html to 404.html', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'failure-lab-'))

  try {
    await writeFile(path.join(directory, 'index.html'), '<main>app</main>')
    await createSpaFallback(directory)

    assert.equal(
      await readFile(path.join(directory, '404.html'), 'utf8'),
      '<main>app</main>',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
