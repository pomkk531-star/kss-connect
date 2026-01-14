import { NextResponse } from 'next/server';
import { deleteAdminMessage, listAllMessagesDetailed } from '@/lib/db';

export const runtime = 'nodejs';

function isAdminSession(req: Request) {
  const adminId = req.headers.get('cookie')?.match(/kss_admin=([^;]+)/)?.[1];
  return !!adminId;
}

export async function GET(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const messages = listAllMessagesDetailed();
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    console.error('[GET /api/admin/messages] error:', err);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ ok: false, message: 'ต้องระบุ id ข้อความ' }, { status: 400 });
  }

  try {
    const result = deleteMessageById(id);
    if (result.changes === 0) {
      return NextResponse.json({ ok: false, message: 'ไม่พบบันทึกที่จะลบ' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/messages] error:', err);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
