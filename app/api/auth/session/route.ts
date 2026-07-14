import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // This is a stub - implement with your auth logic
  // Check if user has valid session and return user info
  // For now, return 401 to indicate no session
  return NextResponse.json({ error: 'No session' }, { status: 401 });
}
