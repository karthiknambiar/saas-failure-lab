export interface ScenarioIssue {
  filePath: string
  path: string
  message: string
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function formatScenarioIssues(issues: ScenarioIssue[]): string {
  const issuesByFile = new Map<string, ScenarioIssue[]>()

  for (const issue of issues) {
    const fileIssues = issuesByFile.get(issue.filePath)
    if (fileIssues) {
      fileIssues.push(issue)
    } else {
      issuesByFile.set(issue.filePath, [issue])
    }
  }

  return [...issuesByFile.entries()]
    .sort(([leftFile], [rightFile]) => compareText(leftFile, rightFile))
    .map(([filePath, fileIssues]) => {
      const issueLines = fileIssues
        .sort(
          (left, right) =>
            compareText(left.path, right.path) ||
            compareText(left.message, right.message),
        )
        .map((issue) => `  ${issue.path || 'document'}: ${issue.message}`)

      return [filePath, ...issueLines].join('\n')
    })
    .join('\n')
}
