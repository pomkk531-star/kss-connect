import { NextRequest, NextResponse } from 'next/server';
import { listAllUsers } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classCode = searchParams.get('class_code');
    if (!classCode) {
      return NextResponse.json({ ok: false, message: 'ต้องระบุ class_code' }, { status: 400 });
    }
    const users = listUsersByClassCode(classCode);
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
