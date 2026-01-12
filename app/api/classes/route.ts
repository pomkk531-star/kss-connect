import { NextResponse } from 'next/server';
import { listClasses } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const classes = listClasses();
    return NextResponse.json({ ok: true, classes });
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
