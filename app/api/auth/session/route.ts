import { NextRequest, NextResponse } from 'next/server';

// This was a permanent stub that always returned 401 regardless of cookies
// ("This is a stub - implement with your auth logic"), meaning no session
// could ever be recognized after login. Fixed 2026-07-23 to actually check
// the auth_token cookie set by /api/auth/verify-code against Supabase Auth.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const user = await res.json();
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }
}
