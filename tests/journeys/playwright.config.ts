import path from 'path'
import { defineConfig } from '@playwright/test'

const rootDir = path.resolve(__dirname, '../..')
const apiPort = Number.parseInt(process.env.IDP_JOURNEY_API_PORT ?? '4000', 10)
const uiPort = Number.parseInt(process.env.IDP_JOURNEY_UI_PORT ?? '3004', 10)
const apiBaseUrl = `http://127.0.0.1:${apiPort}`
const uiBaseUrl = `http://127.0.0.1:${uiPort}`
const skipUi = process.env.IDP_JOURNEY_SKIP_UI === '1'
const tempRoot = path.join(rootDir, '.tmp', 'playwright', `api-${apiPort}`, skipUi ? 'api-only' : `ui-${uiPort}`)
const webServer = [
  {
    command: 'npm --prefix apps/api-server run start',
    cwd: rootDir,
    url: `${apiBaseUrl}/health`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(apiPort),
      IDP_PLATFORM_STATE_ROOT: path.join(tempRoot, 'state'),
      IDP_PLATFORM_DURABLE_ROOT: path.join(tempRoot, 'durable'),
      IDP_RATE_LIMIT_BACKEND: 'memory',
    },
  },
]

if (!skipUi) {
  webServer.push({
    command: `npm --prefix apps/enterprise-ui run dev -- --host 127.0.0.1 --port ${uiPort}`,
    cwd: rootDir,
    url: `${uiBaseUrl}/iam/login`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(uiPort),
    },
  })
}

export default defineConfig({
  testDir: __dirname,
  testMatch: '*.spec.ts',
  timeout: 90_000,
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: skipUi ? apiBaseUrl : uiBaseUrl,
    headless: true,
  },
  webServer,
})
