import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  test,
} from '@jest/globals'

export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
}

export const vi = {
  fn: jest.fn.bind(jest),
  spyOn: jest.spyOn.bind(jest),
  resetModules: jest.resetModules.bind(jest),
}
