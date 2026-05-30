import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importJWK } from 'https://esm.sh/jose@5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ──────────────────────────────────────────────────

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

// ── VAPID JWT using jose library ─────────────────────────────

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64Url: string,
  publicKeyBase64Url: string,
): Promise<string> {
  const publicKeyBytes = base64UrlToUint8Array(publicKeyBase64Url)
  const x = uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33))
  const y = uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65))

  const privateKey = await importJWK({
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyBase64Url,
    x,
    y,
  }, 'ES256')

  const jwt = await new SignJWT({})
    .setProtectedHeader({ typ: 'JWT', alg: 'ES256' })
    .setAudience(audience)
    .setSubject(subject)
    .setExpirationTime('12h')
    .sign(privateKey)

  return jwt
}

// ── Content encryption (aes128gcm) ───────────────────────────

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

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { invitation_id } = await req.json()
    if (!invitation_id) {
      return new Response(JSON.stringify({ error: 'invitation_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: details } = await supabaseAdmin
      .rpc('get_invitation_details', { p_invitation_id: invitation_id })

    if (!details || details.length === 0) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const detail = details[0]
    const inviterName = detail.inviter_display_name || detail.inviter_email

    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', detail.invited_user_id)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'No push subscription' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Public key is safe to embed; private key is read from the VAPID_PRIVATE_KEY
    // function secret. Set it via `supabase secrets set --env-file` — the bare
    // `secrets set KEY=value` form corrupts the "--" inside the base64url value.
    const vapidPublicKey = 'BJmFgiUBsKet7iAxDnPfw0ulaPDMVU_FhWqf5Urv99zlX1tdwNseolBKDonR-0C9voQtQX-E56XYacqhr3F1_YE'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    const vapidSubject = 'mailto:alberto.schianni.dev@gmail.com'

    const notificationPayload = JSON.stringify({
      title: 'Invito al gruppo',
      body: `${inviterName} ti ha invitato a "${detail.wallet_name}"`,
      data: {
        type: 'wallet_invitation',
        invitation_id,
      },
    })

    let pushSent = 0
    const errors: string[] = []

    for (const sub of subscriptions) {
      try {
        const endpoint = sub.endpoint
        const audience = new URL(endpoint).origin

        const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey)

        const ciphertext = await encryptPayload(sub.p256dh, sub.auth, notificationPayload)

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Content-Length': ciphertext.length.toString(),
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
            TTL: '86400',
            Urgency: 'high',
          },
          body: ciphertext,
        })

        if (response.status === 201 || response.status === 200) {
          pushSent++
        } else if (response.status === 404 || response.status === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          errors.push(`sub ${sub.id}: expired (${response.status})`)
        } else {
          const body = await response.text()
          errors.push(`sub ${sub.id}: ${response.status} ${body}`)
        }
      } catch (pushErr: any) {
        errors.push(`sub ${sub.id}: exception: ${pushErr?.message || pushErr}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, pushed: pushSent > 0, sent: pushSent, total: subscriptions.length, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
