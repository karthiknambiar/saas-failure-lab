export function getRouterBasename(baseUrl: string): string | undefined {
  return baseUrl === '/' ? undefined : baseUrl.replace(/\/$/, '')
}
