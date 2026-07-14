import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    // Call Supabase gfs-auth-verify function to verify code
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/gfs-auth-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { error: data.error || 'Invalid code' },
        { status: 401 }
      );
    }

    const data = await response.json();

    // Set auth cookie or return session token
    const res = NextResponse.json({ success: true, session: data.session });

    if (data.session) {
      res.cookies.set('auth_token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return res;
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}
