import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findTeacher } from '@/lib/db';

export const runtime = 'nodejs';

const LoginSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'กรุณากรอกชื่อ-นามสกุลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    const { firstName, lastName, password } = parsed.data;

    const teacher = findTeacher(firstName, lastName);
    if (!teacher) {
      return NextResponse.json(
        { ok: false, message: 'ชื่อ-นามสกุลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, teacher.password_hash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, message: 'ชื่อ-นามสกุลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      teacherId: teacher.id,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
    });

    response.cookies.set('kss_teacher', String(teacher.id), {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
