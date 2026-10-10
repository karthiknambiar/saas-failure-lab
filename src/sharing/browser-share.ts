import type { ShareChallengePayload } from './share-types'

export type ShareActionResult =
  { ok: true } | { ok: false; reason: 'unavailable' | 'failed' }

type NativeShareData = {
  title: string
  text: string
  url: string
}

type CanvasContext = {
  fillStyle: string
  font: string
  fillRect(x: number, y: number, width: number, height: number): void
  fillText(text: string, x: number, y: number): void
  measureText(text: string): { width: number }
}

type CanvasLike = {
  width: number
  height: number
  getContext(contextId: '2d'): CanvasContext | null
  toBlob(callback: (blob: Blob | null) => void, type?: string): void
}

type AnchorLike = {
  href: string
  download: string
  click(): void
}

type CardEnvironment = {
  canvas: { create(): CanvasLike }
  document: {
    createElement(tagName: 'a'): AnchorLike
    body: {
      appendChild(node: AnchorLike): void
      removeChild(node: AnchorLike): void
    }
  }
  Blob: new (parts?: BlobPart[], options?: BlobPropertyBag) => Blob
  url: {
    createObjectURL(blob: Blob): string
    revokeObjectURL(url: string): void
  }
}

export interface ShareEnvironment {
  navigator?: {
    share?: (data: NativeShareData) => Promise<void>
    clipboard?: { writeText(text: string): Promise<void> }
  }
  canvas?: { create(): CanvasLike }
  document?: {
    createElement(tagName: 'a'): AnchorLike
    body?: {
      appendChild(node: AnchorLike): void
      removeChild(node: AnchorLike): void
    }
  }
  Blob?: new (parts?: BlobPart[], options?: BlobPropertyBag) => Blob
  url?: {
    createObjectURL(blob: Blob): string
    revokeObjectURL(url: string): void
  }
}

export type ShareCardInstruction =
  | {
      kind: 'rect'
      x: number
      y: number
      width: number
      height: number
      color: string
    }
  | {
      kind: 'text'
      role: 'title' | 'score' | 'prompt' | 'brand'
      text: string
      x: number
      y: number
      color: string
      font: string
    }

export interface ShareCardInstructions {
  width: number
  height: number
  instructions: ShareCardInstruction[]
}

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630
const TITLE_FONT = '700 48px system-ui, sans-serif'
export const SHARE_CARD_TITLE_MAX_WIDTH = 1056
export const SHARE_CARD_TITLE_MAX_LINES = 3

export type ShareCardTextMeasurer = (text: string, font: string) => number

export async function shareChallenge(
  payload: ShareChallengePayload,
  environment?: ShareEnvironment,
): Promise<ShareActionResult> {
  const navigator = resolveEnvironment(environment).navigator
  if (!navigator?.share) {
    return unavailable()
  }

  try {
    await navigator.share({
      title: payload.title,
      text: shareMessage(payload),
      url: payload.challengeUrl,
    })
    return success()
  } catch {
    return failed()
  }
}

export async function copyChallengeLink(
  payload: ShareChallengePayload,
  environment?: ShareEnvironment,
): Promise<ShareActionResult> {
  const clipboard = resolveEnvironment(environment).navigator?.clipboard
  if (!clipboard?.writeText) {
    return unavailable()
  }

  try {
    await clipboard.writeText(payload.challengeUrl)
    return success()
  } catch {
    return failed()
  }
}

export function getShareCardInstructions(
  payload: ShareChallengePayload,
  measureText: ShareCardTextMeasurer = deterministicTextWidth,
): ShareCardInstructions {
  const titleLines = wrapTitle(payload.title, measureText)
  const titleInstructions = titleLines.map((text, index) => ({
    kind: 'text' as const,
    role: 'title' as const,
    text,
    x: 72,
    y: 170 + index * 58,
    color: '#f8fafc',
    font: TITLE_FONT,
  }))

  return {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    instructions: [
      {
        kind: 'rect',
        x: 0,
        y: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        color: '#0f172a',
      },
      { kind: 'rect', x: 72, y: 72, width: 12, height: 422, color: '#38bdf8' },
      {
        kind: 'text',
        role: 'brand',
        text: 'SAAS FAILURE LAB',
        x: 108,
        y: 104,
        color: '#7dd3fc',
        font: '600 24px system-ui, sans-serif',
      },
      ...titleInstructions,
      {
        kind: 'text',
        role: 'score',
        text: `TOTAL SCORE: ${payload.score.total}`,
        x: 108,
        y: 424,
        color: '#fbbf24',
        font: '700 30px system-ui, sans-serif',
      },
      {
        kind: 'text',
        role: 'prompt',
        text: 'TRY THE SAME SCENARIO VARIATION',
        x: 108,
        y: 482,
        color: '#cbd5e1',
        font: '400 26px system-ui, sans-serif',
      },
      {
        kind: 'text',
        role: 'prompt',
        text: 'COMPLETED CHALLENGE',
        x: 108,
        y: 532,
        color: '#94a3b8',
        font: '400 20px system-ui, sans-serif',
      },
    ],
  }
}

