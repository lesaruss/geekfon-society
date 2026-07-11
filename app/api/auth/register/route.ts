import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { fullName, dateOfBirth, email, tier } = await req.json();

    // Validate input
    if (!fullName || !dateOfBirth || !email) {
      return NextResponse.json(
        { error: 'Full name, date of birth, and email are required' },
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

    // Call Supabase gfs-register function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/gfs-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        fullName,
        dateOfBirth,
        email,
        tier: tier || 'free',
      }),
    });

    if (!response.ok) {
      const data = await response.json();
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
