import { NextRequest, NextResponse } from 'next/server';

// Bridges a client-side Supabase OAuth session (Google/Apple, established
// via lib/socialAuth.ts) into the same auth_token httpOnly cookie the
// email+code flow uses (set in /api/auth/verify-code), so /api/auth/session
// recognizes OAuth sign-ins the same way. Also reports whether this is a
// first-time sign-in that still needs a gfs_members row (OAuth gives us an
// email and sometimes a name, but never a date of birth or ToS agreement,
// both required before we can create the member record).
export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json();
    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey!, Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const user = await userRes.json();

    const existing = await fetch(`${supabaseUrl}/rest/v1/gfs_members?user_id=eq.${user.id}&select=id`, {
      headers: { apikey: svcKey!, Authorization: `Bearer ${svcKey}` },
    }).then((r) => r.json());

    const res = NextResponse.json({ needsProfile: !existing?.length });
    res.cookies.set('auth_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error('[oauth-session]', err);
    return NextResponse.json({ error: 'Failed to establish session' }, { status: 500 });
  }
}
