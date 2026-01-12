import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertEvent, listEvents, updateEvent, deleteEvent } from '@/lib/db';

export const runtime = 'nodejs';

function isStaffSession(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const hasAdmin = /kss_admin=([^;]+)/.test(cookie);
  const hasTeacher = /kss_teacher=([^;]+)/.test(cookie);
  return hasAdmin || hasTeacher;
}

const EventSchema = z.object({
  title: z.string().min(1, 'ต้องกรอกชื่อกิจกรรม'),
  description: z.string().optional().default(''),
  event_date: z.string().min(1, 'ต้องกรอกวันที่'),
});

const UpdateSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  event_date: z.string().min(1),
});

const DeleteSchema = z.object({ id: z.number().int().positive() });

export async function GET() {
  const events = listEvents();
  return NextResponse.json({ ok: true, events });
}

export async function POST(req: Request) {
  if (!isStaffSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบครูหรือแอดมินก่อน' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = EventSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }
    const { title, description, event_date } = parsed.data;
    const result = insertEvent(title, description ?? '', event_date);
    return NextResponse.json({ ok: true, id: result.id, createdAt: result.createdAt });
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

    const { id, title, description, event_date } = parsed.data;
    updateEvent(id, title, description ?? '', event_date);
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
    deleteEvent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
