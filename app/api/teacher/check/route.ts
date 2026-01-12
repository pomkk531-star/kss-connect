import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const teacherId = cookieStore.get('kss_teacher')?.value;

  if (!teacherId) {
    return NextResponse.json({ loggedIn: false }, { status: 401 });
  }

  return NextResponse.json({ loggedIn: true, teacherId: Number(teacherId) });
}
