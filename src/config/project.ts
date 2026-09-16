export function getRepositoryDocumentationUrl(
  repositoryUrl: string | undefined,
): string | undefined {
  const normalizedUrl = repositoryUrl?.replace(/\/$/, '')
  return normalizedUrl ? `${normalizedUrl}#readme` : undefined
}
