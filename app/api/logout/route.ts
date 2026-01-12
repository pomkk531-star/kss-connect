import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('kss_user', '', { path: '/', httpOnly: false, maxAge: 0 });
  return res;
}
