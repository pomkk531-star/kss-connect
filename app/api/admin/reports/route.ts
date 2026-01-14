import { NextResponse } from 'next/server';
import { deleteReport, listReports } from '@/lib/db';

export const runtime = 'nodejs';

function isStaffSession(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const hasAdmin = /kss_admin=([^;]+)/.test(cookie);
  const hasTeacher = /kss_teacher=([^;]+)/.test(cookie);
  return hasAdmin || hasTeacher;
}

export async function GET(req: Request) {
  if (!isStaffSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบครูหรือแอดมินก่อน' }, { status: 401 });
  }

  try {
    const reports = await listReports();
    return NextResponse.json({ ok: true, reports });
  } catch (err) {
    console.error('[GET /api/admin/reports] error:', err);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isStaffSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบครูหรือแอดมินก่อน' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ ok: false, message: 'ต้องระบุ id รายงาน' }, { status: 400 });
  }

  try {
    await deleteReport(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/reports] error:', err);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
