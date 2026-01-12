import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findTeacher, createTeacher } from '@/lib/db';

export const runtime = 'nodejs';

const RegisterSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อผู้ใช้ 3 ตัวอักษร, รหัสผ่าน 6 ตัวอักษร)' },
        { status: 400 }
      );
    }

    const { username, password, fullName } = parsed.data;

    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    const existingTeacher = findTeacher(firstName, lastName);
    if (existingTeacher) {
      return NextResponse.json({ ok: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newTeacher = createTeacher(firstName, lastName, passwordHash);

    const response = NextResponse.json({ ok: true, teacherId: newTeacher.id });
    response.cookies.set('kss_teacher', String(newTeacher.id), {
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
