import { format } from 'prettier'

import type { ScenarioDocument } from './validate-scenarios'

export async function serializeScenarioCatalog(
  documents: readonly ScenarioDocument[],
): Promise<string> {
  const scenarios = documents.map(({ scenario }) => scenario)
  const source = `import type { ScenarioSource } from '../content/scenario-schema'

export const scenarioCatalog: ScenarioSource[] = ${JSON.stringify(scenarios)}
`

  return format(source, {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    endOfLine: 'lf',
  })
}
