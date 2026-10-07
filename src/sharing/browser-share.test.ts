import { describe, expect, it } from 'vitest'

import type { ShareChallengePayload } from './share-types'
import {
  copyChallengeLink,
  downloadShareCard,
  getShareCardInstructions,
  SHARE_CARD_TITLE_MAX_LINES,
  SHARE_CARD_TITLE_MAX_WIDTH,
  shareChallenge,
  type ShareEnvironment,
} from './browser-share'

const payload: ShareChallengePayload = {
  scenarioId: 'billing-outage',
  scenarioVersion: 1,
  seed: 'abc123',
  title: 'Billing service incident',
  score: { total: 82, diagnosisPoints: 60, evidencePoints: 22 },
  challengeUrl: 'https://example.test/scenarios/billing-outage?seed=abc123',
}

const shareText =
  'I completed the "Billing service incident" challenge in SaaS Failure Lab with a total score of 82. Try the same scenario variation—no solutions included.'

describe('browser share adapter', () => {
  it('shares only public challenge fields with the native browser API', async () => {
    let shared: ShareData | undefined
    let receivedOwner = false
    const navigator = {
      share: async function (data: ShareData) {
        receivedOwner = this === navigator
        shared = data
      },
    }
    const result = await shareChallenge(payload, {
      navigator,
    })

    expect(result).toEqual({ ok: true })
    expect(shared).toEqual({
      title: payload.title,
      text: shareText,
      url: payload.challengeUrl,
    })
    expect(receivedOwner).toBe(true)
  })

  it('reports failed native shares and unavailable native sharing', async () => {
    await expect(
      shareChallenge(payload, {
        navigator: {
          share: async () => Promise.reject(new Error('cancelled')),
        },
      }),
    ).resolves.toEqual({ ok: false, reason: 'failed' })
    await expect(shareChallenge(payload, { navigator: {} })).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('copies the exact challenge link', async () => {
    let copied: string | undefined
    let receivedOwner = false
    const clipboard = {
      writeText: async function (text: string) {
        receivedOwner = this === clipboard
        copied = text
      },
    }
    const result = await copyChallengeLink(payload, {
      navigator: { clipboard },
    })

    expect(result).toEqual({ ok: true })
    expect(copied).toBe(payload.challengeUrl)
    expect(receivedOwner).toBe(true)
  })

  it('reports failed clipboard writes and unavailable clipboard access', async () => {
    await expect(
      copyChallengeLink(payload, {
        navigator: {
          clipboard: {
            writeText: async () => Promise.reject(new Error('blocked')),
          },
        },
      }),
    ).resolves.toEqual({ ok: false, reason: 'failed' })
    await expect(
      copyChallengeLink(payload, { navigator: {} }),
    ).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('creates fixed public-only card instructions', () => {
    const instructions = getShareCardInstructions(payload)
    const publicLines = instructions.instructions
      .filter((instruction) => instruction.kind === 'text')
      .map((instruction) => instruction.text)

    expect(instructions.width).toBe(1200)
    expect(instructions.height).toBe(630)
    expect(publicLines.length).toBeGreaterThan(0)
    expect(publicLines).toContain('COMPLETED CHALLENGE')
    expect(publicLines.join(' ').toLowerCase()).not.toMatch(
      /root|evidence|debrief|relevance|actions|bookmark|remediation|communication/,
    )
  })

  it('wraps long titles deterministically', () => {
    const longPayload = {
      ...payload,
      title:
        'A deliberately extended public incident title for deterministic share card line wrapping checks',
    }

    expect(getShareCardInstructions(longPayload)).toEqual(
      getShareCardInstructions(longPayload),
    )
    expect(
      getShareCardInstructions(longPayload).instructions.filter(
        (instruction) =>
          instruction.kind === 'text' && instruction.role === 'title',
      ).length,
    ).toBeGreaterThan(1)
  })

  it('bounds and ellipsizes unspaced, CJK, and emoji titles by measured width', () => {
    const measureText = (text: string) => Array.from(text).length * 100

    for (const title of [
      'supercalifragilisticexpialidocious'.repeat(3),
      '決済障害調査シナリオ'.repeat(8),
      '🚨'.repeat(50),
    ]) {
      const instructions = getShareCardInstructions(
        { ...payload, title },
        measureText,
      )
      const titleLines = instructions.instructions.flatMap((instruction) =>
        instruction.kind === 'text' && instruction.role === 'title'
          ? [instruction.text]
          : [],
      )

      expect(titleLines).toHaveLength(SHARE_CARD_TITLE_MAX_LINES)
      expect(
        titleLines.every(
          (line) => measureText(line) <= SHARE_CARD_TITLE_MAX_WIDTH,
        ),
      ).toBe(true)
      expect(titleLines.at(-1)?.endsWith('…')).toBe(true)
      expect(
        getShareCardInstructions({ ...payload, title }, measureText),
      ).toEqual(instructions)
    }
  })

  it('downloads a PNG card and always removes/revokes temporary browser resources', async () => {
    const fake = createCardEnvironment()

    await expect(downloadShareCard(payload, fake.environment)).resolves.toEqual(
      { ok: true },
    )
    expect(fake.canvas).toMatchObject({ width: 1200, height: 630 })
    expect(fake.anchor.download).toBe('saas-failure-lab-billing-outage.png')
    expect(fake.clicked).toBe(true)
    expect(fake.removed).toBe(true)
    expect(fake.revoked).toEqual(['blob:share-card'])
  })

  it('reports unavailable for each missing card capability', async () => {
    const complete = createCardEnvironment().environment
    for (const environment of [
      { ...complete, canvas: undefined },
      { ...complete, document: undefined },
      { ...complete, Blob: undefined },
      { ...complete, url: undefined },
      {
        ...complete,
        document: { ...complete.document!, body: undefined },
      },
      {
        ...complete,
        canvas: {
          create: () =>
            ({
              width: 0,
              height: 0,
              getContext: () => null,
              toBlob: () => undefined,
            }) as never,
        },
      },
      {
        ...complete,
        canvas: {
          create: () =>
            ({
              width: 0,
              height: 0,
              getContext: () => ({
                fillStyle: '',
                font: '',
                fillRect: () => undefined,
                fillText: () => undefined,
              }),
            }) as never,
        },
      },
    ]) {
      await expect(
        downloadShareCard(payload, environment as ShareEnvironment),
      ).resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      })
    }
  })

  it('reports failures and revokes the URL after post-URL failures', async () => {
    const clickFailure = createCardEnvironment({
      click: () => {
        throw new Error('click')
      },
    })
    await expect(
      downloadShareCard(payload, clickFailure.environment),
    ).resolves.toEqual({ ok: false, reason: 'failed' })
    expect(clickFailure.revoked).toEqual(['blob:share-card'])
    expect(clickFailure.removed).toBe(true)

    const nullBlob = createCardEnvironment({
      toBlob: (callback) => callback(null),
    })
    await expect(
      downloadShareCard(payload, nullBlob.environment),
    ).resolves.toEqual({ ok: false, reason: 'failed' })

    const urlFailure = createCardEnvironment({
      createObjectURL: () => {
        throw new Error('url')
      },
    })
    await expect(
      downloadShareCard(payload, urlFailure.environment),
    ).resolves.toEqual({ ok: false, reason: 'failed' })

    const throwingBlob = createCardEnvironment({
      toBlob: () => {
        throw new Error('encoding')
      },
    })
    await expect(
      downloadShareCard(payload, throwingBlob.environment),
    ).resolves.toEqual({ ok: false, reason: 'failed' })
  })

  it('does not use network APIs while creating a share card', async () => {
    let fetchCalls = 0
    let xhrCalls = 0
    const environment = {
      ...createCardEnvironment().environment,
      fetch: () => {
        fetchCalls += 1
      },
      XMLHttpRequest: () => {
        xhrCalls += 1
      },
    }

    await expect(
      downloadShareCard(payload, environment as ShareEnvironment),
    ).resolves.toEqual({ ok: true })
    expect(fetchCalls).toBe(0)
    expect(xhrCalls).toBe(0)
  })

  it('does not mutate the share payload', async () => {
    const original = structuredClone(payload)
    await shareChallenge(payload, {
      navigator: { share: async () => undefined },
    })
    await copyChallengeLink(payload, {
      navigator: { clipboard: { writeText: async () => undefined } },
    })
    await downloadShareCard(payload, createCardEnvironment().environment)

    expect(payload).toEqual(original)
  })
})

function createCardEnvironment(
  overrides: {
    click?: () => void
    toBlob?: (callback: (blob: Blob | null) => void) => void
    createObjectURL?: (blob: Blob) => string
  } = {},
) {
  let clicked = false
  let removed = false
  const revoked: string[] = []
  const anchor = {
    download: '',
    href: '',
    click: () => {
      clicked = true
    },
  }
  const context = {
    fillStyle: '',
    font: '',
    fillRect: () => undefined,
    fillText: () => undefined,
    measureText: (text: string) => ({ width: Array.from(text).length * 26 }),
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob:
      overrides.toBlob ??
      ((callback: (blob: Blob | null) => void) =>
        callback(new Blob(['card'], { type: 'image/png' }))),
  }
  const environment: ShareEnvironment = {
    canvas: {
      create: () => canvas,
    },
    document: {
      createElement: () => {
        anchor.click = overrides.click ?? anchor.click
        return anchor
      },
      body: {
        appendChild: () => undefined,
        removeChild: () => {
          removed = true
        },
      },
    },
    Blob,
    url: {
      createObjectURL: overrides.createObjectURL ?? (() => 'blob:share-card'),
      revokeObjectURL: (url) => revoked.push(url),
    },
  }

  return {
    environment,
    canvas,
    anchor,
    get clicked() {
      return clicked
    },
    get removed() {
      return removed
    },
    revoked,
  }
}
