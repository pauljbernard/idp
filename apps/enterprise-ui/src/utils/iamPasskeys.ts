const STORAGE_KEY = 'idp:iam:software-passkeys:v1'

type StoredSoftwarePasskey = {
  realm_id: string
  user_id: string
  credential_id: string
  device_label: string
  algorithm: 'ES256'
  public_key_jwk: JsonWebKey
  private_key_jwk: JsonWebKey
  created_at: string
}

function nowIso() {
  return new Date().toISOString()
}

function getStorage(): StoredSoftwarePasskey[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveStorage(records: StoredSoftwarePasskey[]) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function createCredentialId() {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

function toBase64Url(value: Uint8Array | ArrayBuffer) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  const binary = window.atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function registrationPayload(realmId: string, userId: string, challengeId: string, challenge: string, credentialId: string) {
  return `idp-iam-passkey:register:${realmId}:${userId}:${challengeId}:${challenge}:${credentialId}`
}

function authenticationPayload(realmId: string, userId: string, challengeId: string, challenge: string, credentialId: string) {
  return `idp-iam-passkey:authenticate:${realmId}:${userId}:${challengeId}:${challenge}:${credentialId}`
}

async function importPrivateKey(jwk: JsonWebKey) {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign'],
  )
}

async function signPayload(privateKeyJwk: JsonWebKey, payload: string) {
  const privateKey = await importPrivateKey(privateKeyJwk)
  const signature = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    new TextEncoder().encode(payload),
  )
  return toBase64Url(signature)
}

export function listIamLocalPasskeys(filters?: {
  realm_id?: string
  user_id?: string
}) {
  return getStorage().filter((record) => {
    if (filters?.realm_id && record.realm_id !== filters.realm_id) {
      return false
    }
    if (filters?.user_id && record.user_id !== filters.user_id) {
      return false
    }
    return true
  })
}

export async function createIamSoftwarePasskey(input: {
  realm_id: string
  user_id: string
  challenge_id: string
  challenge: string
  device_label: string
}) {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify'],
  )
  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey)
  const credentialId = createCredentialId()
  const proofSignature = await signPayload(
    privateKeyJwk,
    registrationPayload(input.realm_id, input.user_id, input.challenge_id, input.challenge, credentialId),
  )
  const record: StoredSoftwarePasskey = {
    realm_id: input.realm_id,
    user_id: input.user_id,
    credential_id: credentialId,
    device_label: input.device_label.trim(),
    algorithm: 'ES256',
    public_key_jwk: publicKeyJwk,
    private_key_jwk: privateKeyJwk,
    created_at: nowIso(),
  }
  const nextRecords = getStorage().filter(
    (candidate) => !(candidate.realm_id === record.realm_id && candidate.user_id === record.user_id && candidate.credential_id === record.credential_id),
  )
  nextRecords.push(record)
  saveStorage(nextRecords)
  return {
    challenge_id: input.challenge_id,
    credential_id: credentialId,
    device_label: record.device_label,
    public_key_jwk: publicKeyJwk,
    algorithm: record.algorithm,
    transports: ['SOFTWARE'] as const,
    proof_signature: proofSignature,
  }
}

export async function completeIamSoftwarePasskeyAssertion(input: {
  realm_id: string
  user_id: string
  challenge_id: string
  challenge: string
  allowed_credential_ids: string[]
  preferred_credential_id?: string | null
}) {
  const localCredentials = listIamLocalPasskeys({
    realm_id: input.realm_id,
    user_id: input.user_id,
  }).filter((record) => input.allowed_credential_ids.includes(record.credential_id))
  const selectedCredential = (input.preferred_credential_id
    ? localCredentials.find((record) => record.credential_id === input.preferred_credential_id)
    : null) ?? localCredentials[0]
  if (!selectedCredential) {
    throw new Error('No matching local passkey is available on this device')
  }
  const proofSignature = await signPayload(
    selectedCredential.private_key_jwk,
    authenticationPayload(
      input.realm_id,
      input.user_id,
      input.challenge_id,
      input.challenge,
      selectedCredential.credential_id,
    ),
  )
  return {
    challenge_id: input.challenge_id,
    credential_id: selectedCredential.credential_id,
    proof_signature: proofSignature,
    device_label: selectedCredential.device_label,
  }
}

export function removeIamLocalPasskey(input: {
  realm_id: string
  user_id?: string
  credential_id: string
}) {
  const nextRecords = getStorage().filter((record) => {
    if (record.realm_id !== input.realm_id) {
      return true
    }
    if (input.user_id && record.user_id !== input.user_id) {
      return true
    }
    return record.credential_id !== input.credential_id
  })
  saveStorage(nextRecords)
}

export function getIamLocalPasskeyDeviceLabels(input: {
  realm_id: string
  user_id?: string
}) {
  return listIamLocalPasskeys(input).map((record) => ({
    credential_id: record.credential_id,
    device_label: record.device_label,
    created_at: record.created_at,
  }))
}

export function decodeBase64Url(value: string) {
  return fromBase64Url(value)
}
