import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { fullName, dateOfBirth, email, tier, acceptTerms } = await req.json();

    // Validate input
    if (!fullName || !dateOfBirth || !email) {
      return NextResponse.json(
        { error: 'Full name, date of birth, and email are required' },
        { status: 400 }
      );
    }

    if (!acceptTerms) {
      return NextResponse.json(
        { error: 'You must agree to the Terms of Service' },
        { status: 400 }
      );
    }

    // Calculate age
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 13) {
      return NextResponse.json(
        { error: 'You must be at least 13 years old' },
        { status: 400 }
      );
    }

    // This used to call a Supabase function named "gfs-register" that never
    // existed in this project (confirmed via list_edge_functions 2026-07-23),
    // which is why every account-creation attempt errored, including the one
    // Apple's reviewer hit during the 2026-07-17 rejection. gfs-auth-email
    // already handles both login and register mode: in register mode it
    // stages the profile in gfs_pending_profiles, creates the auth user, and
    // emails the sign-in code. gfs-auth-verify (added 2026-07-23) confirms the
    // code and promotes the pending profile into a real gfs_members row.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/gfs-auth-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        mode: 'register',
        email,
        name: fullName,
        dob: dateOfBirth,
        tos: acceptTerms,
        tier: tier || 'free',
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.error || 'Failed to create account' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
