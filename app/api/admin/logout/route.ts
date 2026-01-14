import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('kss_admin', '', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('kss_admin', '', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