export async function downloadShareCard(
  payload: ShareChallengePayload,
  environment?: ShareEnvironment,
): Promise<ShareActionResult> {
  const resolved = resolveEnvironment(environment)
  if (!hasCardCapabilities(resolved)) {
    return unavailable()
  }

  try {
    const canvas = resolved.canvas.create()
    if (!hasCanvasOperations(canvas)) {
      return unavailable()
    }
    canvas.width = CARD_WIDTH
    canvas.height = CARD_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) {
      return unavailable()
    }
    drawInstructions(
      context,
      getShareCardInstructions(payload, (text, font) => {
        context.font = font
        return context.measureText(text).width
      }).instructions,
    )
    const sourceBlob = await canvasToBlob(canvas)
    if (!sourceBlob) {
      return failed()
    }
    const blob = new resolved.Blob([sourceBlob], { type: 'image/png' })
    const objectUrl = resolved.url.createObjectURL(blob)

    try {
      const anchor = resolved.document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `saas-failure-lab-${payload.scenarioId}.png`
      resolved.document.body.appendChild(anchor)
      try {
        anchor.click()
      } finally {
        resolved.document.body.removeChild(anchor)
      }
      return success()
    } finally {
      resolved.url.revokeObjectURL(objectUrl)
    }
  } catch {
    return failed()
  }
}

function resolveEnvironment(environment?: ShareEnvironment): ShareEnvironment {
  if (environment) {
    return environment
  }

  try {
    const browser = globalThis as typeof globalThis & {
      navigator?: ShareEnvironment['navigator']
      document?: ShareEnvironment['document']
    }
    const url = browser.URL as
      | {
          createObjectURL?: (blob: Blob) => string
          revokeObjectURL?: (url: string) => void
        }
      | undefined
    return {
      navigator: browser.navigator,
      canvas: browser.document
        ? {
            create: () =>
              browser.document!.createElement(
                'canvas',
              ) as unknown as CanvasLike,
          }
        : undefined,
      document: browser.document,
      Blob: browser.Blob,
      url:
        url?.createObjectURL && url.revokeObjectURL
          ? {
              createObjectURL: url.createObjectURL,
              revokeObjectURL: url.revokeObjectURL,
            }
          : undefined,
    }
  } catch {
    return {}
  }
}

function hasCardCapabilities(
  environment: ShareEnvironment,
): environment is CardEnvironment {
  return Boolean(
    environment.canvas &&
    environment.document?.body &&
    environment.Blob &&
    environment.url?.createObjectURL &&
    environment.url.revokeObjectURL,
  )
}

function hasCanvasOperations(canvas: CanvasLike): boolean {
  return (
    typeof canvas.getContext === 'function' &&
    typeof canvas.toBlob === 'function'
  )
}

function drawInstructions(
  context: CanvasContext,
  instructions: ShareCardInstruction[],
): void {
  for (const instruction of instructions) {
    context.fillStyle = instruction.color
    if (instruction.kind === 'rect') {
      context.fillRect(
        instruction.x,
        instruction.y,
        instruction.width,
        instruction.height,
      )
    } else {
      context.font = instruction.font
      context.fillText(instruction.text, instruction.x, instruction.y)
    }
  }
}

function canvasToBlob(canvas: CanvasLike): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

function wrapTitle(
  title: string,
  measureText: ShareCardTextMeasurer,
): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && !fitsTitle(candidate, measureText)) {
      lines.push(line)
      line = ''
    }

    if (fitsTitle(word, measureText)) {
      line = line ? `${line} ${word}` : word
    } else {
      for (const character of Array.from(word)) {
        const characterCandidate = `${line}${character}`
        if (line && !fitsTitle(characterCandidate, measureText)) {
          lines.push(line)
          line = character
        } else {
          line = characterCandidate
        }
      }
    }
  }
  if (line) {
    lines.push(line)
  }

  if (lines.length <= SHARE_CARD_TITLE_MAX_LINES) {
    return lines.length > 0 ? lines : ['Untitled scenario']
  }

  return [
    ...lines.slice(0, SHARE_CARD_TITLE_MAX_LINES - 1),
    ellipsizeTitle(lines[SHARE_CARD_TITLE_MAX_LINES - 1], measureText),
  ]
}

function fitsTitle(text: string, measureText: ShareCardTextMeasurer): boolean {
  return measureText(text, TITLE_FONT) <= SHARE_CARD_TITLE_MAX_WIDTH
}

function ellipsizeTitle(
  line: string,
  measureText: ShareCardTextMeasurer,
): string {
  let shortened = line
  while (shortened && !fitsTitle(`${shortened}…`, measureText)) {
    shortened = Array.from(shortened).slice(0, -1).join('')
  }
  return `${shortened}…`
}

function deterministicTextWidth(text: string): number {
  return Array.from(text).length * 26
}

function shareMessage(payload: ShareChallengePayload): string {
  return `I completed the "${payload.title}" challenge in SaaS Failure Lab with a total score of ${payload.score.total}. Try the same scenario variation—no solutions included.`
}

function success(): ShareActionResult {
  return { ok: true }
}

function unavailable(): ShareActionResult {
  return { ok: false, reason: 'unavailable' }
}

function failed(): ShareActionResult {
  return { ok: false, reason: 'failed' }
}
