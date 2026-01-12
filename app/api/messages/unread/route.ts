import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { countUnreadMessages } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('kss_user')?.value || 0);
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }
    const count = countUnreadMessages(userId);
    return NextResponse.json({ ok: true, count });
  } catch (error: any) {
    console.error('[GET /api/messages/unread] error:', error);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
