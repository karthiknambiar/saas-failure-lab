import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

afterEach(() => vi.restoreAllMocks())

describe('useMediaQuery', () => {
  it('tracks media query changes and unsubscribes when unmounted', () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined
    const removeEventListener = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(max-width: 820px)',
      onchange: null,
      addEventListener: (
        _type: string,
        next: EventListenerOrEventListenerObject,
      ) => {
        listener = next as (event: MediaQueryListEvent) => void
      },
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { result, unmount } = renderHook(() =>
      useMediaQuery('(max-width: 820px)'),
    )
    expect(result.current).toBe(true)

    act(() => listener?.({ matches: false } as MediaQueryListEvent))
    expect(result.current).toBe(false)

    unmount()
    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })
})
