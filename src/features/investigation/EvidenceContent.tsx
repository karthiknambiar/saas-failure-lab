import { Badge } from '../../components/Badge'
import type { ScenarioInstanceEvidence } from '../../engine/scenario-instance'
import { sentenceCase } from './investigation-labels'

type EvidenceContentProps = {
  content: ScenarioInstanceEvidence['content']
}

function assertNever(value: never): never {
  throw new Error(`Unsupported evidence content: ${JSON.stringify(value)}`)
}

function timelineDateTime(value: string): string {
  return value.match(/(?:[01]\d|2[0-3]):[0-5]\d$/)?.[0] ?? value
}

export function EvidenceContent({ content }: EvidenceContentProps) {
  switch (content.kind) {
    case 'text': {
      const lines = content.text.split('\n')

      return (
        <p>
          {lines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </p>
      )
    }

    case 'status':
      return (
        <div className="evidence-status">
          <Badge>{sentenceCase(content.state)}</Badge>
          <p>{content.detail}</p>
        </div>
      )

    case 'key_value':
      return (
        <dl className="evidence-values">
          {Object.entries(content.values).map(([key, value]) => (
            <div key={key}>
              <dt>{sentenceCase(key)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )

    case 'table':
      return (
        <div className="evidence-table-scroll">
          <table>
            <caption className="visually-hidden">Evidence details</caption>
            <thead>
              <tr>
                {content.columns.map((column) => (
                  <th key={column} scope="col">
                    {sentenceCase(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row, index) => (
                <tr key={index}>
                  {content.columns.map((column) => (
                    <td key={column}>{row[column] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'timeline':
      return (
        <ol className="evidence-timeline">
          {content.events.map((event, index) => (
            <li key={`${event.time}-${index}`}>
              <time dateTime={timelineDateTime(event.time)}>{event.time}</time>
              <p>{event.event}</p>
            </li>
          ))}
        </ol>
      )

    default:
      return assertNever(content)
  }
}
