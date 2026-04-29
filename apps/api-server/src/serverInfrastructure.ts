export type TrustProxySetting = boolean | number | string

interface SocketLike {
  remoteAddress?: string | null
}

interface RequestLike {
  ip?: string | null
  socket?: SocketLike | null
}

export function normalizeHeaderValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeBaseUrl(rawValue: string, envName: string): string {
  let parsed: URL

  try {
    parsed = new URL(rawValue)
  } catch {
    throw new Error(`${envName} must be a valid absolute http(s) URL.`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${envName} must use the http or https scheme.`)
  }

  parsed.hash = ''
  parsed.search = ''
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'

  return `${parsed.origin}${parsed.pathname === '/' ? '' : parsed.pathname}`
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '[::1]'
}

function normalizePublicListenHost(host: string): string {
  const normalized = host.trim().toLowerCase()
  if (normalized === '0.0.0.0' || normalized === '::' || normalized === '[::]') {
    return 'localhost'
  }
  return host.trim()
}

export function resolveCanonicalApiBaseUrl(listenHost: string, port: number, configuredBaseUrl?: string): string {
  const configured = normalizeHeaderValue(configuredBaseUrl)
  if (configured) {
    return normalizeBaseUrl(configured, 'IDP_API_BASE_URL')
  }

  return `http://${normalizePublicListenHost(listenHost)}:${port}`
}

export function resolveCanonicalUiBaseUrl(
  apiBaseUrl: string,
  apiPort: number,
  configuredBaseUrl?: string,
): string {
  const configured = normalizeHeaderValue(configuredBaseUrl)
  if (configured) {
    return normalizeBaseUrl(configured, 'IDP_UI_BASE_URL')
  }

  const parsedApiBaseUrl = new URL(apiBaseUrl)
  if (
    isLoopbackHost(parsedApiBaseUrl.hostname)
    && (parsedApiBaseUrl.port === '' || parsedApiBaseUrl.port === String(apiPort))
  ) {
    parsedApiBaseUrl.port = '3004'
  }

  return normalizeBaseUrl(parsedApiBaseUrl.toString(), 'IDP_UI_BASE_URL')
}

export function resolveTrustProxySetting(value?: string): TrustProxySetting {
  const normalized = normalizeHeaderValue(value)
  if (!normalized) {
    return false
  }

  const lowerCased = normalized.toLowerCase()
  if (lowerCased === 'true' || lowerCased === 'on' || lowerCased === 'yes') {
    return true
  }
  if (lowerCased === 'false' || lowerCased === 'off' || lowerCased === 'no') {
    return false
  }

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10)
  }

  return normalized
}

export function resolveClientIp(req: RequestLike, trustProxy: TrustProxySetting): string {
  if (trustProxy !== false) {
    return normalizeHeaderValue(req.ip)
      || normalizeHeaderValue(req.socket?.remoteAddress)
      || 'unknown'
  }

  return normalizeHeaderValue(req.socket?.remoteAddress)
    || normalizeHeaderValue(req.ip)
    || 'unknown'
}
