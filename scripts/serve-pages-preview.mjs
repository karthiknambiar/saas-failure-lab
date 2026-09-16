import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}

function normalizeBasePath(basePath) {
  return `/${basePath.split('/').filter(Boolean).join('/')}/`
}

export function resolvePagesRequest(pathname, outputDirectory, basePath) {
  const normalizedBasePath = normalizeBasePath(basePath)

  if (!pathname.startsWith(normalizedBasePath)) {
    return undefined
  }

  const requestedPath = decodeURIComponent(
    pathname.slice(normalizedBasePath.length),
  )

  if (!requestedPath) {
    return { filePath: path.join(outputDirectory, 'index.html'), status: 200 }
  }

  if (path.extname(requestedPath)) {
    const filePath = path.resolve(outputDirectory, requestedPath)
    const outputRoot = `${path.resolve(outputDirectory)}${path.sep}`

    if (!filePath.startsWith(outputRoot)) {
      return undefined
    }

    return { filePath, status: 200 }
  }

  return { filePath: path.join(outputDirectory, '404.html'), status: 404 }
}

export function createPagesPreviewServer({ outputDirectory, basePath }) {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    const resolvedRequest = resolvePagesRequest(
      pathname,
      outputDirectory,
      basePath,
    )

    if (!resolvedRequest) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not found')
      return
    }

    try {
      const content = await readFile(resolvedRequest.filePath)
      response.writeHead(resolvedRequest.status, {
        'Content-Type':
          contentTypes[path.extname(resolvedRequest.filePath)] ??
          'application/octet-stream',
      })
      response.end(content)
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173)
  const server = createPagesPreviewServer({
    outputDirectory: path.resolve(process.env.OUTPUT_DIRECTORY ?? 'dist'),
    basePath: process.env.BASE_PATH ?? '/failure-lab/',
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`Pages preview listening on http://127.0.0.1:${port}`)
  })
}
