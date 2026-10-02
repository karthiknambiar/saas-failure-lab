const evidenceLabels: Record<string, string> = {
  'affected-user-scope': 'Affected user scope',
  'authentication-events': 'Authentication events',
  'role-audit-history': 'Role audit history',
  'role-configuration': 'Role configuration',
  'service-status': 'Service status',
}

export function sentenceCase(value: string): string {
  const normalized = value.replaceAll(/[_-]+/g, ' ').trim()
  return normalized
    ? `${normalized[0].toUpperCase()}${normalized.slice(1)}`
    : ''
}

export function evidenceLabel(evidenceId: string, tool?: string): string {
  return evidenceLabels[evidenceId] ?? sentenceCase(tool ?? evidenceId)
}
