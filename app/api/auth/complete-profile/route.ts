import { NextRequest, NextResponse } from 'next/server';

// First-time Google/Apple sign-ins land here to collect the two things
// OAuth never gives us: date of birth (age-gate, same 13+ rule as email
// signup) and explicit ToS agreement. Only after this succeeds do we create
// the real gfs_members row - mirrors the promotion logic in gfs-auth-verify,
// just triggered from the profile form instead of the code-verify step.
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const { fullName, dateOfBirth, acceptTerms } = await req.json();
    if (!fullName || !dateOfBirth) {
      return NextResponse.json({ error: 'Full name and date of birth are required' }, { status: 400 });
    }
    if (!acceptTerms) {
      return NextResponse.json({ error: 'You must agree to the Terms of Service' }, { status: 400 });
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 13) {
      return NextResponse.json({ error: 'You must be at least 13 years old' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey!, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const user = await userRes.json();

    const existing = await fetch(`${supabaseUrl}/rest/v1/gfs_members?user_id=eq.${user.id}&select=id`, {
      headers: { apikey: svcKey!, Authorization: `Bearer ${svcKey}` },
    }).then((r) => r.json());
    if (existing?.length) {
      return NextResponse.json({ success: true });
    }

    await fetch(`${supabaseUrl}/rest/v1/gfs_members`, {
      method: 'POST',
      headers: { apikey: svcKey!, Authorization: `Bearer ${svcKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: user.id,
        tier: 'free',
        name: fullName.trim(),
        dob: dateOfBirth,
        tos_agreed_at: new Date().toISOString(),
        is_minor: age < 18,
        tier_source: 'stripe',
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[complete-profile]', err);
    return NextResponse.json({ error: 'Failed to save your profile' }, { status: 500 });
  }
}
