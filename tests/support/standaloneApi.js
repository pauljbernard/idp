const fs = require('fs')
const os = require('os')
const path = require('path')
const { once } = require('events')
const { spawn } = require('child_process')

const rootDir = path.resolve(__dirname, '../..')
const defaultBootstrapEnvPath = path.join(rootDir, 'deploy', 'iam-standalone', 'bootstrap.env.example')

function loadBootstrapEnvIfPresent(envFilePath = defaultBootstrapEnvPath) {
  if (!fs.existsSync(envFilePath)) {
    return
  }

  const lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    if (!key || process.env[key]) {
      continue
    }

    process.env[key] = value
  }
}

loadBootstrapEnvIfPresent()

function requireEnv(name) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

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

  if (options.tempRoot) {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
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

function buildDistributedStandaloneEnv(overrides = {}) {
  const awsEndpoint = process.env.AWS_ENDPOINT || 'http://127.0.0.1:4566'

  return {
    IDP_PLATFORM_PERSISTENCE_BACKEND: 'dynamodb-s3',
    IDP_PLATFORM_STATE_DYNAMODB_TABLE: requireEnv('IDP_PLATFORM_STATE_DYNAMODB_TABLE'),
    IDP_IAM_RUNTIME_DDB_TABLE: requireEnv('IDP_IAM_RUNTIME_DDB_TABLE'),
    IDP_PLATFORM_DURABLE_S3_BUCKET: requireEnv('IDP_PLATFORM_DURABLE_S3_BUCKET'),
    IDP_RATE_LIMIT_BACKEND: 'dynamodb',
    IDP_RATE_LIMIT_DYNAMODB_TABLE: requireEnv('IDP_RATE_LIMIT_DYNAMODB_TABLE'),
    IDP_DDB_RUNTIME_DUAL_WRITE: process.env.IDP_DDB_RUNTIME_DUAL_WRITE || 'true',
    IDP_DDB_RUNTIME_READ_V2: process.env.IDP_DDB_RUNTIME_READ_V2 || 'true',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'test',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    AWS_ENDPOINT: awsEndpoint,
    IDP_DYNAMODB_ENDPOINT: process.env.IDP_DYNAMODB_ENDPOINT || awsEndpoint,
    IDP_S3_ENDPOINT: process.env.IDP_S3_ENDPOINT || awsEndpoint,
    IDP_PLATFORM_DYNAMODB_ENDPOINT: process.env.IDP_PLATFORM_DYNAMODB_ENDPOINT || process.env.IDP_DYNAMODB_ENDPOINT || awsEndpoint,
    IDP_PLATFORM_S3_ENDPOINT: process.env.IDP_PLATFORM_S3_ENDPOINT || process.env.IDP_S3_ENDPOINT || awsEndpoint,
    IDP_GLOBAL_RATE_LIMIT_RPM: process.env.IDP_GLOBAL_RATE_LIMIT_RPM || '100000',
    IDP_AUTH_RATE_LIMIT_RPM: process.env.IDP_AUTH_RATE_LIMIT_RPM || '100000',
    IDP_RATE_LIMIT_BLOCK_MS: process.env.IDP_RATE_LIMIT_BLOCK_MS || '1000',
    IDP_AUTH_RATE_LIMIT_BLOCK_MS: process.env.IDP_AUTH_RATE_LIMIT_BLOCK_MS || '1000',
    IDP_LOG_RUNTIME_REPOSITORY_STATUS: process.env.IDP_LOG_RUNTIME_REPOSITORY_STATUS || 'true',
    ...overrides,
  }
}

async function startDistributedStandaloneApi(options = {}) {
  return startStandaloneApi({
    ...options,
    env: buildDistributedStandaloneEnv(options.env),
  })
}

module.exports = {
  buildDistributedStandaloneEnv,
  rootDir,
  startStandaloneApi,
  startDistributedStandaloneApi,
}
