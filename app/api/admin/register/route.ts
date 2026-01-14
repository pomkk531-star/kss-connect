import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findAdmin, createAdmin } from '@/lib/db';

export const runtime = 'nodejs';

const RegisterSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  adminKey: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'ชื่อผู้ใช้ต้องมี 3 ตัวอักษร รหัสผ่านต้องมี 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const { username, password, adminKey } = parsed.data;

    const validAdminKey = process.env.ADMIN_KEY || 'kss-admin';
    if (adminKey !== validAdminKey) {
      return NextResponse.json({ ok: false, message: 'กุญแจแอดมินไม่ถูกต้อง' }, { status: 403 });
    }

    const existingAdmin = await findAdmin(username);
    if (existingAdmin) {
      return NextResponse.json({ ok: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = await createAdmin(username, passwordHash, null, null, null);

    const response = NextResponse.json({ ok: true, adminId: newAdmin.id });
    response.cookies.set('kss_admin', String(newAdmin.id), {
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
