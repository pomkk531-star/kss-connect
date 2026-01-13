import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listAnnouncements, insertAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/db';

export const runtime = 'nodejs';

function isStaffSession(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const hasAdmin = /kss_admin=([^;]+)/.test(cookie);
  const hasTeacher = /kss_teacher=([^;]+)/.test(cookie);
  return hasAdmin || hasTeacher;
}

const AnnouncementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  imageUrl: z.string().optional(),
});

const UpdateSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high']),
  imageUrl: z.string().optional(),
});

const DeleteSchema = z.object({ id: z.number().int().positive() });

export async function GET() {
  const announcements = listAnnouncements();
  return NextResponse.json({ ok: true, announcements });
}

export async function POST(req: Request) {
  if (!isStaffSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบครูหรือแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = AnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { title, content, priority, imageUrl } = parsed.data;
    const result = await insertAnnouncement(title, content, priority, imageUrl || '');
    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isStaffSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบครูหรือแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { id, title, content, priority, imageUrl } = parsed.data;
    updateAnnouncement(id, title, content, priority, imageUrl || '');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isStaffSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบครูหรือแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { id } = parsed.data;
    deleteAnnouncement(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
