import { createSign } from 'crypto'

/**
 * Exchange a Google service account for a short-lived OAuth2 access token.
 * Requires GOOGLE_SERVICE_ACCOUNT_JSON env var containing the full service
 * account key JSON downloaded from Google Cloud Console. Same shared
 * lesaruss-analytics-reader service account used across the LESARUSS
 * ecosystem (see lesaruss-ai/lib/google-auth.ts) - the account must be
 * granted access to the requested resource on the resource's side (e.g.
 * GA4 property viewer).
 */
export async function getGoogleAccessToken(scope: string): Promise<string | null> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  try {
    const sa = JSON.parse(raw) as {
      client_email: string
      private_key: string
    }

    const now = Math.floor(Date.now() / 1000)
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope,
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      })
    ).toString('base64url')

    const signingInput = `${header}.${payload}`
    const sign = createSign('RSA-SHA256')
    sign.update(signingInput)
    const sig = sign.sign(sa.private_key, 'base64url')
    const jwt = `${signingInput}.${sig}`

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    const data = (await res.json()) as { access_token?: string }
    return data.access_token ?? null
  } catch {
    return null
  }
}
