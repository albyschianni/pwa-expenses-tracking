// Shared Web Push utility for Supabase Edge Functions
// Used by: send-push (wallet invitations), banking-sync (new transactions)

import { SignJWT, importJWK } from 'https://esm.sh/jose@5'

// VAPID keys (same across all functions).
// The public key is safe to embed (it ships to every browser anyway).
// The private key MUST stay secret — it is read from the function secret
// VAPID_PRIVATE_KEY. Set it with `supabase secrets set --env-file` (NOT the
// bare `secrets set KEY=value` form, which parses the `--` inside the
// base64url value as a flag separator and corrupts the key).
const VAPID_PUBLIC_KEY = 'BJmFgiUBsKet7iAxDnPfw0ulaPDMVU_FhWqf5Urv99zlX1tdwNseolBKDonR-0C9voQtQX-E56XYacqhr3F1_YE'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = 'mailto:alberto.schianni.dev@gmail.com'

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

async function hkdfExtractAndExpand(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  )
  return new Uint8Array(derived)
}

async function createVapidJwt(audience: string): Promise<string> {
  const publicKeyBytes = base64UrlToUint8Array(VAPID_PUBLIC_KEY)
  const x = uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33))
  const y = uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65))

  const privateKey = await importJWK({
    kty: 'EC',
    crv: 'P-256',
    d: VAPID_PRIVATE_KEY,
    x,
    y,
  }, 'ES256')

  return await new SignJWT({})
    .setProtectedHeader({ typ: 'JWT', alg: 'ES256' })
    .setAudience(audience)
    .setSubject(VAPID_SUBJECT)
    .setExpirationTime('12h')
    .sign(privateKey)
}

async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const clientPublicKey = base64UrlToUint8Array(clientPublicKeyB64)
  const clientAuth = base64UrlToUint8Array(clientAuthB64)
  const plaintext = enc.encode(payload)

  const salt = crypto.getRandomValues(new Uint8Array(16))

  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey),
  )

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      serverKeys.privateKey,
      256,
    ),
  )

  const authInfo = concatArrays(enc.encode('WebPush: info\0'), clientPublicKey, serverPublicKeyRaw)
  const ikm = await hkdfExtractAndExpand(clientAuth, sharedSecret, authInfo, 32)

  const cekInfo = enc.encode('Content-Encoding: aes128gcm\0')
  const contentKey = await hkdfExtractAndExpand(salt, ikm, cekInfo, 16)

  const nonceInfo = enc.encode('Content-Encoding: nonce\0')
  const nonce = await hkdfExtractAndExpand(salt, ikm, nonceInfo, 12)

  const aesKey = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt'])

  const paddedPlaintext = new Uint8Array(plaintext.length + 1)
  paddedPlaintext.set(plaintext)
  paddedPlaintext[plaintext.length] = 2

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext),
  )

  const recordSize = new ArrayBuffer(4)
  new DataView(recordSize).setUint32(0, paddedPlaintext.length + 16)
  const header = concatArrays(
    salt,
    new Uint8Array(recordSize),
    new Uint8Array([serverPublicKeyRaw.length]),
    serverPublicKeyRaw,
  )

  return concatArrays(header, encrypted)
}

/**
 * Send a push notification to a user
 * @param supabase - Supabase admin client (service_role)
 * @param userId - Target user ID
 * @param notification - { title, body, data? }
 * @returns { sent: number, errors: string[] }
 */
export async function sendPushToUser(
  supabase: any,
  userId: string,
  notification: { title: string; body: string; data?: Record<string, any> },
): Promise<{ sent: number; errors: string[] }> {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, errors: [] }
  }

  const payload = JSON.stringify(notification)
  let sent = 0
  const errors: string[] = []

  for (const sub of subscriptions) {
    try {
      const audience = new URL(sub.endpoint).origin
      const jwt = await createVapidJwt(audience)
      const ciphertext = await encryptPayload(sub.p256dh, sub.auth, payload)

      const response = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          'Content-Length': ciphertext.length.toString(),
          Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
          TTL: '86400',
          Urgency: 'high',
        },
        body: ciphertext,
      })

      if (response.status === 201 || response.status === 200) {
        sent++
      } else if (response.status === 404 || response.status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        const body = await response.text()
        errors.push(`sub ${sub.id}: ${response.status} ${body}`)
      }
    } catch (pushErr: any) {
      errors.push(`sub ${sub.id}: ${pushErr?.message || pushErr}`)
    }
  }

  return { sent, errors }
}
