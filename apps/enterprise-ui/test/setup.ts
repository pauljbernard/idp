import { webcrypto } from 'crypto'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})
