import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Call Supabase gfs-auth-email function to resend code
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/gfs-auth-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({ mode: 'register', email }),
    });

    if (!response.ok) {
      throw new Error('Failed to resend code');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend code error:', error);
    return NextResponse.json(
      { error: 'Failed to resend code' },
      { status: 500 }
    );
  }
}
