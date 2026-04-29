import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const authenticationRuntimeSource = readFileSync(
  path.resolve(__dirname, '../src/platform/iamAuthenticationRuntime.ts'),
  'utf8',
)

function extractSection(source: string, startMarker: string, endMarker: string): string {
  const startIndex = source.indexOf(startMarker)
  expect(startIndex).toBeGreaterThanOrEqual(0)

  const endIndex = source.indexOf(endMarker, startIndex)
  expect(endIndex).toBeGreaterThan(startIndex)

  return source.slice(startIndex, endIndex)
}

describe('runtime login hot-path contract', () => {
  it('does not eagerly persist direct-login transactions before a follow-up step is needed', () => {
    const section = extractSection(
      authenticationRuntimeSource,
      'async function createLoginTransactionAsync(',
      'function recordFederatedLoginSessionLink(',
    )

    expect(section).not.toContain('await loginTransactionAsyncStore.put(transaction);')
  })

  it('does not persist completed transactions on the direct authenticated async login path', () => {
    const section = extractSection(
      authenticationRuntimeSource,
      'async function completeLoginStateAsync(',
      '  grantConsent(',
    )

    const completionIndex = section.indexOf("transaction.status = 'COMPLETE';")
    const returnIndex = section.indexOf('return {', completionIndex)

    expect(completionIndex).toBeGreaterThanOrEqual(0)
    expect(returnIndex).toBeGreaterThan(completionIndex)
    expect(section.slice(completionIndex, returnIndex)).not.toContain('loginTransactionAsyncStore.put(transaction)')
  })
})
