import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listSchedules, insertSchedule, updateSchedule, deleteSchedule } from '@/lib/db';

export const runtime = 'nodejs';

function isAdminSession(req: Request) {
  const adminId = req.headers.get('cookie')?.match(/kss_admin=([^;]+)/)?.[1];
  return !!adminId;
}

const ScheduleSchema = z.object({
  type: z.enum(['exam', 'class']),
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const UpdateSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(['exam', 'class']),
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const DeleteSchema = z.object({ id: z.number().int().positive() });

export async function GET() {
  const schedules = await listSchedules();
  return NextResponse.json({ ok: true, schedules });
}

export async function POST(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { type, title, description, date } = parsed.data;
    const result = await insertSchedule(type, title, description, date);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { id, type, title, description, date } = parsed.data;
    updateSchedule(id, type, title, description, date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { id } = parsed.data;
    deleteSchedule(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
