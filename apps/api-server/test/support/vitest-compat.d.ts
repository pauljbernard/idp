declare module 'vitest' {
  export {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    test,
  } from '@jest/globals'

  import { jest } from '@jest/globals'

  export const vi: {
    fn: typeof jest.fn
    spyOn: typeof jest.spyOn
    resetModules: typeof jest.resetModules
  }
}
