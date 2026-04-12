const fs = require('fs')
const os = require('os')
const path = require('path')
const { once } = require('events')
const { spawn } = require('child_process')

const rootDir = path.resolve(__dirname, '../..')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHealth(url, child, timeoutMs = 120_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Standalone API exited early with code ${child.exitCode}`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Continue polling until the server is ready.
    }

    await delay(1_000)
  }

  throw new Error(`Timed out waiting for standalone API health check at ${url}`)
}

async function stopStandaloneApi(child, logStream) {
  if (child.exitCode === null) {
    child.kill('SIGTERM')
    const exited = Promise.race([
      once(child, 'exit'),
      delay(5_000).then(() => {
        if (child.exitCode === null) {
          child.kill('SIGKILL')
        }
      }),
    ])
    await exited
  }

  await new Promise((resolve) => logStream.end(resolve))
}

async function startStandaloneApi(options = {}) {
  const port = options.port ?? 4_000
  const tempRoot = options.tempRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), 'idp-test-'))
  const stateRoot = options.stateRoot ?? path.join(tempRoot, 'state')
  const durableRoot = options.durableRoot ?? path.join(tempRoot, 'durable')
  const logFile = options.logFile ?? path.join(tempRoot, 'standalone-api.log')

  fs.mkdirSync(stateRoot, { recursive: true })
  fs.mkdirSync(durableRoot, { recursive: true })
  fs.mkdirSync(path.dirname(logFile), { recursive: true })

  const logStream = fs.createWriteStream(logFile, { flags: 'a' })
  const child = spawn('npm', ['--prefix', path.join(rootDir, 'apps/api-server'), 'run', 'start'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      IDP_PLATFORM_STATE_ROOT: stateRoot,
      IDP_PLATFORM_DURABLE_ROOT: durableRoot,
      IDP_RATE_LIMIT_BACKEND: 'memory',
      ...(options.env ?? {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => logStream.write(chunk))
  child.stderr.on('data', (chunk) => logStream.write(chunk))

  try {
    await waitForHealth(`http://127.0.0.1:${port}/health`, child)
  } catch (error) {
    await stopStandaloneApi(child, logStream)
    throw new Error(`${error instanceof Error ? error.message : String(error)}. See ${logFile}`)
  }

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    tempRoot,
    stateRoot,
    durableRoot,
    logFile,
    stop: async () => {
      await stopStandaloneApi(child, logStream)
    },
  }
}

module.exports = {
  rootDir,
  startStandaloneApi,
}
