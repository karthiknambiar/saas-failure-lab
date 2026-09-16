import { copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export async function createSpaFallback(outputDirectory) {
  await copyFile(
    path.join(outputDirectory, 'index.html'),
    path.join(outputDirectory, '404.html'),
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await createSpaFallback(path.resolve(process.argv[2] ?? 'dist'))
}
